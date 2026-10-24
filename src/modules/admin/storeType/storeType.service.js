const mongoose = require('mongoose');
const StoreType = require('./storeType.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');

class StoreTypeService {
  /**
   * Helper to resolve a StoreType by ID or code
   */
  async resolveStoreType(identifier) {
    if (!identifier) {
      throw new ApiError(400, 'Store type identifier is required');
    }

    const trimmed = String(identifier).trim();
    let storeType = null;

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      storeType = await StoreType.findById(trimmed);
    }

    if (!storeType) {
      storeType = await StoreType.findOne({
        $or: [
          { code: trimmed.toUpperCase() },
          { name: { $regex: new RegExp(`^${trimmed}$`, 'i') } },
        ],
      });
    }

    if (!storeType) {
      throw new ApiError(404, `Store type "${trimmed}" not found`);
    }

    return storeType;
  }

  /**
   * 1. Create a new StoreType (name, image)
   */
  async createStoreType(payload = {}, file = null) {
    const { name, image, imageUrl } = payload;

    if (!name || !String(name).trim()) {
      throw new ApiError(400, 'Store type name is required');
    }

    const trimmedName = String(name).trim();
    const resolvedCode = trimmedName
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    // Check for existing by code or name
    const existing = await StoreType.findOne({
      $or: [{ code: resolvedCode }, { name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } }],
    });

    if (existing) {
      throw new ApiError(409, `Store type with name "${trimmedName}" already exists`);
    }

    let finalImageUrl = (file && file.url) || imageUrl || image || '';
    if (finalImageUrl) {
      finalImageUrl = formatUploadUrl(finalImageUrl);
    }

    const storeType = await StoreType.create({
      name: trimmedName,
      code: resolvedCode,
      image: finalImageUrl,
      imageUrl: finalImageUrl,
      isActive: true,
    });

    return storeType;
  }

  /**
   * 2. Get all store types with optional filters
   */
  async getAllStoreTypes(options = {}) {
    const { includeInactive = false, search } = options;

    const query = includeInactive ? {} : { isActive: true };

    if (search && String(search).trim()) {
      const q = String(search).trim();
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
      ];
    }

    return StoreType.find(query).sort({ name: 1, createdAt: 1 });
  }

  /**
   * 3. Get single StoreType by ID or code
   */
  async getStoreTypeById(id) {
    return this.resolveStoreType(id);
  }

  /**
   * 4. Update StoreType (Strictly PATCH per Arangtik Rule 4: name, image)
   */
  async updateStoreType(id, payload = {}, file = null) {
    const storeType = await this.resolveStoreType(id);
    const { name, image, imageUrl, isActive } = payload;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) throw new ApiError(400, 'Store type name cannot be empty');

      // Check unique name
      const duplicate = await StoreType.findOne({
        _id: { $ne: storeType._id },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      });
      if (duplicate) throw new ApiError(409, `Another store type with name "${trimmedName}" already exists`);
      storeType.name = trimmedName;

      storeType.code = trimmedName
        .toUpperCase()
        .trim()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    let finalImageUrl = (file && file.url) || imageUrl || image;
    if (finalImageUrl !== undefined) {
      storeType.imageUrl = finalImageUrl ? formatUploadUrl(finalImageUrl) : '';
      storeType.image = storeType.imageUrl;
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
   * 6. Delete StoreType (Prevent deleting in-use store types)
   */
  async deleteStoreType(id, options = {}) {
    const storeType = await this.resolveStoreType(id);

    const VendorCategory = require('../vendorCategory/vendorCategory.model');
    const inUseCategory = await VendorCategory.findOne({
      $or: [{ storeTypeIds: storeType._id }, { storeTypes: storeType.code }],
    });

    if (inUseCategory) {
      throw new ApiError(
        400,
        `Cannot delete StoreType "${storeType.name}" because it is currently linked to category "${inUseCategory.name}"`
      );
    }

    const { hard = false } = options;
    if (hard) {
      await StoreType.findByIdAndDelete(storeType._id);
      return { message: `StoreType "${storeType.name}" permanently deleted` };
    }

    storeType.isActive = false;
    await storeType.save();
    return { message: `StoreType "${storeType.name}" deactivated successfully` };
  }
}

const storeTypeService = new StoreTypeService();
module.exports = storeTypeService;
