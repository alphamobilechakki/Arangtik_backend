const inviteService = require('./invite.service');
const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');

/**
 * POST /api/fc/invites – Create/send an invite (manual)
 */
const createInvite = asyncHandler(async (req, res) => {
  const { phone, clusterId } = req.body;
  if (!phone || !clusterId) {
    return res.status(400).json({ success: false, message: 'Phone and clusterId are required' });
  }
  const invite = await inviteService.createInvite(req.user.id, phone, clusterId);
  return ApiResponse.created(res, invite, 'Invite sent successfully');
});

/**
 * POST /api/fc/invites/:code/accept – Accept an invite by code
 */
const acceptInvite = asyncHandler(async (req, res) => {
  const result = await inviteService.acceptInviteByCode(req.params.code, req.user.id);
  return ApiResponse.success(res, result, 'Invite accepted successfully');
});

/**
 * GET /api/fc/invites – Get sent invites for auth user
 */
const getSentInvites = asyncHandler(async (req, res) => {
  const invites = await inviteService.getSentInvites(req.user.id);
  return ApiResponse.success(res, invites, 'Invites retrieved successfully');
});

module.exports = {
  createInvite,
  acceptInvite,
  getSentInvites,
};
