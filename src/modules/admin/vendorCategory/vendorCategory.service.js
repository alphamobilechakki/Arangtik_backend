const VendorCategory = require('./vendorCategory.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');
const Order = require('../../order/order.model');
const RegisteredVendor = require('../../vendor/registeredVendor.model');

class VendorCategoryService {
  /**
   * Create a new vendor category
   */
  async createCategory(payload = {}, file = null) {
    const {
      name,
      code,
      icon,
      image,
      imageUrl,
      description,
      sortOrder,
      isActive,
      storeTypes,
      storeType,
    } = payload;

    if (!name || !String(name).trim()) {
      throw new ApiError(400, 'Vendor category name is required');
    }

    const trimmedName = String(name).trim();

    // Check for duplicate category name (case-insensitive)
    const existing = await VendorCategory.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      throw new ApiError(409, `Vendor category with name "${trimmedName}" already exists`);
    }

    let finalImageUrl = (file && file.url) || imageUrl || image || '';
    if (finalImageUrl) {
      finalImageUrl = formatUploadUrl(finalImageUrl);
    }

    // Normalize storeTypes (default to ['WARDROBE'])
    const rawStores = storeTypes !== undefined ? storeTypes : storeType;
    let finalStoreTypes = ['WARDROBE'];
    if (rawStores !== undefined && rawStores !== null) {
      const list = Array.isArray(rawStores)
        ? rawStores
        : typeof rawStores === 'string'
        ? rawStores.split(',').map((s) => s.trim())
        : [];
      const valid = list
        .map((s) => String(s).trim().toUpperCase())
        .filter((s) => VendorCategory.ALLOWED_STORE_TYPES.includes(s));
      if (valid.length > 0) {
        finalStoreTypes = [...new Set(valid)];
      }
    }

    const category = await VendorCategory.create({
      name: trimmedName,
      code: code ? String(code).trim().toUpperCase() : undefined,
      icon: icon && icon !== '??' && icon !== '?' ? String(icon).trim() : '',
      image: finalImageUrl,
      imageUrl: finalImageUrl,
      description: description ? String(description).trim() : '',
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      storeTypes: finalStoreTypes,
    });

