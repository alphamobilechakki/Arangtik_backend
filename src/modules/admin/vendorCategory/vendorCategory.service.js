const VendorCategory = require('./vendorCategory.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');

const DEFAULT_CATEGORIES = [
  { name: 'Dhobi', icon: '🧺', description: 'Laundry, Dry Cleaning & Garment Care', sortOrder: 1 },
  { name: 'Doodh Wala', icon: '🥛', description: 'Fresh Milk & Dairy Delivery', sortOrder: 2 },
  { name: 'Press / Ironing', icon: '👔', description: 'Clothes Pressing & Fold Delivery', sortOrder: 3 },
  { name: 'Tailor', icon: '✂️', description: 'Stitching & Garment Alteration', sortOrder: 4 },
];

class VendorCategoryService {
  /**
   * Seed default categories into the database if missing
   */
  async seedDefaultsIfEmpty() {
    for (const cat of DEFAULT_CATEGORIES) {
      try {
        const exists = await VendorCategory.findOne({
          name: { $regex: new RegExp(`^${cat.name}$`, 'i') },
        });
        if (!exists) {
          await VendorCategory.create(cat);
        }
      } catch (err) {
        // Ignore duplicate race conditions
      }
    }
  }

  /**
   * Create a new vendor category
   */
  async createCategory(payload = {}, file = null) {
    const { name, code, icon, image, imageUrl, description, sortOrder, isActive } = payload;

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

    const category = await VendorCategory.create({
      name: trimmedName,
      code: code ? String(code).trim().toUpperCase() : undefined,
      icon: icon ? String(icon).trim() : '🧺',
      image: finalImageUrl,
      imageUrl: finalImageUrl,
      description: description ? String(description).trim() : '',
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return category;
  }

  /**
   * Get all categories with optional inactive filter
   */
  async getAllCategories(options = {}) {
    const { includeInactive = false } = options;

    // Ensure defaults exist if collection is empty
    await this.seedDefaultsIfEmpty();

    const query = includeInactive ? {} : { isActive: true };
    const categories = await VendorCategory.find(query).sort({ sortOrder: 1, name: 1, createdAt: 1 });
    return categories.map((cat) => {
      const doc = cat.toObject ? cat.toObject() : { ...cat };
      if (doc.imageUrl) doc.imageUrl = formatUploadUrl(doc.imageUrl);
      if (doc.image) doc.image = formatUploadUrl(doc.image);
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
    if (doc.imageUrl) doc.imageUrl = formatUploadUrl(doc.imageUrl);
    if (doc.image) doc.image = formatUploadUrl(doc.image);
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

    if (updateData.name && updateData.name.trim()) {
      const trimmedName = updateData.name.trim();
      // Check if duplicate with another category
      const existing = await VendorCategory.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      });
      if (existing) {
        throw new ApiError(409, `Another category with name "${trimmedName}" already exists`);
      }
      category.name = trimmedName;
      if (!updateData.code) {
        category.code = trimmedName
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
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

    await category.save();
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
