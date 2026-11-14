const Cluster = require('./cluster.model');
const ClusterMember = require('../member/member.model');
const ApiError = require('../../../utils/apiError');

class ClusterService {
  /**
   * Create a new cluster
   * The creator is automatically added as ADMIN member
   */
  async createCluster(userId, data) {
    const { name, icon, color, type } = data;

    // Get the next priority value (append to end)
    const maxPriorityCluster = await Cluster.findOne({ creatorId: userId })
      .sort({ priority: -1 })
      .select('priority')
      .lean();
    const nextPriority = maxPriorityCluster ? maxPriorityCluster.priority + 1 : 0;

    const cluster = await Cluster.create({
      name: name.trim(),
      icon: icon || '👥',
      color: color || '#6C63FF',
      type: type ? type.toUpperCase() : 'CUSTOM',
      creatorId: userId,
      priority: nextPriority,
      memberCount: 1, // creator is the first member
    });

    // Add creator as ADMIN member
    const User = require('../../auth/user.model');
    const creator = await User.findById(userId).select('phone name').lean();

    await ClusterMember.create({
      clusterId: cluster._id,
      userId: userId,
      phone: creator.phone,
      displayName: creator.name || '',
      role: 'ADMIN',
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    // Automatically create associated Cluster Conversation
    try {
      const conversationService = require('../conversation/conversation.service');
      const conversation = await conversationService.getOrCreateClusterConversation(cluster._id, [userId]);
      cluster.conversationId = conversation._id;
      await cluster.save();
    } catch (convErr) {
      console.warn('[Cluster Creation]: Error auto-creating cluster conversation:', convErr.message);
    }

    return cluster;
  }

  /**
   * Get all clusters for a user (both owned and member-of), sorted by priority
   */
  async getUserClusters(userId) {
    // Find clusters the user created
    const ownedClusters = await Cluster.find({ creatorId: userId })
      .sort({ priority: 1 })
      .lean();

    // Find clusters the user is a member of (but didn't create)
    const memberships = await ClusterMember.find({
      userId: userId,
      status: 'ACTIVE',
    })
      .select('clusterId')
      .lean();

    const memberClusterIds = memberships
      .map((m) => m.clusterId.toString())
      .filter((id) => !ownedClusters.some((c) => c._id.toString() === id));

    let memberClusters = [];
    if (memberClusterIds.length > 0) {
      memberClusters = await Cluster.find({ _id: { $in: memberClusterIds } })
        .sort({ priority: 1 })
        .lean();
    }

    // Combine: owned first (sorted by priority), then member clusters
    return [...ownedClusters, ...memberClusters];
  }

  /**
   * Get a single cluster by ID (with authorization check)
   */
  async getClusterById(clusterId, userId) {
    const cluster = await Cluster.findById(clusterId).lean();
    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    // Check if user is creator or active member
    const isMember = await this._isUserClusterMember(clusterId, userId);
    if (cluster.creatorId.toString() !== userId.toString() && !isMember) {
      throw new ApiError(403, 'You do not have access to this cluster');
    }

    return cluster;
  }

  /**
   * Update cluster name, icon, or color (only creator/admin)
   */
  async updateCluster(clusterId, userId, updateData) {
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    // Only creator or admin member can update
    await this._requireAdminAccess(clusterId, userId, cluster);

    if (updateData.name !== undefined) {
      cluster.name = updateData.name.trim();
    }
    if (updateData.icon !== undefined) {
      cluster.icon = updateData.icon;
    }
    if (updateData.color !== undefined) {
      cluster.color = updateData.color;
    }
    if (updateData.type !== undefined) {
      cluster.type = updateData.type.toUpperCase();
    }

    await cluster.save();
    return cluster;
  }

  /**
   * Delete a cluster (only creator can delete)
   */
  async deleteCluster(clusterId, userId) {
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    if (cluster.creatorId.toString() !== userId.toString()) {
      throw new ApiError(403, 'Only the cluster creator can delete it');
    }

    // Delete all members
    await ClusterMember.deleteMany({ clusterId });

    // Delete pending invites for this cluster
    const Invite = require('../invite/invite.model');
    await Invite.deleteMany({ clusterId });

    // Delete the cluster
    await Cluster.findByIdAndDelete(clusterId);

    return { deleted: true, clusterId };
  }

  /**
   * Reorder cluster priorities for a user
   * Accepts: [{ clusterId, priority }]
   */
  async reorderClusters(userId, order) {
    const bulkOps = order.map((item) => ({
      updateOne: {
        filter: { _id: item.clusterId, creatorId: userId },
        update: { $set: { priority: item.priority } },
      },
    }));

    const result = await Cluster.bulkWrite(bulkOps);
    return {
      modifiedCount: result.modifiedCount,
      order,
    };
  }

  /**
   * Check if a user is an active member of a cluster
   */
  async _isUserClusterMember(clusterId, userId) {
    const member = await ClusterMember.findOne({
      clusterId,
      userId,
      status: 'ACTIVE',
    }).lean();
    return !!member;
  }

  /**
   * Require admin/creator access to a cluster
   */
  async _requireAdminAccess(clusterId, userId, cluster = null) {
    if (!cluster) {
      cluster = await Cluster.findById(clusterId).lean();
    }

    if (cluster.creatorId.toString() === userId.toString()) {
      return true;
    }

    const member = await ClusterMember.findOne({
      clusterId,
      userId,
      status: 'ACTIVE',
      role: 'ADMIN',
    }).lean();

    if (!member) {
      throw new ApiError(403, 'Admin access required for this action');
    }
    return true;
  }
}

module.exports = new ClusterService();
