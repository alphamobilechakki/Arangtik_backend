const Cluster = require('./cluster.model');
const ApiError = require('../../../utils/apiError');
const User = require('../../auth/user.model');

class ClusterService {
  /**
   * Create a new cluster
   * The creator is automatically added as ADMIN member inside the embedded members array
   */
  async createCluster(userId, data) {
    const { name, icon, color, type } = data;

    // Get the next priority value (append to end)
    const maxPriorityCluster = await Cluster.findOne({ creatorId: userId })
      .sort({ priority: -1 })
      .select('priority')
      .lean();
    const nextPriority = maxPriorityCluster ? maxPriorityCluster.priority + 1 : 0;

    const creator = await User.findById(userId).select('phone name').lean();
    const creatorPhone = creator ? creator.phone : '';
    const creatorName = creator ? creator.name || '' : '';

    const creatorMember = {
      userId: userId,
      phone: creatorPhone,
      displayName: creatorName,
      role: 'ADMIN',
      status: 'ACTIVE',
      joinedAt: new Date(),
    };

    const cluster = await Cluster.create({
      name: name.trim(),
      icon: icon || '👥',
      color: color || '#6C63FF',
      type: type ? type.toUpperCase() : 'CUSTOM',
      creatorId: userId,
      priority: nextPriority,
      memberCount: 1, // creator is the first member
      members: [creatorMember],
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
   * Executed as a single atomic query on the consolidated fc_clusters collection
   */
  async getUserClusters(userId) {
    const clusters = await Cluster.find({
      $or: [
        { creatorId: userId },
        { members: { $elemMatch: { userId: userId, status: 'ACTIVE' } } },
      ],
    })
      .sort({ priority: 1 })
      .lean();

    return clusters;
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
    const isMember = await this._isUserClusterMember(clusterId, userId, cluster);
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

    // Delete the cluster (embedded members are cleaned automatically)
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
  async _isUserClusterMember(clusterId, userId, cluster = null) {
    const doc = cluster || (await Cluster.findById(clusterId).lean());
    if (!doc) return false;

    if (doc.creatorId && doc.creatorId.toString() === userId.toString()) {
      return true;
    }

    if (Array.isArray(doc.members)) {
      return doc.members.some(
        (m) => m.userId && (m.userId._id || m.userId).toString() === userId.toString() && m.status === 'ACTIVE'
      );
    }

    return false;
  }

  /**
   * Require admin/creator access to a cluster
   */
  async _requireAdminAccess(clusterId, userId, cluster = null) {
    const doc = cluster || (await Cluster.findById(clusterId).lean());
    if (!doc) {
      throw new ApiError(404, 'Cluster not found');
    }

    if (doc.creatorId && doc.creatorId.toString() === userId.toString()) {
      return true;
    }

    if (Array.isArray(doc.members)) {
      const isAdmin = doc.members.some(
        (m) =>
          m.userId &&
          (m.userId._id || m.userId).toString() === userId.toString() &&
          m.status === 'ACTIVE' &&
          m.role === 'ADMIN'
      );
      if (isAdmin) return true;
    }

    throw new ApiError(403, 'Admin access required for this action');
  }
}

module.exports = new ClusterService();
