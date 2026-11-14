const Message = require('../message/message.model');
const Conversation = require('../conversation/conversation.model');
const SavedMessage = require('../savedMessage/savedMessage.model');
const Cluster = require('../cluster/cluster.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');

class SearchService {
  /**
   * Search messages by text query across all conversations user belongs to
   * Also searches user's saved/bookmarked messages even if auto-deleted from conversation
   */
  async searchMessages(userId, query = {}) {
    const { q, limit = 20, page = 1, conversationId } = query;

    if (!q || typeof q !== 'string' || !q.trim()) {
      throw new ApiError(400, 'Search query (q) is required');
    }

    const searchTerm = q.trim();
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    // 1. Get all conversation IDs the user participates in
    let targetConvIds = [];
    if (conversationId) {
      // Verify user has access to this conversation
      const conv = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      }).select('_id');
      if (!conv) {
        throw new ApiError(403, 'You do not have access to search this conversation');
      }
      targetConvIds = [conv._id];
    } else {
      const userConvs = await Conversation.find({ participants: userId })
        .select('_id')
        .lean();
      targetConvIds = userConvs.map((c) => c._id);
    }

    if (targetConvIds.length === 0) {
      return {
        results: [],
        pagination: { total: 0, page: parsedPage, limit: parsedLimit, pages: 0 },
      };
    }

    // 2. Query active/non-deleted messages matching regex or text
    const messageFilter = {
      conversationId: { $in: targetConvIds },
      content: { $regex: searchTerm, $options: 'i' },
      // Exclude messages that have been auto-deleted for THIS user (unless saved)
      $or: [
        { senderId: userId },
        {
              recipientStatuses: {
                $elemMatch: {
                  userId: userId,
                  $or: [{ isAutoDeleted: false }, { isSaved: true }],
                },
        },
        },
      ],
  };

  const[messages, total] = await Promise.all([
    Message.find(messageFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate('senderId', 'name phone profileImage')
      .populate({
        path: 'conversationId',
        select: 'type clusterId participants',
        populate: { path: 'clusterId', select: 'name icon color' },
      })
      .lean(),
    Message.countDocuments(messageFilter),
  ]);

const formattedResults = messages.map((m) => {
  const isSender = (m.senderId?._id || m.senderId).toString() === userId.toString();
  const conv = m.conversationId;
  let conversationTitle = 'Direct Conversation';

  if (conv?.type === 'CLUSTER' && conv.clusterId) {
    conversationTitle = conv.clusterId.name;
  }

  return {
    messageId: m._id,
    conversationId: conv?._id,
    conversationType: conv?.type,
    conversationTitle,
    content: m.content,
    type: m.type,
    sender: m.senderId,
    isSender,
    createdAt: m.createdAt,
  };
});

return {
  results: formattedResults,
  pagination: {
    total,
    page: parsedPage,
    limit: parsedLimit,
    pages: Math.ceil(total / parsedLimit) || 1,
  },
};
  }

  /**
   * Search conversations & contacts by name or phone
   */
  async searchConversations(userId, query = {}) {
  const { q, limit = 20 } = query;

  if (!q || typeof q !== 'string' || !q.trim()) {
    throw new ApiError(400, 'Search query (q) is required');
  }

  const searchTerm = q.trim();
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  // Find conversations user is part of
  const conversations = await Conversation.find({ participants: userId })
    .populate('participants', 'name phone profileImage')
    .populate('clusterId', 'name icon color type memberCount')
    .populate('lastMessage.senderId', 'name')
    .sort({ updatedAt: -1 })
    .lean();

  const regex = new RegExp(searchTerm, 'i');

  const matched = conversations.filter((c) => {
    if (c.type === 'CLUSTER' && c.clusterId) {
      return regex.test(c.clusterId.name);
    }
    // Direct conversation: search other participant's name/phone
    const partner = c.participants?.find(
      (p) => (p._id || p).toString() !== userId.toString()
    );
    if (!partner) return false;
    return regex.test(partner.name || '') || regex.test(partner.phone || '');
  });

  const results = matched.slice(0, parsedLimit).map((c) => {
    const isCluster = c.type === 'CLUSTER';
    let title = '';
    let icon = '';
    let avatar = '';

    if (isCluster && c.clusterId) {
      title = c.clusterId.name;
      icon = c.clusterId.icon;
    } else {
      const partner = c.participants.find(
        (p) => (p._id || p).toString() !== userId.toString()
      );
      title = partner?.name || partner?.phone || 'Contact';
      avatar = partner?.profileImage || '';
    }

    return {
      id: c._id,
      type: c.type,
      title,
      icon,
      avatar,
      lastMessage: c.lastMessage?.content || (c.lastMessage?.type ? `[${c.lastMessage.type}]` : ''),
      lastMessageTime: c.lastMessage?.sentAt || c.updatedAt,
    };
  });

  return {
    results,
    count: results.length,
  };
}
}

module.exports = new SearchService();
