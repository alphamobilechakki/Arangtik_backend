const Conversation = require('../../../frequentConnect/conversation/conversation.model');
const Message = require('../../../frequentConnect/message/message.model');
const ApiError = require('../../../../utils/apiError');

class AdminFCConversationService {
  /**
   * List conversations with participant metadata & filtering
   */
  async getConversations(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (query.type) {
      filter.type = query.type.toUpperCase();
    }

    if (query.clusterId) {
      filter.clusterId = query.clusterId;
    }

    if (query.participants) {
      const parts = String(query.participants).split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        filter.participants = { $all: parts };
      }
    } else if (query.userId) {
      filter.participants = query.userId;
    }

    if (query.startDate || query.endDate) {
      filter.updatedAt = {};
      if (query.startDate) filter.updatedAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.updatedAt.$lte = new Date(query.endDate);
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('participants', 'name phone profileImage status')
        .populate('clusterId', 'name icon color type memberCount')
        .populate('lastMessage.senderId', 'name phone')
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    return {
      conversations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * List messages in a specific conversation for auditing
   */
  async getConversationMessages(conversationId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const filter = { conversationId };

    if (query.type) {
      filter.type = query.type.toUpperCase();
    }

    if (query.status) {
      filter.status = query.status.toUpperCase();
    }

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name phone profileImage')
        .populate('recipientStatuses.userId', 'name phone')
        .lean(),
      Message.countDocuments(filter),
    ]);

    return {
      messages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Cross-conversation message logs with filtering
   */
  async getAllMessageLogs(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const filter = {};

    if (query.type) {
      filter.type = query.type.toUpperCase();
    }

    if (query.status) {
      filter.status = query.status.toUpperCase();
    }

    if (query.senderId) {
      filter.senderId = query.senderId;
    }

    if (query.conversationId) {
      filter.conversationId = query.conversationId;
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name phone profileImage')
                .populate('recipientStatuses.userId', 'name phone profileImage')
        .populate({
          path: 'conversationId',
          select: 'type clusterId',
          populate: { path: 'clusterId', select: 'name icon' },
        })
        .lean(),
      Message.countDocuments(filter),
    ]);

    return {
      messages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

module.exports = new AdminFCConversationService();
