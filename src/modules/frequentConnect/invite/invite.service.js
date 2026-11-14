const Invite = require('./invite.model');
const Cluster = require('../cluster/cluster.model');
const ClusterMember = require('../member/member.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');
const { formatPhoneNumber } = require('../../../utils/sms.service');

class InviteService {
  /**
   * Create an invite for a non-Arangtik user
   * (Usually called internally by member.service when adding a non-registered phone)
   */
  async createInvite(inviterId, inviteePhone, clusterId) {
    const phone = formatPhoneNumber(inviteePhone);

    // Check if invite already exists
    const existingInvite = await Invite.findOne({
      inviteePhone: phone,
      clusterId,
      status: 'PENDING',
    });

    if (existingInvite) {
      return existingInvite;
    }

    const invite = await Invite.create({
      inviterId,
      inviteePhone: phone,
      clusterId,
    });

    return invite;
  }

  /**
   * Accept an invite by invite code (called when a new user registers or from deep link)
   */
  async acceptInviteByCode(inviteCode, userId) {
    const invite = await Invite.findOne({
      inviteCode,
      status: 'PENDING',
    });

    if (!invite) {
      throw new ApiError(404, 'Invite not found or already used');
    }

    if (new Date() > invite.expiresAt) {
      invite.status = 'EXPIRED';
      await invite.save();
      throw new ApiError(400, 'This invite has expired');
    }

    const user = await User.findById(userId).select('phone name').lean();
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify the invite is for this user's phone
    if (user.phone !== invite.inviteePhone) {
      throw new ApiError(403, 'This invite is not for your phone number');
    }

    // Update invite status
    invite.status = 'ACCEPTED';
    await invite.save();

    // Activate the cluster member record
    const member = await ClusterMember.findOneAndUpdate(
      {
        clusterId: invite.clusterId,
        phone: invite.inviteePhone,
        status: 'INVITED',
      },
      {
        $set: {
          userId: userId,
          status: 'ACTIVE',
          joinedAt: new Date(),
          displayName: user.name || '',
        },
      },
      { new: true }
    );

    if (!member) {
      // If member record doesn't exist, create it
      await ClusterMember.create({
        clusterId: invite.clusterId,
        userId: userId,
        phone: user.phone,
        displayName: user.name || '',
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    }

    // Update member count
    const activeCount = await ClusterMember.countDocuments({
      clusterId: invite.clusterId,
      status: { $in: ['ACTIVE', 'INVITED'] },
    });
    await Cluster.findByIdAndUpdate(invite.clusterId, { memberCount: activeCount });

    return {
      accepted: true,
      clusterId: invite.clusterId,
      inviteCode,
    };
  }

  /**
   * Auto-accept all pending invites for a user's phone number
   * Called during user registration (verifyOtp in auth.service)
   */
  async autoAcceptPendingInvites(userId, phone) {
    const formattedPhone = formatPhoneNumber(phone);

    const pendingInvites = await Invite.find({
      inviteePhone: formattedPhone,
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    });

    if (pendingInvites.length === 0) {
      return { accepted: 0 };
    }

    const user = await User.findById(userId).select('name phone').lean();
    let acceptedCount = 0;

    for (const invite of pendingInvites) {
      try {
        // Mark invite as accepted
        invite.status = 'ACCEPTED';
        await invite.save();

        // Activate member record
        await ClusterMember.findOneAndUpdate(
          {
            clusterId: invite.clusterId,
            phone: formattedPhone,
            status: 'INVITED',
          },
          {
            $set: {
              userId: userId,
              status: 'ACTIVE',
              joinedAt: new Date(),
              displayName: user?.name || '',
            },
          }
        );

        // Update member count
        const activeCount = await ClusterMember.countDocuments({
          clusterId: invite.clusterId,
          status: { $in: ['ACTIVE', 'INVITED'] },
        });
        await Cluster.findByIdAndUpdate(invite.clusterId, { memberCount: activeCount });

        acceptedCount++;
      } catch (err) {
        console.error(`[FC Invite Auto-Accept Error]: ${err.message}`);
      }
    }

    return { accepted: acceptedCount };
  }

  /**
   * Get all pending invites sent by a user
   */
  async getSentInvites(userId) {
    return Invite.find({ inviterId: userId, status: 'PENDING' })
      .populate('clusterId', 'name icon')
      .sort({ createdAt: -1 })
      .lean();
  }
}

module.exports = new InviteService();
