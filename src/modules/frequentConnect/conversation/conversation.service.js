const Conversation = require('./conversation.model');
const Cluster = require('../cluster/cluster.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');

class ConversationService {
  /**
   * Get or create a direct 1:1 conversation between two users
   */
  async getOrCreateDirectConversation(userId, targetUserId) {
    if (userId.toString() === targetUserId.toString()) {
      throw new ApiError(400, 'Cannot create a direct conversation with yourself');
    }

    const targetUser = await User.findById(targetUserId).select('_id name phone status').lean();
    if (!targetUser) {
      throw new ApiError(404, 'Recipient user not found');
    }

    let conversation = await Conversation.findOne({
      type: 'DIRECT',
      participants: { $all: [userId, targetUserId], $size: 2 },
    }).populate('participants', 'name phone profileImage status');

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'DIRECT',
        participants: [userId, targetUserId],
      });
      conversation = await conversation.populate('participants', 'name phone profileImage status');
    }

    return conversation;
  }

  /**
   * Ensure a cluster has an associated conversation
   */
  async getOrCreateClusterConversation(clusterId, participantIds = []) {
    let conversation = await Conversation.findOne({
      type: 'CLUSTER',
      clusterId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'CLUSTER',
        clusterId,
        participants: participantIds,
      });

      await Cluster.findByIdAndUpdate(clusterId, { conversationId: conversation._id });
    } else if (participantIds.length > 0) {
      conversation.participants = participantIds;
      await conversation.save();
    }

    return conversation;
  }

  /**
   * Fetch all conversations for a user with preview of last message & partner info
   */
  async getUserConversations(userId) {
    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'name phone profileImage status')
      .populate('clusterId', 'name icon color priority type memberCount')
      .populate('lastMessage.senderId', 'name phone')
      .sort({ updatedAt: -1 })
      .lean();

    return conversations;
  }

  /**
   * Get conversation details by ID with access check
   */
  async getConversationById(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name phone profileImage status')
      .populate('clusterId', 'name icon color priority type memberCount')
      .populate('lastMessage.senderId', 'name phone')
      .lean();

    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => (p._id || p).toString() === userId.toString()
    );

    if (!isParticipant) {
      throw new ApiError(403, 'You are not a participant in this conversation');
    }

    return conversation;
  }

  /**
   * Synchronize cluster participants with its cluster conversation
   */
  async syncClusterParticipants(clusterId) {
    const ClusterMember = require('../member/member.model');
    const members = await ClusterMember.find({
      clusterId,
      status: 'ACTIVE',
      userId: { $ne: null },
    })
      .select('userId')
      .lean();

    const participantIds = members.map((m) => m.userId);

    let conversation = await Conversation.findOne({ type: 'CLUSTER', clusterId });
    if (conversation) {
      conversation.participants = participantIds;
      await conversation.save();
    } else {
      conversation = await this.getOrCreateClusterConversation(clusterId, participantIds);
    }

    return conversation;
  }
}

module.exports = new ConversationService();
