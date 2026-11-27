const path = require('path');
const fs = require('fs');
const Message = require('../modules/frequentConnect/message/message.model');
const Conversation = require('../modules/frequentConnect/conversation/conversation.model');

const AUTO_DELETE_MINUTES = 15;
let cronInterval = null;

/**
 * Execute auto-delete cycle (conversation-level):
 * 1. Find conversations with autoDelete: true (by default autoDelete is false / chats are saved)
 * 2. In those conversations, find messages where all recipients have seenAt + 15 min <= now
 * 3. Delete physical voice file from disk (if any) and delete the message document
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

      await Message.deleteOne({ _id: msg._id });
      messagesDeletedCount++;
    }

    if (messagesDeletedCount > 0) {
      console.log(
        `[Message Auto-Delete]: Deleted ${messagesDeletedCount} messages from auto-delete conversations.`
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
