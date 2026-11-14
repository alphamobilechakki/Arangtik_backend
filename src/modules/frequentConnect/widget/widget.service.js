const Cluster = require('../cluster/cluster.model');
const ClusterMember = require('../member/member.model');
const Conversation = require('../conversation/conversation.model');
const Message = require('../message/message.model');
const clusterService = require('../cluster/cluster.service');

class WidgetService {
  /**
   * Get fast, lightweight cluster data optimized for mobile home widgets
   */
  async getWidgetClusters(userId) {
    const clusters = await clusterService.getUserClusters(userId);

    // Collect all cluster IDs to calculate unread counts in one aggregation
    const clusterIds = clusters.map((c) => c._id);

    // Map conversation IDs for each cluster
    const clusterConversations = await Conversation.find({
      type: 'CLUSTER',
      clusterId: { $in: clusterIds },
    })
      .select('_id clusterId')
      .lean();

    const convIdToClusterId = new Map();
    const convIds = clusterConversations.map((c) => {
      convIdToClusterId.set(c._id.toString(), c.clusterId.toString());
      return c._id;
    });

    // Count unread messages for user in these conversations:
    // recipientStatuses where userId matches and status != 'SEEN' and isAutoDeleted != true
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: convIds },
          recipientStatuses: {
            $elemMatch: {
              userId: userId,
              status: { $in: ['SENT', 'DELIVERED'] },
              isAutoDeleted: false,
            },
          },
        },
      },
      {
        $group: {
          _id: '$conversationId',
          unreadCount: { $sum: 1 },
        },
      },
    ]);

    const clusterUnreadCounts = new Map();
    unreadAgg.forEach((item) => {
      const clusterId = convIdToClusterId.get(item._id.toString());
      if (clusterId) {
        clusterUnreadCounts.set(clusterId, item.unreadCount);
      }
    });

    const widgetClusters = clusters.map((c) => ({
      id: c._id,
      name: c.name,
      icon: c.icon || '👥',
      color: c.color || '#6C63FF',
      type: c.type,
      priority: c.priority,
      memberCount: c.memberCount || 0,
      unreadCount: clusterUnreadCounts.get(c._id.toString()) || 0,
      conversationId: c.conversationId || null,
    }));

    return {
      clusters: widgetClusters,
      totalClusters: widgetClusters.length,
      timestamp: new Date(),
    };
  }

  /**
   * Get recent conversations with unread badges for quick-action widget
   */
  async getWidgetRecentConversations(userId, limit = 5) {
    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ updatedAt: -1 })
      .limit(Math.min(20, Math.max(1, parseInt(limit, 10) || 5)))
      .populate('participants', 'name phone profileImage')
      .populate('clusterId', 'name icon color')
      .populate('lastMessage.senderId', 'name')
      .lean();

    const convIds = conversations.map((c) => c._id);

    // Calculate unread counts per conversation
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: convIds },
          recipientStatuses: {
            $elemMatch: {
              userId: userId,
              status: { $in: ['SENT', 'DELIVERED'] },
              isAutoDeleted: false,
            },
          },
        },
      },
      {
        $group: {
          _id: '$conversationId',
          unreadCount: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = new Map();
    unreadAgg.forEach((item) => {
      unreadMap.set(item._id.toString(), item.unreadCount);
    });

    const recent = conversations.map((c) => {
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
        unreadCount: unreadMap.get(c._id.toString()) || 0,
      };
    });

    return {
      recent,
      timestamp: new Date(),
    };
  }
}

module.exports = new WidgetService();