    return category;
  }

  /**
   * Get all categories with optional inactive filter and storage type filtering
   */
  async getAllCategories(options = {}) {
    const { includeInactive = false, storeType, wardrobeId, itemId, itemIds } = options;

    let targetStoreType = storeType ? String(storeType).trim().toUpperCase() : null;

    // 1. Resolve storeType from wardrobeId if provided and targetStoreType not directly provided
    if (!targetStoreType && wardrobeId) {
      try {
        const Wardrobe = require('../../wardrobe/wardrobe.model');
        const wardrobe = await Wardrobe.findById(wardrobeId).select('storeType');
        if (wardrobe && wardrobe.storeType) {
          targetStoreType = String(wardrobe.storeType).trim().toUpperCase();
        }
      } catch (err) {
        // Fallback silently if invalid ObjectId or not found
      }
    }

    // 2. Resolve storeType from itemId or itemIds
    if (!targetStoreType && (itemId || itemIds)) {
      try {
        const WardrobeItem = require('../../wardrobe/wardrobeItem.model');
        const Wardrobe = require('../../wardrobe/wardrobe.model');
        const rawTargetId = itemId || (Array.isArray(itemIds) ? itemIds[0] : String(itemIds).split(',')[0]);
        const targetId = String(rawTargetId).trim();
        if (targetId) {
          const item = await WardrobeItem.findById(targetId).select('wardrobeId');
          if (item && item.wardrobeId) {
            const wardrobe = await Wardrobe.findById(item.wardrobeId).select('storeType');
            if (wardrobe && wardrobe.storeType) {
              targetStoreType = String(wardrobe.storeType).trim().toUpperCase();
            }
          }
        }
      } catch (err) {
        // Fallback silently
      }
    }

    const query = includeInactive ? {} : { isActive: true };

    if (targetStoreType) {
      if (targetStoreType === 'WARDROBE') {
        // For WARDROBE, also match legacy records where storeTypes is empty or undefined
        query.$or = [
          { storeTypes: 'WARDROBE' },
          { storeTypes: { $exists: false } },
          { storeTypes: { $size: 0 } },
        ];
      } else {
        query.storeTypes = targetStoreType;
      }
    }

    const categories = await VendorCategory.find(query).sort({ sortOrder: 1, name: 1, createdAt: 1 });
    return categories.map((cat) => {
      const doc = cat.toObject ? cat.toObject() : { ...cat };
      if (!doc.storeTypes || doc.storeTypes.length === 0) {
        doc.storeTypes = ['WARDROBE'];
      }
      if (doc.imageUrl) doc.imageUrl = formatUploadUrl(doc.imageUrl);
      if (doc.image) doc.image = formatUploadUrl(doc.image);
      const finalImg = doc.imageUrl || doc.image;
      if (finalImg) {
        doc.imageUrl = finalImg;
        doc.image = finalImg;
      }
      if (doc.icon === '??' || doc.icon === '?') {
        doc.icon = '';
      }
      doc.services = (doc.services || [])
        .filter((s) => s.isActive)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return doc;
    });
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(id) {
    if (!id) {
      throw new ApiError(400, 'Vendor category ID is required');
    }

    const category = await VendorCategory.findById(id);
    if (!category) {
      throw new ApiError(404, 'Vendor category not found');
    }

    const doc = category.toObject ? category.toObject() : { ...category };
    if (!doc.storeTypes || doc.storeTypes.length === 0) {
      doc.storeTypes = ['WARDROBE'];
    }
    if (doc.imageUrl) doc.imageUrl = formatUploadUrl(doc.imageUrl);
    if (doc.image) doc.image = formatUploadUrl(doc.image);
    const finalImg = doc.imageUrl || doc.image;
    if (finalImg) {
      doc.imageUrl = finalImg;
      doc.image = finalImg;
    }
    if (doc.icon === '??' || doc.icon === '?') {
      doc.icon = '';
    }

    doc.services = (doc.services || [])
      .filter((s) => s.isActive)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return doc;
  }

  /**
   * Update category by ID (PATCH)
   */
  async updateCategory(id, updateData = {}, file = null) {
    if (!id) {
      throw new ApiError(400, 'Vendor category ID is required');
    }

    const category = await VendorCategory.findById(id);
    if (!category) {
      throw new ApiError(404, 'Vendor category not found');
    }

    const oldName = category.name;
    let nameChanged = false;

    if (updateData.name && updateData.name.trim()) {
      const trimmedName = updateData.name.trim();
      if (trimmedName.toLowerCase() !== oldName.toLowerCase()) {
        // Check if duplicate with another category
        const existing = await VendorCategory.findOne({
          _id: { $ne: id },
          name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
        });
        if (existing) {
          throw new ApiError(409, `Another category with name "${trimmedName}" already exists`);
        }
        category.name = trimmedName;
        nameChanged = true;
        if (!updateData.code) {
          category.code = trimmedName
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        }
      }
    }

    if (updateData.code) category.code = String(updateData.code).trim().toUpperCase();
    if (updateData.icon !== undefined) category.icon = String(updateData.icon).trim();

    if (file && file.url) {
      const formatted = formatUploadUrl(file.url);
      category.image = formatted;
      category.imageUrl = formatted;
    } else if (updateData.imageUrl !== undefined || updateData.image !== undefined) {
      const img = updateData.imageUrl !== undefined ? updateData.imageUrl : updateData.image;
      const formatted = img ? formatUploadUrl(String(img).trim()) : '';
      category.image = formatted;
      category.imageUrl = formatted;
    }

    if (updateData.description !== undefined) category.description = String(updateData.description).trim();
    if (updateData.sortOrder !== undefined) category.sortOrder = Number(updateData.sortOrder);
    if (updateData.isActive !== undefined) category.isActive = Boolean(updateData.isActive);

    if (updateData.storeTypes !== undefined || updateData.storeType !== undefined) {
      const rawStores =
        updateData.storeTypes !== undefined ? updateData.storeTypes : updateData.storeType;
      const list = Array.isArray(rawStores)
        ? rawStores
        : typeof rawStores === 'string'
        ? rawStores.split(',').map((s) => s.trim())
        : [];
      const valid = list
        .map((s) => String(s).trim().toUpperCase())
        .filter((s) => VendorCategory.ALLOWED_STORE_TYPES.includes(s));
      category.storeTypes = valid.length > 0 ? [...new Set(valid)] : ['WARDROBE'];
    }

    await category.save();

    // Cascading Update: When a category name changes, dynamically update all linked Orders and Vendors
    if (nameChanged) {
      const newName = category.name;
      try {
        const regexOld = new RegExp(`^${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

        await Promise.all([
          // 1. Update all Work Orders matching old category name
          Order.updateMany(
            { orderCategory: regexOld },
            { $set: { orderCategory: newName } }
          ),
          // 2. Update primary / single category in RegisteredVendors
          RegisteredVendor.updateMany(
            { category: regexOld },
            { $set: { category: newName } }
          ),
          RegisteredVendor.updateMany(
            { primaryCategory: regexOld },
            { $set: { primaryCategory: newName } }
          ),
          // 3. Update element in categories array if present
          RegisteredVendor.updateMany(
            { categories: regexOld },
            { $set: { 'categories.$[elem]': newName } },
            { arrayFilters: [{ elem: regexOld }] }
          ),
        ]);
      } catch (cascadeErr) {
        console.error(`[VendorCategoryService] Cascade update from "${oldName}" to "${newName}" failed:`, cascadeErr);
      }
    }

    return category;
  }

  /**
   * Delete or deactivate category by ID
   */
  async deleteCategory(id, hard = false) {
    if (!id) {
      throw new ApiError(400, 'Vendor category ID is required');
    }

    const category = await VendorCategory.findById(id);
    if (!category) {
      throw new ApiError(404, 'Vendor category not found');
    }

    if (hard === true || hard === 'true') {
      await VendorCategory.findByIdAndDelete(id);
      return { message: `Vendor category "${category.name}" permanently deleted` };
    }

    // Soft-delete by setting isActive to false
    category.isActive = false;
    await category.save();
    return { message: `Vendor category "${category.name}" deactivated successfully` };
  }
}

module.exports = new VendorCategoryService();
