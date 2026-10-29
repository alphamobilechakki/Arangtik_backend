const mongoose = require('mongoose');
const StoreType = require('./storeType.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');

// Helper to escape regex special characters
const escapeRegex = (string = '') => string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

class StoreTypeService {
  /**
   * Helper to resolve a StoreType by ID or code (defaults to active non-deleted)
   */
  async resolveStoreType(identifier, options = {}) {
    if (!identifier) {
      throw new ApiError(400, 'Store type identifier is required');
    }

    const trimmed = String(identifier).trim();
    const { includeDeleted = false } = options;

    let storeType = null;

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      const q = StoreType.findById(trimmed);
      if (includeDeleted) q.withDeleted();
      storeType = await q;
    }

    if (!storeType) {
      const q = StoreType.findOne({
        $or: [
          { code: trimmed.toUpperCase() },
          { name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') } },
        ],
      });
      if (includeDeleted) q.withDeleted();
      storeType = await q;
    }

    if (!storeType) {
      throw new ApiError(404, `Store type "${trimmed}" not found`);
    }

    return storeType;
  }

  /**
   * 1. Create a new StoreType (name, code, image, isActive)
   * If a soft-deleted record exists with the same name/code, it restores and updates it.
   */
  async createStoreType(payload = {}, file = null) {
    const { name, code, image, isActive } = payload;

    if (!name || !String(name).trim()) {
      throw new ApiError(400, 'Store type name is required');
    }

    const trimmedName = String(name).trim();
    const resolvedCode = (code && String(code).trim())
      ? String(code).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      : trimmedName
          .toUpperCase()
          .trim()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');

    // Check for active, non-deleted existing record by code or name
    const existing = await StoreType.findOne({
      $or: [
        { code: resolvedCode },
        { name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') } },
      ],
    });

    if (existing) {
      if (existing.code === resolvedCode) {
        throw new ApiError(409, `Store type with code "${resolvedCode}" already exists`);
      }
      throw new ApiError(409, `Store type with name "${trimmedName}" already exists`);
    }

    let finalImage = (file && (file.url || file.dbUrl)) || image || '';
    if (finalImage) {
      finalImage = formatUploadUrl(finalImage);
    }

    // Check if a soft-deleted record exists that can be safely revived
    const softDeleted = await StoreType.findOne({
      isDeleted: true,
      $or: [
        { code: resolvedCode },
        { name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') } },
      ],
    });

    if (softDeleted) {
      softDeleted.name = trimmedName;
      softDeleted.code = resolvedCode;
      if (finalImage) softDeleted.image = finalImage;
      softDeleted.isActive = isActive !== undefined ? Boolean(isActive) : true;
      softDeleted.isDeleted = false;
      softDeleted.deletedAt = null;
      await softDeleted.save();
      return softDeleted;
    }

    const storeType = await StoreType.create({
      name: trimmedName,
      code: resolvedCode,
      image: finalImage,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isDeleted: false,
      deletedAt: null,
    });

    return storeType;
  }

  /**
   * 2. Get all store types with optional filters
   */
  async getAllStoreTypes(options = {}) {
    const { includeInactive = false, includeDeleted = false, search } = options;

    const filter = {};
    if (!includeInactive) {
      filter.isActive = true;
    }

    if (search && String(search).trim()) {
      const q = escapeRegex(String(search).trim());
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
      ];
    }

    let query = StoreType.find(filter).sort({ name: 1, createdAt: 1 });
    if (includeDeleted) {
      query = query.withDeleted();
    }

    return query;
  }

  /**
   * 3. Get single StoreType by ID or code
   */
  async getStoreTypeById(id, options = {}) {
    return this.resolveStoreType(id, options);
  }

  /**
   * 4. Update StoreType (Strictly PATCH: name, code, image, isActive)
   */
  async updateStoreType(id, payload = {}, file = null) {
    const storeType = await this.resolveStoreType(id);
    const { name, code, image, isActive } = payload;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) throw new ApiError(400, 'Store type name cannot be empty');

      // Check unique name across other active records
      const duplicate = await StoreType.findOne({
        _id: { $ne: storeType._id },
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
      });
      if (duplicate) throw new ApiError(409, `Another store type with name "${trimmedName}" already exists`);
      storeType.name = trimmedName;

      // If code was not explicitly provided, update code derived from new name
      if (!code) {
        storeType.code = trimmedName
          .toUpperCase()
          .trim()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
      }
    }

