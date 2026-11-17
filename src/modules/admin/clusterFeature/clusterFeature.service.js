const ClusterFeature = require('./clusterFeature.model');
const ApiError = require('../../../utils/apiError');

const DEFAULT_FEATURES = [
  { name: 'Wardrobe', code: 'WARDROBE', icon: '👗', description: 'Wardrobe and clothes sharing' },
  { name: 'Laundry', code: 'LAUNDRY', icon: '🧺', description: 'Laundry work orders' },
  { name: 'Walkie-Talkie', code: 'WALKIE_TALKIE', icon: '📻', description: 'Voice walkie-talkie communication' },
];

class ClusterFeatureService {
  /**
   * Create a new feature (or restore if previously soft-deleted)
   */
  async createFeature(data) {
    const { name, code, icon, description, isActive } = data;
    const resolvedCode = (code || name)
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_');

    // Check if soft-deleted feature exists with same code or name -> restore it
    const existingDeleted = await ClusterFeature.findOne({
      $or: [{ code: resolvedCode }, { name: name.trim() }],
      isDeleted: true,
    });

    if (existingDeleted) {
      existingDeleted.name = name.trim();
      existingDeleted.code = resolvedCode;
      if (icon !== undefined) existingDeleted.icon = icon;
      if (description !== undefined) existingDeleted.description = description;
      existingDeleted.isActive = isActive !== undefined ? isActive : true;
      existingDeleted.isDeleted = false;
      existingDeleted.deletedAt = null;
      await existingDeleted.save();
      return existingDeleted;
    }

    // Check active record
    const exists = await ClusterFeature.findOne({
      $or: [{ code: resolvedCode }, { name: name.trim() }],
      isDeleted: false,
    });

    if (exists) {
      throw new ApiError(400, `Feature "${name}" or code "${resolvedCode}" already exists`);
    }

    return await ClusterFeature.create({
      name: name.trim(),
      code: resolvedCode,
      icon: icon || '✨',
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
      isDeleted: false,
      deletedAt: null,
    });
  }

  /**
   * Get all features (excludes soft-deleted by default)
   */
  async getAllFeatures(query = {}) {
    const filter = {};

    if (query.includeDeleted !== 'true') {
      filter.isDeleted = false;
    }

    if (query.includeInactive !== 'true') {
      filter.isActive = true;
    }

    return await ClusterFeature.find(filter).sort({ createdAt: 1 });
  }

  /**
   * Get feature by ID or Code
   */
  async getFeatureById(id, includeDeleted = false) {
    const filter = {
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { code: String(id).toUpperCase() },
      ],
    };

    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    const feature = await ClusterFeature.findOne(filter);
    if (!feature) {
      throw new ApiError(404, 'Cluster feature not found');
    }
    return feature;
  }

  /**
   * Update feature
   */
  async updateFeature(id, data) {
    if (data.code) {
      data.code = String(data.code).toUpperCase().trim().replace(/[^A-Z0-9]+/g, '_');
    }

    const feature = await ClusterFeature.findOneAndUpdate(
      { _id: id, isDeleted: false },
      data,
      { new: true, runValidators: true }
    );

    if (!feature) {
      throw new ApiError(404, 'Cluster feature not found or is deleted');
    }
    return feature;
  }

  /**
   * Delete feature (Soft delete by default, hard delete if hard=true)
   */
  async deleteFeature(id, hard = false) {
    if (hard) {
      const deleted = await ClusterFeature.findByIdAndDelete(id);
      if (!deleted) throw new ApiError(404, 'Cluster feature not found');
      return { deleted: true, hard: true, id };
    }

    const feature = await ClusterFeature.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), isActive: false },
      { new: true }
    );

    if (!feature) {
      throw new ApiError(404, 'Cluster feature not found or already deleted');
    }

    return { deleted: true, hard: false, id: feature._id };
  }

  /**
   * Restore a soft-deleted feature
   */
  async restoreFeature(id) {
    const feature = await ClusterFeature.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { isDeleted: false, deletedAt: null, isActive: true },
      { new: true }
    );

    if (!feature) {
      throw new ApiError(404, 'Soft-deleted cluster feature not found');
    }

    return feature;
  }

  /**
   * Seed default features
   */
  async seedDefaultFeatures() {
    const results = [];
    for (const item of DEFAULT_FEATURES) {
      const existing = await ClusterFeature.findOne({ code: item.code });
      if (!existing) {
        const created = await ClusterFeature.create(item);
        results.push(created);
      } else if (existing.isDeleted) {
        existing.isDeleted = false;
        existing.deletedAt = null;
        existing.isActive = true;
        await existing.save();
        results.push(existing);
      } else {
        results.push(existing);
      }
    }
    return results;
  }
}

module.exports = new ClusterFeatureService();
