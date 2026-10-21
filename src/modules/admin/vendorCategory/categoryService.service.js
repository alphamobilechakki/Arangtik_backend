const mongoose = require('mongoose');
const VendorCategory = require('./vendorCategory.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');

class CategoryServiceService {
  /**
   * Helper to resolve a VendorCategory by ID, code, or name
   */
  async resolveCategory(identifier) {
    if (!identifier) {
      throw new ApiError(400, 'Category identifier is required');
    }

    const trimmed = String(identifier).trim();
    let category = null;

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      category = await VendorCategory.findById(trimmed);
    }

    if (!category) {
      category = await VendorCategory.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${trimmed}$`, 'i') } },
          { code: trimmed.toUpperCase() },
        ],
      });
    }

    if (!category) {
      throw new ApiError(404, `Category "${trimmed}" not found`);
    }

    return category;
  }

  /**
   * 1. Create a new service under a category (Stored in category.services array)
   */
  async createService(categoryIdentifier, payload = {}) {
    const category = await this.resolveCategory(categoryIdentifier);
    const { name, code, description, icon, imageUrl, price, sortOrder, isActive } = payload;

    if (!name || !String(name).trim()) {
      throw new ApiError(400, 'Service name is required');
    }

    const trimmedName = String(name).trim();

    if (!category.services) {
      category.services = [];
    }

    // Check for duplicate service name within this category
    const existing = category.services.find(
      (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      throw new ApiError(
        409,
        `Service "${trimmedName}" already exists in category "${category.name}"`
      );
    }

    let finalImageUrl = imageUrl ? formatUploadUrl(imageUrl) : '';

    const newServiceId = new mongoose.Types.ObjectId();
    const newService = {
      _id: newServiceId,
      name: trimmedName,
      code: code ? String(code).trim().toUpperCase() : undefined,
      description: description ? String(description).trim() : '',
      icon: icon ? String(icon).trim() : '',
      imageUrl: finalImageUrl,
      price: price !== undefined && !isNaN(Number(price)) ? Number(price) : 0,
      sortOrder: sortOrder !== undefined && !isNaN(Number(sortOrder)) ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    };

    category.services.push(newService);
    await category.save();

    const created = category.services.id(newServiceId).toObject();
    return {
      ...created,
      categoryId: category._id,
      categoryName: category.name,
      imageUrl: created.imageUrl ? formatUploadUrl(created.imageUrl) : '',
    };
  }

  /**
   * 2. Get all services for a specific category
   */
  async getServicesByCategory(categoryIdentifier, options = {}) {
    const category = await this.resolveCategory(categoryIdentifier);
    const { includeInactive = false } = options;

    let list = (category.services || []).map((s) => (s.toObject ? s.toObject() : { ...s }));

    if (!includeInactive) {
      list = list.filter((s) => s.isActive);
    }

    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

    return list.map((s) => ({
      ...s,
      categoryId: category._id,
      categoryName: category.name,
      imageUrl: s.imageUrl ? formatUploadUrl(s.imageUrl) : '',
    }));
  }

  /**
   * 3. Get all services across all categories with optional filters
   */
  async getAllServices(options = {}) {
    const { category, includeInactive = false } = options;
    let categories = [];

    if (category && category !== 'ALL') {
      try {
        const resolved = await this.resolveCategory(category);
        categories = [resolved];
      } catch (_) {
        categories = await VendorCategory.find({
          name: { $regex: new RegExp(`^${String(category).trim()}$`, 'i') },
        });
      }
    } else {
      categories = await VendorCategory.find().sort({ sortOrder: 1, name: 1 });
    }

    const all = [];
    for (const cat of categories) {
      const list = cat.services || [];
      for (const s of list) {
        if (!includeInactive && !s.isActive) continue;
        const obj = s.toObject ? s.toObject() : { ...s };
        all.push({
          ...obj,
          categoryId: cat._id,
          categoryName: cat.name,
          imageUrl: obj.imageUrl ? formatUploadUrl(obj.imageUrl) : '',
        });
      }
    }

    return all.sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  }

  /**
   * 4. Get a single service by ID
   */
  async getServiceById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Valid Service ID is required');
    }

    const category = await VendorCategory.findOne({ 'services._id': id });
    if (!category) {
      throw new ApiError(404, 'Category service not found');
    }

    const service = category.services.id(id);
    if (!service) {
      throw new ApiError(404, 'Category service not found');
    }

    const doc = service.toObject();
    return {
      ...doc,
      categoryId: category._id,
      categoryName: category.name,
      imageUrl: doc.imageUrl ? formatUploadUrl(doc.imageUrl) : '',
    };
  }

  /**
   * 5. Partial update of a service inside category.services array
   */
  async updateService(id, payload = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Valid Service ID is required');
    }

    const category = await VendorCategory.findOne({ 'services._id': id });
    if (!category) {
      throw new ApiError(404, 'Category service not found');
    }

    const service = category.services.id(id);
    if (!service) {
      throw new ApiError(404, 'Category service not found');
    }

    const { name, code, description, icon, imageUrl, price, sortOrder, isActive } = payload;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        throw new ApiError(400, 'Service name cannot be empty');
      }

      // Check name uniqueness within the same category
      if (trimmedName.toLowerCase() !== service.name.toLowerCase()) {
        const existing = category.services.find(
          (s) =>
            s.name.toLowerCase() === trimmedName.toLowerCase() &&
            s._id.toString() !== id.toString()
        );

        if (existing) {
          throw new ApiError(
            409,
            `Another service with name "${trimmedName}" already exists in this category`
          );
        }
        service.name = trimmedName;
      }
    }

    if (code !== undefined) {
      service.code = String(code).trim().toUpperCase();
    }
    if (description !== undefined) {
      service.description = String(description).trim();
    }
    if (icon !== undefined) {
      service.icon = String(icon).trim();
    }
    if (imageUrl !== undefined) {
      service.imageUrl = imageUrl ? formatUploadUrl(imageUrl) : '';
    }
    if (price !== undefined && !isNaN(Number(price))) {
      service.price = Number(price);
    }
    if (sortOrder !== undefined && !isNaN(Number(sortOrder))) {
      service.sortOrder = Number(sortOrder);
    }
    if (isActive !== undefined) {
      service.isActive = Boolean(isActive);
    }

    await category.save();

    const doc = service.toObject();
    return {
      ...doc,
      categoryId: category._id,
      categoryName: category.name,
      imageUrl: doc.imageUrl ? formatUploadUrl(doc.imageUrl) : '',
    };
  }

  /**
   * 6. Toggle service active / inactive status
   */
  async toggleServiceStatus(id, isActive) {
    if (typeof isActive === 'boolean') {
      return this.updateService(id, { isActive });
    }
    const current = await this.getServiceById(id);
    return this.updateService(id, { isActive: !current.isActive });
  }

  /**
   * 7. Delete a service (Soft or Hard) from category.services array
   */
  async deleteService(id, { hard = false } = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Valid Service ID is required');
    }

    const category = await VendorCategory.findOne({ 'services._id': id });
    if (!category) {
      throw new ApiError(404, 'Category service not found');
    }

    const service = category.services.id(id);
    if (!service) {
      throw new ApiError(404, 'Category service not found');
    }

    if (hard) {
      category.services.pull(id);
      await category.save();
      return { id, deleted: true, hard: true, message: 'Service permanently deleted' };
    }

    service.isActive = false;
    await category.save();
    return { id, deleted: true, hard: false, message: 'Service deactivated successfully' };
  }
}

const categoryServiceService = new CategoryServiceService();
module.exports = categoryServiceService;
