const crypto = require('crypto');
const Cluster = require('../cluster/cluster.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');
const { formatPhoneNumber } = require('../../../utils/sms.service');

class InviteService {
  /**
   * Create an invite for a non-Arangtik user
   */
  async createInvite(inviterId, inviteePhone, clusterId) {
    const phone = formatPhoneNumber(inviteePhone);
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    // Check if invite exists in cluster.members
    const existingMember = (cluster.members || []).find(
      (m) => m.phone === phone && m.status === 'INVITED'
    );
    if (existingMember && existingMember.inviteCode) {
      return {
        _id: existingMember._id,
        inviteCode: existingMember.inviteCode,
        clusterId,
        inviteePhone: phone,
        status: 'PENDING',
      };
    }

    const inviteCode = crypto.randomBytes(6).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    cluster.members.push({
      userId: null,
      phone,
      displayName: '',
      role: 'MEMBER',
      status: 'INVITED',
      inviteCode,
      inviteExpiresAt: expiresAt,
      invitedAt: new Date(),
    });

    cluster.memberCount = cluster.members.filter((m) =>
      ['ACTIVE', 'INVITED'].includes(m.status)
    ).length;
    await cluster.save();

    return {
      inviteCode,
      clusterId,
      inviteePhone: phone,
      status: 'PENDING',
      expiresAt,
    };
  }

  /**
   * Accept an invite by invite code
   */
  async acceptInviteByCode(inviteCode, userId) {
    const user = await User.findById(userId).select('phone name').lean();
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Find cluster containing this inviteCode
    const cluster = await Cluster.findOne({
      'members.inviteCode': inviteCode,
    });

    if (!cluster) {
      throw new ApiError(404, 'Invite not found or already used');
    }

    const member = cluster.members.find((m) => m.inviteCode === inviteCode);
    if (!member) {
      throw new ApiError(404, 'Invite not found or already used');
    }

    if (member.inviteExpiresAt && new Date() > member.inviteExpiresAt) {
      member.status = 'EXPIRED';
      await cluster.save();
      throw new ApiError(400, 'This invite has expired');
    }

    if (user.phone !== member.phone) {
      throw new ApiError(403, 'This invite is not for your phone number');
    }

    member.userId = userId;
    member.status = 'ACTIVE';
    member.joinedAt = new Date();
    member.displayName = user.name || member.displayName || '';
    member.inviteCode = null;

    cluster.memberCount = cluster.members.filter((m) =>
      ['ACTIVE', 'INVITED'].includes(m.status)
    ).length;
    await cluster.save();

    return {
      accepted: true,
      clusterId: cluster._id,
      inviteCode,
    };
  }

  /**
   * Auto-accept all pending invites for a user's phone number
   */
  async autoAcceptPendingInvites(userId, phone) {
    const formattedPhone = formatPhoneNumber(phone);
    const user = await User.findById(userId).select('name phone').lean();

    const clusters = await Cluster.find({
      'members.phone': formattedPhone,
      'members.status': 'INVITED',
    });

    let acceptedCount = 0;

    for (const cluster of clusters) {
      let modified = false;
      cluster.members.forEach((m) => {
        if (m.phone === formattedPhone && m.status === 'INVITED') {
          m.userId = userId;
          m.status = 'ACTIVE';
          m.joinedAt = new Date();
          m.displayName = user?.name || m.displayName || '';
          m.inviteCode = null;
          modified = true;
          acceptedCount++;
        }
      });

      if (modified) {
        cluster.memberCount = cluster.members.filter((m) =>
          ['ACTIVE', 'INVITED'].includes(m.status)
        ).length;
        await cluster.save();
      }
    }

    return { accepted: acceptedCount };
  }

  /**
   * Get all pending invites sent by a user
   */
  async getSentInvites(userId) {
    const clusters = await Cluster.find({
      creatorId: userId,
      'members.status': 'INVITED',
    }).lean();

    const invites = [];
    clusters.forEach((c) => {
      (c.members || []).forEach((m) => {
        if (m.status === 'INVITED') {
          invites.push({
            _id: m._id,
            inviteePhone: m.phone,
            inviteCode: m.inviteCode,
            status: 'PENDING',
            clusterId: {
              _id: c._id,
              name: c.name,
              icon: c.icon,
            },
            createdAt: m.invitedAt || m.createdAt,
          });
        }
      });
    });

    return invites;
  }
}

module.exports = new InviteService();
