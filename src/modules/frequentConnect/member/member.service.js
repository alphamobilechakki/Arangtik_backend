const ClusterMember = require('./member.model');
const Cluster = require('../cluster/cluster.model');
const User = require('../../auth/user.model');
const Invite = require('../invite/invite.model');
const ApiError = require('../../../utils/apiError');
const { formatPhoneNumber } = require('../../../utils/sms.service');

class MemberService {
  /**
   * Add members to a cluster by phone number
   * - If the phone belongs to an existing Arangtik user → add as ACTIVE member
   * - If the phone is not registered → add as INVITED member + create invite
   */
  async addMembers(clusterId, userId, members) {
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    // Verify admin access
    const clusterService = require('../cluster/cluster.service');
    await clusterService._requireAdminAccess(clusterId, userId, cluster);

    // Check member limit (max 50 per cluster)
    const currentCount = await ClusterMember.countDocuments({
      clusterId,
      status: { $in: ['ACTIVE', 'INVITED'] },
    });

    if (currentCount + members.length > 50) {
      throw new ApiError(400, `Cannot exceed 50 members per cluster. Current: ${currentCount}, adding: ${members.length}`);
    }

    const results = {
      added: [],
      invited: [],
      alreadyExists: [],
      errors: [],
    };

    for (const memberData of members) {
      try {
        const phone = formatPhoneNumber(memberData.phone);
        const displayName = memberData.displayName || memberData.name || '';

        // Check if already a member
        const existingMember = await ClusterMember.findOne({
          clusterId,
          phone,
          status: { $in: ['ACTIVE', 'INVITED'] },
        });

        if (existingMember) {
          results.alreadyExists.push({ phone, displayName });
          continue;
        }

        // Check if this phone belongs to a registered Arangtik user
        const existingUser = await User.findOne({ phone }).select('_id phone name').lean();

        if (existingUser) {
          // Add as active member directly
          const member = await ClusterMember.create({
            clusterId,
            userId: existingUser._id,
            phone,
            displayName: displayName || existingUser.name || '',
            role: 'MEMBER',
            status: 'ACTIVE',
            joinedAt: new Date(),
          });

          results.added.push({
            memberId: member._id,
            userId: existingUser._id,
            phone,
            displayName: member.displayName,
            status: 'ACTIVE',
          });

          // Send notification to the added user
          try {
            const notificationService = require('../../notification/notification.service');
            const inviter = await User.findById(userId).select('name').lean();
            await notificationService.sendToUser(existingUser._id, {
              title: 'Added to Cluster',
              body: `${inviter?.name || 'Someone'} added you to "${cluster.name}" cluster`,
              type: 'FC_MEMBER_ADDED',
              data: { clusterId: clusterId.toString(), clusterName: cluster.name },
            });
          } catch (notifErr) {
            console.warn('[FC Member Add Notification Error]:', notifErr.message);
          }
        } else {
          // Phone not registered – add as INVITED and create invite
          const member = await ClusterMember.create({
            clusterId,
            userId: null,
            phone,
            displayName: displayName,
            role: 'MEMBER',
            status: 'INVITED',
            invitedAt: new Date(),
          });

          // Create invite record
          const invite = await Invite.create({
            inviterId: userId,
            inviteePhone: phone,
            clusterId,
          });

          results.invited.push({
            memberId: member._id,
            phone,
            displayName,
            status: 'INVITED',
            inviteCode: invite.inviteCode,
          });

          // Send SMS invitation
          try {
            const inviter = await User.findById(userId).select('name').lean();
            const { sendSmsOtp } = require('../../../utils/sms.service');
            // Use a custom message for invitation (not OTP)
            console.log(
              `[FC Invite SMS]: Would send invite SMS to ${phone} from ${inviter?.name || 'A user'}. Invite code: ${invite.inviteCode}`
            );
            // TODO: Implement dedicated invite SMS template via SMS gateway
          } catch (smsErr) {
            console.warn('[FC Invite SMS Error]:', smsErr.message);
          }
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        results.errors.push({
          phone: memberData.phone,
          error: err.message,
        });
      }
    }

    // Update denormalized member count
    const activeCount = await ClusterMember.countDocuments({
      clusterId,
      status: { $in: ['ACTIVE', 'INVITED'] },
    });
    await Cluster.findByIdAndUpdate(clusterId, { memberCount: activeCount });

    // Sync conversation participants
    try {
      const conversationService = require('../conversation/conversation.service');
      await conversationService.syncClusterParticipants(clusterId);
    } catch (syncErr) {
      console.warn('[Sync Cluster Participants Error]:', syncErr.message);
    }

    return results;
  }

  /**
   * List all members of a cluster
   */
  async getClusterMembers(clusterId, userId) {
    const cluster = await Cluster.findById(clusterId).lean();
    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    // Verify access
    const isMember = await ClusterMember.findOne({
      clusterId,
      userId,
      status: 'ACTIVE',
    }).lean();

    if (cluster.creatorId.toString() !== userId.toString() && !isMember) {
      throw new ApiError(403, 'You do not have access to this cluster');
    }

    const members = await ClusterMember.find({
      clusterId,
      status: { $in: ['ACTIVE', 'INVITED'] },
    })
      .populate('userId', 'name phone profileImage status')
      .sort({ role: 1, joinedAt: 1 }) // ADMINs first, then by join date
      .lean();

    return members;
  }

  /**
   * Remove a member from a cluster
   */
  async removeMember(clusterId, memberId, userId) {
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    const member = await ClusterMember.findOne({
      _id: memberId,
      clusterId,
      status: { $in: ['ACTIVE', 'INVITED'] },
    });

    if (!member) {
      throw new ApiError(404, 'Member not found in this cluster');
    }

    // A member can remove themselves, or an admin can remove anyone
    const isSelfRemoval =
      member.userId && member.userId.toString() === userId.toString();

    if (!isSelfRemoval) {
      const clusterService = require('../cluster/cluster.service');
      await clusterService._requireAdminAccess(clusterId, userId, cluster);
    }

    // Cannot remove the cluster creator
    if (
      member.userId &&
      member.userId.toString() === cluster.creatorId.toString()
    ) {
      throw new ApiError(400, 'Cannot remove the cluster creator. Delete the cluster instead.');
    }

    member.status = 'REMOVED';
    await member.save();

    // Update denormalized count
    const activeCount = await ClusterMember.countDocuments({
      clusterId,
      status: { $in: ['ACTIVE', 'INVITED'] },
    });
    await Cluster.findByIdAndUpdate(clusterId, { memberCount: activeCount });

    try {
      const conversationService = require('../conversation/conversation.service');
      await conversationService.syncClusterParticipants(clusterId);
    } catch (syncErr) {
      console.warn('[Sync Cluster Participants Error]:', syncErr.message);
    }

    return { removed: true, memberId: member._id };
  }

  /**
   * Leave a cluster (self-removal)
   */
  async leaveCluster(clusterId, userId) {
    const member = await ClusterMember.findOne({
      clusterId,
      userId,
      status: 'ACTIVE',
    });

    if (!member) {
      throw new ApiError(404, 'You are not an active member of this cluster');
    }

    // Creator cannot leave their own cluster
    const cluster = await Cluster.findById(clusterId).lean();
    if (cluster && cluster.creatorId.toString() === userId.toString()) {
      throw new ApiError(400, 'Cluster creator cannot leave. Transfer ownership or delete the cluster.');
    }

    member.status = 'LEFT';
    await member.save();

    // Update count
    const activeCount = await ClusterMember.countDocuments({
      clusterId,
      status: { $in: ['ACTIVE', 'INVITED'] },
    });
    await Cluster.findByIdAndUpdate(clusterId, { memberCount: activeCount });

    try {
      const conversationService = require('../conversation/conversation.service');
      await conversationService.syncClusterParticipants(clusterId);
    } catch (syncErr) {
      console.warn('[Sync Cluster Participants Error]:', syncErr.message);
    }

    return { left: true, clusterId };
  }
}

module.exports = new MemberService();
