const crypto = require('crypto');
const Cluster = require('../cluster/cluster.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');
const { formatPhoneNumber } = require('../../../utils/sms.service');

class MemberService {
  /**
   * Add members to a cluster by phone number directly within cluster.members
   * - If the phone belongs to an existing Arangtik user -> add as ACTIVE member
   * - If the phone is not registered -> add as INVITED member with inviteCode
   */
  async addMembers(clusterId, userId, members) {
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    // Verify admin access
    const clusterService = require('../cluster/cluster.service');
    await clusterService._requireAdminAccess(clusterId, userId, cluster);

    if (!Array.isArray(cluster.members)) {
      cluster.members = [];
    }

    // Check member limit (max 50 per cluster)
    const currentActiveMembers = cluster.members.filter((m) =>
      ['ACTIVE', 'INVITED'].includes(m.status)
    );
    if (currentActiveMembers.length + members.length > 50) {
      throw new ApiError(
        400,
        `Cannot exceed 50 members per cluster. Current: ${currentActiveMembers.length}, adding: ${members.length}`
      );
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

        // Check if already a member in embedded array
        const existingMember = cluster.members.find(
          (m) => m.phone === phone && ['ACTIVE', 'INVITED'].includes(m.status)
        );

        if (existingMember) {
          results.alreadyExists.push({ phone, displayName });
          continue;
        }

        // Check if this phone belongs to a registered Arangtik user
        const existingUser = await User.findOne({ phone }).select('_id phone name').lean();

        if (existingUser) {
          // Add as active member directly
          const newMemberObj = {
            userId: existingUser._id,
            phone,
            displayName: displayName || existingUser.name || '',
            role: 'MEMBER',
            status: 'ACTIVE',
            joinedAt: new Date(),
          };

          cluster.members.push(newMemberObj);
          const savedMember = cluster.members[cluster.members.length - 1];

          results.added.push({
            memberId: savedMember._id,
            userId: existingUser._id,
            phone,
            displayName: savedMember.displayName,
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
          // Phone not registered – add as INVITED with inviteCode
          const inviteCode = crypto.randomBytes(6).toString('hex');
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          const newMemberObj = {
            userId: null,
            phone,
            displayName: displayName,
            role: 'MEMBER',
            status: 'INVITED',
            inviteCode,
            inviteExpiresAt: expiresAt,
            invitedAt: new Date(),
          };

          cluster.members.push(newMemberObj);
          const savedMember = cluster.members[cluster.members.length - 1];

          results.invited.push({
            memberId: savedMember._id,
            phone,
            displayName,
            status: 'INVITED',
            inviteCode,
          });
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
    cluster.memberCount = cluster.members.filter((m) =>
      ['ACTIVE', 'INVITED'].includes(m.status)
    ).length;

    await cluster.save();

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
    const cluster = await Cluster.findById(clusterId)
      .populate('members.userId', 'name phone profileImage status')
      .lean();

    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    // Verify access
    const isMember =
      cluster.creatorId.toString() === userId.toString() ||
      (cluster.members || []).some(
        (m) => m.userId && (m.userId._id || m.userId).toString() === userId.toString() && m.status === 'ACTIVE'
      );

    if (!isMember) {
      throw new ApiError(403, 'You do not have access to this cluster');
    }

    // Return active and invited members
    const members = (cluster.members || []).filter((m) =>
      ['ACTIVE', 'INVITED'].includes(m.status)
    );

    members.sort((a, b) => {
      if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
      if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
      return new Date(a.joinedAt || a.createdAt || 0) - new Date(b.joinedAt || b.createdAt || 0);
    });

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

    const member = (cluster.members || []).find(
      (m) => m._id.toString() === memberId.toString() && ['ACTIVE', 'INVITED'].includes(m.status)
    );

    if (!member) {
      throw new ApiError(404, 'Member not found in this cluster');
    }

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
    cluster.memberCount = cluster.members.filter((m) =>
      ['ACTIVE', 'INVITED'].includes(m.status)
    ).length;

    await cluster.save();

    try {
      const conversationService = require('../conversation/conversation.service');
      await conversationService.syncClusterParticipants(clusterId);
    } catch (syncErr) {
      console.warn('[Sync Cluster Participants Error]:', syncErr.message);
    }

    return { removed: true, memberId };
  }

  /**
   * Leave a cluster (self-removal)
   */
  async leaveCluster(clusterId, userId) {
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    if (cluster.creatorId.toString() === userId.toString()) {
      throw new ApiError(400, 'Cluster creator cannot leave. Transfer ownership or delete the cluster.');
    }

    const member = (cluster.members || []).find(
      (m) => m.userId && m.userId.toString() === userId.toString() && m.status === 'ACTIVE'
    );

    if (!member) {
      throw new ApiError(404, 'You are not an active member of this cluster');
    }

    member.status = 'LEFT';
    cluster.memberCount = cluster.members.filter((m) =>
      ['ACTIVE', 'INVITED'].includes(m.status)
    ).length;

    await cluster.save();

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
