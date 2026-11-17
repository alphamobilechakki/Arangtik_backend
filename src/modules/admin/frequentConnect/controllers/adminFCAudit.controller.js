const mongoose = require('mongoose');
const Message = require('../../../frequentConnect/message/message.model');
const Cluster = require('../../../frequentConnect/cluster/cluster.model');
const fcAuditLogService = require('../../../frequentConnect/audit/fcAuditLog.service');
const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');

/**
 * GET /api/admin/fc/saved-messages – Saved message logs
 */
const getSavedMessages = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {
    'savedBy.0': { $exists: true },
  };
  if (req.query.userId) filter['savedBy.userId'] = req.query.userId;
  if (req.query.conversationId) filter.conversationId = req.query.conversationId;

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ 'savedBy.savedAt': -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name phone')
      .populate('savedBy.userId', 'name phone profileImage')
      .populate({
        path: 'conversationId',
        select: 'type clusterId',
        populate: { path: 'clusterId', select: 'name icon' },
      })
      .lean(),
    Message.countDocuments(filter),
  ]);

  const savedMessages = messages.flatMap((m) =>
    (m.savedBy || []).map((s) => ({
      _id: m._id,
      messageId: m,
      userId: s.userId,
      conversationId: m.conversationId,
      note: s.note,
      savedAt: s.savedAt,
    }))
  );

  return ApiResponse.success(
    res,
    {
      savedMessages,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    },
    'Saved messages logs retrieved successfully'
  );
});

/**
 * GET /api/admin/fc/auto-delete/logs – Auto-delete logs & scheduled destructions
 */
const getAutoDeleteLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {
    $or: [{ isAutoDeleted: true }, { autoDeleteAt: { $ne: null } }],
  };

  if (req.query.isAutoDeleted !== undefined) {
    filter.isAutoDeleted = req.query.isAutoDeleted === 'true';
  }

  const [messages, total] = await Promise.all([
    Message.find(filter)
      .sort({ autoDeleteAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name phone')
      .populate('recipientStatuses.userId', 'name phone')
      .populate({
        path: 'conversationId',
        select: 'type clusterId',
        populate: { path: 'clusterId', select: 'name icon' },
      })
      .lean(),
    Message.countDocuments(filter),
  ]);

  return ApiResponse.success(
    res,
    {
      messages,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    },
    'Auto-delete logs retrieved successfully'
  );
});

/**
 * GET /api/admin/fc/invitations – Cluster invitation logs
 */
const getInvitations = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const match = { 'members.status': 'INVITED' };
  if (req.query.phone) match['members.phone'] = { $regex: req.query.phone.replace(/\D/g, ''), $options: 'i' };
  if (req.query.clusterId) match['_id'] = new mongoose.Types.ObjectId(req.query.clusterId);

  const [invitations, totalAgg] = await Promise.all([
    Cluster.aggregate([
      { $unwind: '$members' },
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'creatorId',
          foreignField: '_id',
          as: 'inviter',
        },
      },
      {
        $project: {
          _id: '$members._id',
          inviterId: { $arrayElemAt: ['$inviter', 0] },
          inviteePhone: '$members.phone',
          inviteCode: '$members.inviteCode',
          status: '$members.status',
          clusterId: { _id: '$_id', name: '$name', icon: '$icon', color: '$color', type: '$type' },
          createdAt: '$members.invitedAt',
          expiresAt: '$members.inviteExpiresAt',
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
    Cluster.aggregate([
      { $unwind: '$members' },
      { $match: match },
      { $count: 'total' },
    ]),
  ]);

  const total = totalAgg[0]?.total || 0;

  return ApiResponse.success(
    res,
    {
      invitations,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    },
    'Invitations logs retrieved successfully'
  );
});

/**
 * GET /api/admin/fc/audit-logs – Query historical FCAuditLog records
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await fcAuditLogService.queryLogs(req.query);
  return ApiResponse.success(res, result, 'Audit logs retrieved successfully');
});

module.exports = {
  getSavedMessages,
  getAutoDeleteLogs,
  getInvitations,
  getAuditLogs,
};
