const WalkieTalkieSession = require('../../../frequentConnect/walkieTalkie/walkieTalkie.model');
const Message = require('../../../frequentConnect/message/message.model');
const walkieTalkieService = require('../../../frequentConnect/walkieTalkie/walkieTalkie.service');

class AdminFCWalkieService {
  /**
   * Get live active walkie sessions & floor states
   */
  async getActiveSessions() {
    // In-memory + active DB sessions
    const activeSessions = await WalkieTalkieSession.find({ status: 'ACTIVE' })
      .populate('speakerId', 'name phone profileImage')
      .populate({
        path: 'conversationId',
        select: 'type clusterId participants',
        populate: { path: 'clusterId', select: 'name icon' },
      })
      .sort({ startedAt: -1 })
      .lean();

    const formatted = activeSessions.map((s) => ({
      sessionId: s._id,
      conversationId: s.conversationId?._id,
      conversationType: s.conversationId?.type,
      clusterName: s.conversationId?.clusterId?.name || '',
      speaker: s.speakerId,
      startedAt: s.startedAt,
      elapsedSeconds: Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000),
      status: s.status,
    }));

    return {
      activeSessions: formatted,
      count: formatted.length,
    };
  }

  /**
   * Historical walkie sessions
   */
  async getSessionHistory(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.status) {
      filter.status = query.status.toUpperCase();
    }
    if (query.speakerId) {
      filter.speakerId = query.speakerId;
    }
    if (query.conversationId) {
      filter.conversationId = query.conversationId;
    }
    if (query.startDate || query.endDate) {
      filter.startedAt = {};
      if (query.startDate) filter.startedAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.startedAt.$lte = new Date(query.endDate);
    }

    const [sessions, total] = await Promise.all([
      WalkieTalkieSession.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('speakerId', 'name phone profileImage')
        .populate({
          path: 'conversationId',
          select: 'type clusterId',
          populate: { path: 'clusterId', select: 'name icon' },
        })
        .lean(),
      WalkieTalkieSession.countDocuments(filter),
    ]);

    return {
      sessions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Voice message audit logs
   */
  async getVoiceLogs(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { type: 'VOICE' };

    if (query.senderId) {
      filter.senderId = query.senderId;
    }
    if (query.status) {
      filter.status = query.status.toUpperCase();
    }

    const [voiceLogs, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name phone profileImage')
        .populate('recipientStatuses.userId', 'name phone')
        .populate({
          path: 'conversationId',
          select: 'type clusterId',
          populate: { path: 'clusterId', select: 'name icon' },
        })
        .lean(),
      Message.countDocuments(filter),
    ]);

    return {
      voiceLogs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

module.exports = new AdminFCWalkieService();