    if (code !== undefined) {
      const trimmedCode = String(code).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (trimmedCode) {
        const duplicateCode = await StoreType.findOne({
          _id: { $ne: storeType._id },
          code: trimmedCode,
        });
        if (duplicateCode) throw new ApiError(409, `Another store type with code "${trimmedCode}" already exists`);
        storeType.code = trimmedCode;
      }
    }

    let finalImage = (file && (file.url || file.dbUrl)) || image;
    if (finalImage !== undefined) {
      storeType.image = finalImage ? formatUploadUrl(finalImage) : '';
    }

    if (isActive !== undefined) {
      storeType.isActive = Boolean(isActive);
    }

    await storeType.save();
    return storeType;
  }

  /**
   * 5. Toggle StoreType active status
   */
  async toggleStoreTypeStatus(id, isActive) {
    const storeType = await this.resolveStoreType(id);

    const nextState = typeof isActive === 'boolean' ? isActive : !storeType.isActive;
    storeType.isActive = nextState;
    await storeType.save();
    return storeType;
  }

  /**
   * 6. Delete StoreType (Soft delete by default, permanent hard delete optional)
   */
  async deleteStoreType(id, options = {}) {
    const storeType = await this.resolveStoreType(id);

    // Prevent deletion if linked to any Category
    const Category = require('../../category/category.model');
    if (Category) {
      const inUseCategory = await Category.findOne({
        $or: [{ storeTypeIds: storeType._id }, { storeTypes: storeType.code }],
      });

      if (inUseCategory) {
        throw new ApiError(
          400,
          `Cannot delete StoreType "${storeType.name}" because it is currently linked to category "${inUseCategory.name}"`
        );
      }
    }

    // Prevent deletion if linked to any Wardrobe / Container
    try {
      const Wardrobe = require('../../wardrobe/wardrobe.model');
      if (Wardrobe) {
        const inUseWardrobe = await Wardrobe.findOne({
          $or: [{ storeTypeId: storeType._id }, { storeType: storeType.code }],
        });
        if (inUseWardrobe) {
          throw new ApiError(
            400,
            `Cannot delete StoreType "${storeType.name}" because it is currently linked to existing container "${inUseWardrobe.name}"`
          );
        }
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }

    const { hard = false } = options;
    if (hard) {
      await StoreType.findByIdAndDelete(storeType._id);
      return { message: `StoreType "${storeType.name}" permanently deleted` };
    }

    // Soft deletion
    await storeType.softDelete();
    return { message: `StoreType "${storeType.name}" soft deleted successfully` };
  }

  /**
   * 7. Restore a soft-deleted StoreType
   */
  async restoreStoreType(id) {
    const storeType = await this.resolveStoreType(id, { includeDeleted: true });

    if (!storeType.isDeleted) {
      return storeType;
    }

    // Check if another active record took its code or name while it was deleted
    const conflict = await StoreType.findOne({
      _id: { $ne: storeType._id },
      $or: [
        { code: storeType.code },
        { name: { $regex: new RegExp(`^${escapeRegex(storeType.name)}$`, 'i') } },
      ],
    });

    if (conflict) {
      throw new ApiError(
        409,
        `Cannot restore StoreType "${storeType.name}" because an active store type with the same name or code already exists`
      );
    }

    await storeType.restore();
    return storeType;
  }
}

const storeTypeService = new StoreTypeService();
module.exports = storeTypeService;
