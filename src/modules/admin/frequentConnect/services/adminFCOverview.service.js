const Cluster = require('../../../frequentConnect/cluster/cluster.model');
const Conversation = require('../../../frequentConnect/conversation/conversation.model');
const Message = require('../../../frequentConnect/message/message.model');
const WalkieTalkieSession = require('../../../frequentConnect/walkieTalkie/walkieTalkie.model');
const FCAuditLog = require('../../../frequentConnect/audit/fcAuditLog.model');
const walkieTalkieService = require('../../../frequentConnect/walkieTalkie/walkieTalkie.service');

class AdminFCOverviewService {
  /**
   * Aggregate real MongoDB metrics and live Socket runtime indicators
   */
  async getOverviewMetrics() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Parallel collection counts & aggregates directly from consolidated models
    const [
      totalClusters,
      clustersByTypeAgg,
      membersByStatusAgg,
      totalMessages,
      messagesByTypeAgg,
      totalAutoDeletedMessages,
      totalConversations,
      activeConversations24h,
      totalWalkieSessions,
      walkieSessionsByStatusAgg,
    ] = await Promise.all([
      Cluster.countDocuments(),
      Cluster.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Cluster.aggregate([
        { $unwind: '$members' },
        { $group: { _id: '$members.status', count: { $sum: 1 } } },
      ]),
      Message.countDocuments(),
      Message.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      FCAuditLog.countDocuments({ eventCategory: 'AUTO_DELETE', action: 'AUTO_DELETE_SCRUBBED' }),
      Conversation.countDocuments(),
      Conversation.countDocuments({ updatedAt: { $gte: twentyFourHoursAgo } }),
      WalkieTalkieSession.countDocuments(),
      WalkieTalkieSession.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    // Format cluster types map
    const clusterTypes = { FAMILY: 0, FRIENDS: 0, OFFICE: 0, CUSTOM: 0 };
    clustersByTypeAgg.forEach((item) => {
      if (item._id && clusterTypes[item._id] !== undefined) {
        clusterTypes[item._id] = item.count;
      }
    });

    // Format members status map
    const memberStatuses = { ACTIVE: 0, INVITED: 0, LEFT: 0, REMOVED: 0 };
    let totalMembersCount = 0;
    membersByStatusAgg.forEach((item) => {
      if (item._id && memberStatuses[item._id] !== undefined) {
        memberStatuses[item._id] = item.count;
        totalMembersCount += item.count;
      }
    });

    // Format messages type map
    const messageTypes = { TEXT: 0, VOICE: 0, WALKIE_TALKIE: 0 };
    messagesByTypeAgg.forEach((item) => {
      if (item._id && messageTypes[item._id] !== undefined) {
        messageTypes[item._id] = item.count;
      }
    });

    // Format invites status map from embedded member invites
    const inviteStatuses = { PENDING: memberStatuses.INVITED || 0, ACCEPTED: memberStatuses.ACTIVE || 0, EXPIRED: 0 };

    // Format walkie session statuses
    const walkieStatuses = { ACTIVE: 0, COMPLETED: 0, EXPIRED: 0 };
    walkieSessionsByStatusAgg.forEach((item) => {
      if (item._id && walkieStatuses[item._id] !== undefined) {
        walkieStatuses[item._id] = item.count;
      }
    });

    // 2. Real-time Gateway state from live runtime
    const onlineSocketsCount = walkieTalkieService.getOnlineUsersCount ? walkieTalkieService.getOnlineUsersCount() : 0;
    const activeFloorsCount = walkieTalkieService.getActiveFloorsCount ? walkieTalkieService.getActiveFloorsCount() : 0;

    return {
      clusters: {
        total: totalClusters,
        byType: clusterTypes,
      },
      members: {
        total: totalMembersCount,
        active: memberStatuses.ACTIVE,
        invited: memberStatuses.INVITED,
        left: memberStatuses.LEFT,
        removed: memberStatuses.REMOVED,
      },
      messages: {
        total: totalMessages,
        text: messageTypes.TEXT,
        voice: messageTypes.VOICE,
        walkieTalkie: messageTypes.WALKIE_TALKIE,
        autoDeleted: totalAutoDeletedMessages,
      },
      conversations: {
        total: totalConversations,
        active24h: activeConversations24h,
      },
      walkieTalkie: {
        totalSessions: totalWalkieSessions,
        byStatus: walkieStatuses,
      },
      invitations: {
        total: memberStatuses.INVITED || 0,
        pending: memberStatuses.INVITED || 0,
        accepted: memberStatuses.ACTIVE || 0,
      },
      runtime: {
        onlineSockets: onlineSocketsCount,
        activeFloors: activeFloorsCount,
        timestamp: new Date(),
      },
    };
  }
}

module.exports = new AdminFCOverviewService();
