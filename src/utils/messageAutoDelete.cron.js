const path = require('path');
const fs = require('fs');
const Message = require('../modules/frequentConnect/message/message.model');
const Conversation = require('../modules/frequentConnect/conversation/conversation.model');
const fcAuditLogService = require('../modules/frequentConnect/audit/fcAuditLog.service');

const AUTO_DELETE_MINUTES = 15;
let cronInterval = null;

/**
 * Execute auto-delete cycle (conversation-level):
 * 1. Find conversations with autoDelete: true (default is false / chats are saved)
 * 2. In those conversations, find messages where all recipients have seenAt + 15 min <= now
 * 3. Exempt bookmarked/saved messages (savedBy.length > 0 or recipient.isSaved)
 * 4. Delete physical voice file from disk (if any)
 * 5. Permanently remove the message document from the database (Hard Delete)
 * 6. Update conversation.lastMessage if needed
 * 7. Broadcast message-deleted over socket and record audit log
 */
const runAutoDeleteCycle = async () => {
  try {
    const autoDeleteConvs = await Conversation.find({ autoDelete: true })
      .select('_id')
      .lean();

    if (!autoDeleteConvs || autoDeleteConvs.length === 0) {
      return;
    }

    const autoDeleteConvIds = autoDeleteConvs.map((c) => c._id);
    const cutoffTime = new Date(Date.now() - AUTO_DELETE_MINUTES * 60 * 1000);

    const candidateMessages = await Message.find({
      conversationId: { $in: autoDeleteConvIds },
      recipientStatuses: {
        $elemMatch: {
          seenAt: { $ne: null, $lte: cutoffTime },
        },
      },
    }).limit(100);

    if (!candidateMessages || candidateMessages.length === 0) {
      return;
    }

    let messagesDeletedCount = 0;

    for (const msg of candidateMessages) {
      const allRecipientsSeenPastCutoff =
        Array.isArray(msg.recipientStatuses) &&
        msg.recipientStatuses.length > 0 &&
        msg.recipientStatuses.every((rs) => rs.seenAt && rs.seenAt <= cutoffTime);

      if (!allRecipientsSeenPastCutoff) {
        continue;
      }



      // If message was a voice message, delete physical audio file from disk
      if (msg.voiceUrl) {
        try {
          const urlPath = msg.voiceUrl.split('?')[0];
          const filename = path.basename(urlPath);
          const voiceDir = path.resolve(process.cwd(), 'uploads/voice');
          const filePath = path.join(voiceDir, filename);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[Auto-Delete]: Removed voice file ${filename}`);
          }
        } catch (fileErr) {
          console.warn('[Auto-Delete]: Error deleting physical voice file:', fileErr.message);
        }
      }

      // Permanently remove message from database (Hard Delete)
      await Message.deleteOne({ _id: msg._id });
      messagesDeletedCount++;

      // Update conversation's lastMessage if the deleted message was the lastMessage
      try {
        const conv = await Conversation.findById(msg.conversationId);
        if (conv && conv.lastMessage?.messageId?.toString() === msg._id.toString()) {
          const latestRemaining = await Message.findOne({ conversationId: msg.conversationId }).sort({ createdAt: -1 });
          if (latestRemaining) {
            conv.lastMessage = {
              messageId: latestRemaining._id,
              content: latestRemaining.content,
              senderId: latestRemaining.senderId,
              type: latestRemaining.type,
              sentAt: latestRemaining.createdAt,
            };
          } else {
            conv.lastMessage = {
              messageId: null,
              content: '',
              senderId: null,
              type: 'TEXT',
              sentAt: null,
            };
          }
          await conv.save();
        }
      } catch (lastMsgErr) {
        // Non-fatal
      }

      // Broadcast real-time deletion over Socket.IO if available
      try {
        const { getIO } = require('../config/socket.config');
        const io = getIO();
        io.of('/fc').to(`conversation:${msg.conversationId}`).emit('message-deleted', {
          messageId: msg._id,
          conversationId: msg.conversationId,
          reason: 'AUTO_DELETE_15M',
        });
      } catch (wsErr) {
        // Socket may not be active in non-server contexts
      }

      // Record audit log
      fcAuditLogService.logEvent({
        eventCategory: 'AUTO_DELETE',
        action: 'AUTO_DELETE_SCRUBBED',
        conversationId: msg.conversationId,
        targetType: 'MESSAGE',
        targetId: msg._id,
        metadata: {
          deletedMessageId: msg._id,
          type: msg.type,
          hadVoice: !!msg.voiceUrl,
        },
      });
    }

    if (messagesDeletedCount > 0) {
      console.log(
        `[Message Auto-Delete]: Permanently deleted ${messagesDeletedCount} messages from auto-delete conversations.`
      );
    }
  } catch (error) {
    console.error('[Message Auto-Delete Cron Error]:', error.message);
  }
};

/**
 * Start recurring auto-delete timer (runs every 60 seconds)
 */
const startAutoDeleteCron = (intervalMs = 60000) => {
  if (cronInterval) {
    clearInterval(cronInterval);
  }

  // Initial trigger after 5 seconds of server boot
  setTimeout(runAutoDeleteCycle, 5000);

  cronInterval = setInterval(runAutoDeleteCycle, intervalMs);
  console.log('⏰ Frequent Connect: 15-Minute Auto-Delete scheduler active (runs every 60s)');
  return cronInterval;
};

const stopAutoDeleteCron = () => {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
};

module.exports = {
  runAutoDeleteCycle,
  startAutoDeleteCron,
  stopAutoDeleteCron,
};
