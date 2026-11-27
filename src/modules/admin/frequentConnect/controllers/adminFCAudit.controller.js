const mongoose = require('mongoose');
const Message = require('../../../frequentConnect/message/message.model');
const Cluster = require('../../../frequentConnect/cluster/cluster.model');
const Conversation = require('../../../frequentConnect/conversation/conversation.model');
const FCAuditLog = require('../../../frequentConnect/audit/fcAuditLog.model');
const fcAuditLogService = require('../../../frequentConnect/audit/fcAuditLog.service');
const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');

/**
 * GET /api/admin/fc/auto-delete/logs – Auto-delete logs & scheduled destructions
 */
const getAutoDeleteLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { eventCategory: 'AUTO_DELETE' };
  if (req.query.conversationId) filter.conversationId = req.query.conversationId;

  const [logs, total, activeAutoDeleteConvs] = await Promise.all([
    FCAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actorId', 'name phone')
      .populate({
        path: 'conversationId',
        select: 'type clusterId autoDelete',
        populate: { path: 'clusterId', select: 'name icon' },
      })
      .lean(),
    FCAuditLog.countDocuments(filter),
    Conversation.countDocuments({ autoDelete: true }),
  ]);

  return ApiResponse.success(
    res,
    {
      logs,
      activeAutoDeleteConversations: activeAutoDeleteConvs,
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
  getAutoDeleteLogs,
  getInvitations,
  getAuditLogs,
};
