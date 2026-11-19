const mongoose = require('mongoose');
const Cluster = require('./cluster.model');
const ClusterFeature = require('../../admin/clusterFeature/clusterFeature.model');
const Wardrobe = require('../../wardrobe/wardrobe.model');
const WardrobeItem = require('../../wardrobe/wardrobeItem.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');

// Lightweight in-memory feature ID cache (TTL: 60s)
const featureCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

class ClusterAccessService {
  /**
   * Resolve feature ObjectId by uppercase code with caching
   */
  async resolveFeatureId(featureCode = 'WARDROBE') {
    const code = String(featureCode).toUpperCase().trim();
    const cached = featureCache.get(code);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.id;
    }

    const feature = await ClusterFeature.findOne({
      code,
      isDeleted: false,
    }).select('_id');

    if (!feature) {
      throw new ApiError(404, `Cluster feature "${code}" is not registered in the system`);
    }

    featureCache.set(code, { id: feature._id, timestamp: Date.now() });
    return feature._id;
  }

  /**
   * Get all User IDs whose assets the actor is permitted to view/manage
   * Returns: [ actorId, memberId1, memberId2, ... ]
   */
  async getAccessibleOwnerIds(actorId, featureCode = 'WARDROBE', clusterId = null) {
    const actorObjectId = new mongoose.Types.ObjectId(actorId);
    const featureId = await this.resolveFeatureId(featureCode);

    const clusterQuery = {
      features: featureId,
      $or: [
        { creatorId: actorObjectId },
        { members: { $elemMatch: { userId: actorObjectId, status: 'ACTIVE' } } },
      ],
    };

    if (clusterId && mongoose.Types.ObjectId.isValid(clusterId)) {
      clusterQuery._id = new mongoose.Types.ObjectId(clusterId);
    }

    // Find all active clusters for actor where the feature is enabled
    const clusters = await Cluster.find(clusterQuery)
      .select('members creatorId')
      .lean();

    const allowedUserIdsSet = new Set([actorObjectId.toString()]);

    for (const cluster of clusters) {
      if (cluster.creatorId) {
        allowedUserIdsSet.add(cluster.creatorId.toString());
      }
      if (Array.isArray(cluster.members)) {
        for (const m of cluster.members) {
          if (m.userId && m.status === 'ACTIVE') {
            const uid = (m.userId._id || m.userId).toString();
            allowedUserIdsSet.add(uid);
          }
        }
      }
    }

    return Array.from(allowedUserIdsSet).map((id) => new mongoose.Types.ObjectId(id));
  }

  /**
   * Assert that actor has access to a specific target user's assets
   * Returns the shared cluster document if allowed; throws 403 otherwise.
   */
  async assertAccess(actorIdOrObj, targetOwnerIdParam, featureCodeParam = 'WARDROBE', clusterIdParam = null) {
    let actorId, targetOwnerId, featureCode, clusterId, action;
    if (actorIdOrObj && typeof actorIdOrObj === 'object' && !mongoose.Types.ObjectId.isValid(actorIdOrObj)) {
      actorId = actorIdOrObj.actorId;
      targetOwnerId = actorIdOrObj.targetOwnerId;
      featureCode = actorIdOrObj.featureCode || 'WARDROBE';
      clusterId = actorIdOrObj.clusterId || null;
      action = actorIdOrObj.action || 'VIEW';
    } else {
      actorId = actorIdOrObj;
      targetOwnerId = targetOwnerIdParam;
      featureCode = featureCodeParam || 'WARDROBE';
      clusterId = clusterIdParam || null;
      action = 'VIEW';
    }

    if (!actorId || !targetOwnerId) {
      throw new ApiError(400, 'actorId and targetOwnerId are required');
    }

    const actorStr = actorId.toString();
    const targetStr = targetOwnerId.toString();

    // Self access is always permitted
    if (actorStr === targetStr) {
      return { isSelf: true, cluster: null };
    }

    const featureId = await this.resolveFeatureId(featureCode);
    const actorObjectId = new mongoose.Types.ObjectId(actorId);
    const targetObjectId = new mongoose.Types.ObjectId(targetOwnerId);

    const clusterQuery = {
      features: featureId,
      $and: [
        {
          $or: [
            { creatorId: actorObjectId },
            { members: { $elemMatch: { userId: actorObjectId, status: 'ACTIVE' } } },
          ],
        },
        {
          $or: [
            { creatorId: targetObjectId },
            { members: { $elemMatch: { userId: targetObjectId, status: 'ACTIVE' } } },
          ],
        },
      ],
    };

    if (clusterId && mongoose.Types.ObjectId.isValid(clusterId)) {
      clusterQuery._id = new mongoose.Types.ObjectId(clusterId);
    }

    // Find shared active cluster with feature enabled
    const cluster = await Cluster.findOne(clusterQuery);

    if (!cluster) {
      throw new ApiError(
        403,
        `Permission denied: You do not share an active cluster with feature "${featureCode}" enabled for this user.`
      );
    }

    return { isSelf: false, cluster };
  }

  /**
   * Helper specifically for wardrobe access (accepts owner userId or wardrobeId)
   */
  async assertWardrobeAccess(actorId, targetOwnerOrWardrobeId, action = 'VIEW') {
    let targetOwnerId = targetOwnerOrWardrobeId;
    try {
      const Wardrobe = require('../../wardrobe/wardrobe.model');
      const wDoc = await Wardrobe.findById(targetOwnerOrWardrobeId).select('userId');
      if (wDoc && wDoc.userId) {
        targetOwnerId = wDoc.userId;
      }
    } catch (_) {}

    return this.assertAccess({
      actorId,
      targetOwnerId,
      featureCode: 'WARDROBE',
      action,
    });
  }

  /**
   * Find shared cluster between two users for a specific feature
   */
  async getSharedCluster(userAId, userBId, featureCode = 'WARDROBE') {
    try {
      const result = await this.assertAccess({
        actorId: userAId,
        targetOwnerId: userBId,
        featureCode,
      });
      return result.cluster;
    } catch (_) {
      return null;
    }
  }

  /**
   * Verify an entire cart/batch of clothing items for multi-owner operations (e.g. Laundry or Outfits)
   * Ensures every item belongs to actor OR to a cluster member who shares the required feature.
   */
  async verifyGarmentBatch(actorId, itemIds, featureCode = 'LAUNDRY', clusterId = null) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      throw new ApiError(400, 'itemIds must be a non-empty array');
    }

    const validIds = itemIds.filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
    if (validIds.length !== itemIds.length) {
      throw new ApiError(400, 'One or more wardrobe item IDs are invalid');
    }

    const items = await WardrobeItem.find({
      _id: { $in: validIds },
    }).lean();

    if (items.length !== itemIds.length) {
      const foundIds = new Set(items.map((i) => i._id.toString()));
      const missing = itemIds.filter((id) => !foundIds.has(String(id)));
      throw new ApiError(404, `Wardrobe items not found: ${missing.join(', ')}`);
    }

    const actorStr = actorId.toString();
    const foreignOwnerIds = new Set();
    const itemsByOwner = new Map();

    for (const item of items) {
      const ownerStr = item.userId.toString();
      if (!itemsByOwner.has(ownerStr)) {
        itemsByOwner.set(ownerStr, []);
      }
      itemsByOwner.get(ownerStr).push(item);

      if (ownerStr !== actorStr) {
        foreignOwnerIds.add(ownerStr);
      }
    }

    // Verify all foreign owners share a cluster with the actor for this feature
    for (const foreignOwnerId of foreignOwnerIds) {
      await this.assertAccess({
        actorId,
        targetOwnerId: foreignOwnerId,
        featureCode,
        clusterId,
        action: 'ACT_ON_BEHALF',
      });
    }

    // Fetch user details for all unique owners for metadata snapshotting
    const allOwnerIds = Array.from(itemsByOwner.keys());
    const users = await User.find({ _id: { $in: allOwnerIds } })
      .select('name phone profileImage')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return {
      items,
      itemsByOwner,
      userMap,
      isMultiOwner: foreignOwnerIds.size > 0,
    };
  }

  /**
   * Get full overview of all member wardrobes inside a specific cluster
   */
  async getClusterWardrobesOverview(clusterId, actorId) {
    const cluster = await Cluster.findById(clusterId)
      .populate('features', 'name code icon isActive')
      .populate('members.userId', 'name phone profileImage status')
      .lean();

    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    // Verify actor membership
    const actorStr = actorId.toString();
    const isMember =
      (cluster.creatorId && cluster.creatorId.toString() === actorStr) ||
      (cluster.members || []).some(
        (m) => m.userId && (m.userId._id || m.userId).toString() === actorStr && m.status === 'ACTIVE'
      );

    if (!isMember) {
      throw new ApiError(403, 'You do not have access to this cluster');
    }

    // Check if WARDROBE feature is enabled for this cluster
    const hasWardrobeFeature = (cluster.features || []).some(
      (f) => (f.code || '').toUpperCase() === 'WARDROBE' && f.isActive !== false
    );

    if (!hasWardrobeFeature) {
      return {
        clusterId: cluster._id,
        clusterName: cluster.name,
        featureEnabled: false,
        message: 'Wardrobe sharing is not enabled for this cluster',
        members: [],
      };
    }

    // Extract active members and ensure creator is included
    const activeMembers = (cluster.members || []).filter(
      (m) => m.userId && m.status === 'ACTIVE'
    );

    const memberUserIds = activeMembers.map((m) => (m.userId._id || m.userId).toString());
    const creatorIdStr = cluster.creatorId ? cluster.creatorId.toString() : null;
    const isCreatorInMembers = creatorIdStr && memberUserIds.includes(creatorIdStr);

    const allParticipantIds = [...new Set(isCreatorInMembers ? memberUserIds : (creatorIdStr ? [creatorIdStr, ...memberUserIds] : memberUserIds))];

    // Fetch all active wardrobes for these members
    const wardrobes = await Wardrobe.find({
      userId: { $in: allParticipantIds.map((id) => new mongoose.Types.ObjectId(id)) },
      isActive: true,
      isDeleted: false,
    })
      .populate('storeTypeId', 'name code image')
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    // Dynamically aggregate item counts per wardrobe
    const wardrobeIds = wardrobes.map((w) => w._id);
    let itemCounts = [];
    try {
      itemCounts = await WardrobeItem.aggregate([
        { $match: { wardrobeId: { $in: wardrobeIds } } },
        { $group: { _id: '$wardrobeId', count: { $sum: 1 } } },
      ]);
    } catch (_) {}

    const countMap = new Map(itemCounts.map((r) => [r._id.toString(), r.count]));

    // Group wardrobes by member
    const wardrobesByMember = new Map();
    for (const w of wardrobes) {
      const uStr = w.userId.toString();
      if (!wardrobesByMember.has(uStr)) {
        wardrobesByMember.set(uStr, []);
      }
      wardrobesByMember.get(uStr).push({
        _id: w._id,
        name: w.name,
        type: w.type || 'PERSONAL',
        ownerName: w.ownerName || '',
        storeType: w.storeTypeId ? { name: w.storeTypeId.name, code: w.storeTypeId.code } : null,
        coverImage: w.coverImage ? formatUploadUrl(w.coverImage) : '',
        ownerFaceImage: w.ownerFaceImage ? formatUploadUrl(w.ownerFaceImage) : '',
        itemCount: countMap.get(w._id.toString()) || 0,
        isDefault: !!w.isDefault,
        createdAt: w.createdAt,
      });
    }

    // Build structured member roster with wardrobes
    const membersData = activeMembers.map((m) => {
      const uDoc = m.userId;
      const uIdStr = (uDoc._id || uDoc).toString();
      const memberWardrobes = wardrobesByMember.get(uIdStr) || [];
      const totalItems = memberWardrobes.reduce((sum, w) => sum + (w.itemCount || 0), 0);

      return {
        memberId: m._id,
        userId: uIdStr,
        name: m.displayName || (uDoc.name ? uDoc.name : 'Cluster Member'),
        phone: m.phone || (uDoc.phone ? uDoc.phone : ''),
        avatar: uDoc.profileImage ? formatUploadUrl(uDoc.profileImage) : '',
        role: m.role || 'MEMBER',
        isMe: uIdStr === actorStr,
        wardrobeCount: memberWardrobes.length,
        totalItems,
        wardrobes: memberWardrobes,
      };
    });

    if (!isCreatorInMembers && creatorIdStr) {
      const creatorUser = await User.findById(creatorIdStr).select('name phone profileImage').lean();
      const creatorWardrobes = wardrobesByMember.get(creatorIdStr) || [];
      const creatorTotalItems = creatorWardrobes.reduce((sum, w) => sum + (w.itemCount || 0), 0);
      membersData.unshift({
        memberId: cluster.creatorId,
        userId: creatorIdStr,
        name: creatorUser?.name || 'Cluster Creator',
        phone: creatorUser?.phone || '',
        avatar: creatorUser?.profileImage ? formatUploadUrl(creatorUser.profileImage) : '',
        role: 'CREATOR',
        isMe: creatorIdStr === actorStr,
        wardrobeCount: creatorWardrobes.length,
        totalItems: creatorTotalItems,
        wardrobes: creatorWardrobes,
      });
    }

    return {
      clusterId: cluster._id,
      clusterName: cluster.name,
      clusterIcon: cluster.icon || '👥',
      clusterColor: cluster.color || '#6C63FF',
      featureEnabled: true,
      memberCount: membersData.length,
      members: membersData,
    };
  }
}

module.exports = new ClusterAccessService();
