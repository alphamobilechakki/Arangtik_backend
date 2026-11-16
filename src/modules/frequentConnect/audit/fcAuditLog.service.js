const FCAuditLog = require('./fcAuditLog.model');

class FCAuditLogService {
  /**
   * Record an immutable audit log entry asynchronously
   */
  async logEvent({
    eventCategory,
    action,
    actorId = null,
    actorPhone = '',
    actorRole = 'USER',
    targetType,
    targetId = null,
    conversationId = null,
    clusterId = null,
    metadata = {},
    ipAddress = '',
    userAgent = '',
  }) {
    try {
      const entry = await FCAuditLog.create({
        eventCategory,
        action,
        actorId,
        actorPhone,
        actorRole,
        targetType,
        targetId,
        conversationId,
        clusterId,
        metadata,
        ipAddress,
        userAgent,
      });

      // Broadcast live audit event to Admin Socket room if socket server is initialized
      try {
        const { getIO } = require('../../../config/socket.config');
        const io = getIO();
        io.of('/fc').to('admin-fc-monitor').emit('admin:audit-event', entry);
      } catch (wsErr) {
        // Non-fatal if socket not ready
      }

      return entry;
    } catch (err) {
      console.warn('[FCAuditLogService Warning]: Failed to record audit log:', err.message);
      return null;
    }
  }

  /**
   * Retrieve paginated audit logs with multi-parameter filtering
   */
  async queryLogs(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (query.eventCategory) {
      filter.eventCategory = query.eventCategory.toUpperCase();
    }

    if (query.action) {
      filter.action = query.action.toUpperCase();
    }

    if (query.actorId) {
      filter.actorId = query.actorId;
    }

    if (query.conversationId) {
      filter.conversationId = query.conversationId;
    }

    if (query.clusterId) {
      filter.clusterId = query.clusterId;
    }

    if (query.actorPhone) {
      filter.actorPhone = { $regex: query.actorPhone.replace(/\D/g, ''), $options: 'i' };
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      FCAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'name phone profileImage')
        .populate('clusterId', 'name icon color')
        .lean(),
      FCAuditLog.countDocuments(filter),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

module.exports = new FCAuditLogService();
