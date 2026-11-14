const memberService = require('./member.service');
const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const { validateAddMembers } = require('./member.validation');

/**
 * POST /api/fc/clusters/:id/members – Add member(s) to a cluster
 */
const addMembers = asyncHandler(async (req, res) => {
  validateAddMembers(req.body);
  const results = await memberService.addMembers(
    req.params.id,
    req.user.id,
    req.body.members
  );
  return ApiResponse.success(res, results, 'Members processed successfully');
});

/**
 * GET /api/fc/clusters/:id/members – List cluster members
 */
const getMembers = asyncHandler(async (req, res) => {
  const members = await memberService.getClusterMembers(
    req.params.id,
    req.user.id
  );
  return ApiResponse.success(res, members, 'Members retrieved successfully');
});

/**
 * DELETE /api/fc/clusters/:id/members/:memberId – Remove a member
 */
const removeMember = asyncHandler(async (req, res) => {
  const result = await memberService.removeMember(
    req.params.id,
    req.params.memberId,
    req.user.id
  );
  return ApiResponse.success(res, result, 'Member removed successfully');
});

/**
 * POST /api/fc/clusters/:id/leave – Leave a cluster
 */
const leaveCluster = asyncHandler(async (req, res) => {
  const result = await memberService.leaveCluster(req.params.id, req.user.id);
  return ApiResponse.success(res, result, 'You have left the cluster');
});

module.exports = {
  addMembers,
  getMembers,
  removeMember,
  leaveCluster,
};
