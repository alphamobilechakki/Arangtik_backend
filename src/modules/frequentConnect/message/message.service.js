const Message = require('./message.model');
const Conversation = require('../conversation/conversation.model');
const conversationService = require('../conversation/conversation.service');
const { sanitizeMessageContent } = require('./message.validation');
const ApiError = require('../../../utils/apiError');

class MessageService {
  /**
   * Send a text message inside a conversation
   */
  async sendMessage(conversationId, senderId, data) {
    const conversation = await conversationService.getConversationById(conversationId, senderId);

    const { content, type = 'TEXT', voiceUrl = '', voiceDuration = 0 } = data;
    const sanitizedContent = sanitizeMessageContent(content);

    // Build recipient statuses for all participants except sender
    const recipientStatuses = conversation.participants
      .filter((p) => (p._id || p).toString() !== senderId.toString())
      .map((p) => ({
        userId: p._id || p,
        status: 'SENT',
        statusAt: new Date(),
        seenAt: null,
        playedAt: null,
        isAutoDeleted: false,
        isSaved: false,
      }));

    const message = await Message.create({
      conversationId,
      senderId,
      type: (type || 'TEXT').toUpperCase(),
      content: sanitizedContent,
      voiceUrl: voiceUrl ? voiceUrl.trim() : '',
      voiceDuration: Number(voiceDuration) || 0,
      status: 'SENT',
      recipientStatuses,
    });

    // Update conversation's lastMessage
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        messageId: message._id,
        content: message.type === 'TEXT' ? message.content : `[${message.type}]`,
        senderId,
        type: message.type,
        sentAt: message.createdAt,
      },
      updatedAt: new Date(),
    });

    // Populate sender info for the response
    const populated = await Message.findById(message._id)
      .populate('senderId', 'name phone profileImage')
      .lean();

    // Trigger Socket.IO real-time delivery and offline FCM fallback
    try {
      const { getIO } = require('../../../config/socket.config');
      const { isUserOnline } = require('../frequentConnect.socket');
      const notificationService = require('../../notification/notification.service');
      const io = getIO();
      const fcNamespace = io.of('/fc');

      // Emit to real-time conversation room
      fcNamespace.to(`conversation:${conversationId}`).emit('new-message', populated);

      // Offline FCM push notifications
      for (const participant of conversation.participants) {
        const participantId = (participant._id || participant).toString();
        if (participantId === senderId.toString()) continue;

        if (!isUserOnline(participantId)) {
          const senderName = populated.senderId?.name || 'Frequent Connect';
          const clusterName = conversation.clusterId?.name;
          const title = clusterName ? `${senderName} in ${clusterName}` : senderName;
          const body = message.type === 'TEXT' ? message.content : `Sent a ${message.type.toLowerCase()} message`;

          notificationService.sendToUser(participantId, {
            title,
            body,
            type: message.type === 'VOICE' ? 'FC_VOICE_MESSAGE' : 'FC_NEW_MESSAGE',
            data: {
              conversationId: conversationId.toString(),
              messageId: message._id.toString(),
              senderId: senderId.toString(),
              type: message.type,
            },
          }).catch((err) => console.warn('[FC FCM Push Error]:', err.message));
        }
      }
    } catch (socketErr) {
      // Non-fatal if socket is not initialized in tests or CLI
    }

    return populated;
  }

  /**
   * Fetch paginated messages for a conversation
   */
  async getMessages(conversationId, userId, query = {}) {
    await conversationService.getConversationById(conversationId, userId);

    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
    const filter = { conversationId };

    if (query.before) {
      filter.createdAt = { $lt: new Date(query.before) };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'name phone profileImage')
      .lean();

    // Map messages respecting recipient auto-deletion for the viewing user
    const processedMessages = messages.map((msg) => {
      const isSender = (msg.senderId?._id || msg.senderId).toString() === userId.toString();
      const userStatus = msg.recipientStatuses?.find(
        (rs) => rs.userId?.toString() === userId.toString()
      );

      const hasAutoDeleted = !isSender && userStatus?.isAutoDeleted && !userStatus?.isSaved;

      if (hasAutoDeleted || msg.isAutoDeleted) {
        return {
          ...msg,
          content: 'This message was deleted',
          voiceUrl: '',
          isDeletedPlaceholder: true,
        };
      }

      return msg;
    });

    return {
      messages: processedMessages.reverse(),
      hasMore: messages.length === limit,
    };
  }

  /**
   * Update message status (e.g. DELIVERED, SEEN, PLAYED)
   */
  async updateMessageStatus(messageId, userId, newStatus) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    const statusUpper = newStatus.toUpperCase();

    // Recipient specific status update
    const recipientEntry = message.recipientStatuses.find(
      (rs) => rs.userId.toString() === userId.toString()
    );

    if (!recipientEntry) {
      throw new ApiError(403, 'User is not a recipient of this message');
    }

    const now = new Date();
    recipientEntry.status = statusUpper;
    recipientEntry.statusAt = now;

    if (statusUpper === 'SEEN' && !recipientEntry.seenAt) {
      recipientEntry.seenAt = now;
      // Calculate auto-delete time for this specific recipient: seenAt + 15 mins
      const deleteAt = new Date(now.getTime() + 15 * 60 * 1000);
      if (!message.autoDeleteAt || deleteAt < message.autoDeleteAt) {
        message.autoDeleteAt = deleteAt;
      }
    }

    if (statusUpper === 'PLAYED') {
      recipientEntry.playedAt = now;
      if (!recipientEntry.seenAt) {
        recipientEntry.seenAt = now;
      }
    }

    // Determine overall message status (lowest common denominator or highest reached)
    const allStatuses = message.recipientStatuses.map((rs) => rs.status);
    if (allStatuses.every((s) => s === 'PLAYED')) {
      message.status = 'PLAYED';
    } else if (allStatuses.some((s) => s === 'SEEN' || s === 'PLAYED')) {
      message.status = 'SEEN';
    } else if (allStatuses.some((s) => s === 'DELIVERED')) {
      message.status = 'DELIVERED';
    }

    await message.save();

    return {
      messageId: message._id,
      status: message.status,
      recipientStatuses: message.recipientStatuses,
    };
  }
}

module.exports = new MessageService();
