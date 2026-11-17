const Cluster = require('./cluster.model');
const ApiError = require('../../../utils/apiError');
const User = require('../../auth/user.model');
const mongoose = require('mongoose');

class ClusterService {
  /**
   * Helper to resolve feature IDs by ObjectId or uppercase Code
   */
  async _resolveFeatureIds(rawFeatures) {
    if (!Array.isArray(rawFeatures) || rawFeatures.length === 0) {
      return [];
    }
    const ClusterFeature = require('../../admin/clusterFeature/clusterFeature.model');
    const validObjectIds = rawFeatures.filter((f) => mongoose.Types.ObjectId.isValid(String(f)));
    const codes = rawFeatures.map((f) => String(f).toUpperCase().trim());

    const matchedFeatures = await ClusterFeature.find({
      $or: [
        { _id: { $in: validObjectIds } },
        { code: { $in: codes } },
      ],
      isDeleted: false,
    }).select('_id');

    return matchedFeatures.map((f) => f._id);
  }

  /**
   * Create a new cluster
   * The creator is automatically added as ADMIN member inside the embedded members array
   */
  async createCluster(userId, data) {
    const { name, icon, color, type, features, featureIds } = data;

    // Resolve feature IDs if provided or default to active system features
    const rawFeatures = features || featureIds;
    let resolvedFeatures = [];
    if (rawFeatures !== undefined) {
      resolvedFeatures = await this._resolveFeatureIds(rawFeatures);
    } else {
      try {
        const ClusterFeature = require('../../admin/clusterFeature/clusterFeature.model');
        const defaultFeatures = await ClusterFeature.find({
          isActive: true,
          isDeleted: false,
        }).select('_id');
        resolvedFeatures = defaultFeatures.map((f) => f._id);
      } catch (_) {}
    }

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
      features: resolvedFeatures,
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

    await cluster.populate('features', 'name code icon description isActive');
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
      .populate('features', 'name code icon description isActive')
      .sort({ priority: 1 })
      .lean();

    return clusters;
  }

  /**
   * Get a single cluster by ID (with authorization check)
   */
  async getClusterById(clusterId, userId) {
    const cluster = await Cluster.findById(clusterId)
      .populate('features', 'name code icon description isActive')
      .lean();
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
   * Update cluster name, icon, color, or features (only creator/admin)
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
    if (updateData.features !== undefined || updateData.featureIds !== undefined) {
      const rawFeatures = updateData.features || updateData.featureIds;
      cluster.features = await this._resolveFeatureIds(rawFeatures);
    }

    await cluster.save();
    await cluster.populate('features', 'name code icon description isActive');
    return cluster;
  }

  /**
   * Toggle, add, or remove a feature for a cluster when clicked by user/admin
   */
  async updateClusterFeatures(clusterId, userId, payload) {
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    await this._requireAdminAccess(clusterId, userId, cluster);

    // If full features array provided, replace it
    if (payload.features !== undefined || payload.featureIds !== undefined) {
      const rawFeatures = payload.features || payload.featureIds;
      cluster.features = await this._resolveFeatureIds(rawFeatures);
      await cluster.save();
      await cluster.populate('features', 'name code icon description isActive');
      return cluster;
    }

    // Single feature click (toggle, add, remove)
    const featureIdentifier = payload.featureId || payload.feature || payload.code;
    if (!featureIdentifier) {
      throw new ApiError(400, 'featureId or features array is required');
    }

    const ClusterFeature = require('../../admin/clusterFeature/clusterFeature.model');
    const isId = mongoose.Types.ObjectId.isValid(String(featureIdentifier));

    const feature = await ClusterFeature.findOne({
      $or: [
        { _id: isId ? featureIdentifier : null },
        { code: String(featureIdentifier).toUpperCase().trim() },
      ],
      isDeleted: false,
    });

    if (!feature) {
      throw new ApiError(404, `Feature "${featureIdentifier}" not found`);
    }

    if (!Array.isArray(cluster.features)) {
      cluster.features = [];
    }

    const featureIdStr = feature._id.toString();
    const existingIndex = cluster.features.findIndex(
      (f) => (f._id ? f._id.toString() : f.toString()) === featureIdStr
    );

    const action = payload.action || 'toggle';

    if (action === 'add') {
      if (existingIndex === -1) {
        cluster.features.push(feature._id);
      }
    } else if (action === 'remove') {
      if (existingIndex !== -1) {
        cluster.features.splice(existingIndex, 1);
      }
    } else {
      // Toggle
      if (existingIndex !== -1) {
        cluster.features.splice(existingIndex, 1);
      } else {
        cluster.features.push(feature._id);
      }
    }

    await cluster.save();
    await cluster.populate('features', 'name code icon description isActive');
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
