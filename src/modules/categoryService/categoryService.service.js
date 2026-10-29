const mongoose = require('mongoose');
const CategoryService = require('./categoryService.model');
const Category = require('../category/category.model');
const ApiError = require('../../utils/apiError');
const { formatUploadUrl } = require('../../utils/url.util');

class CategoryServiceService {
  async createService(categoryId, payload = {}, file = null) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }

    const { name, icon, imageUrl, description, basePrice, price, unit, sortOrder, isActive } = payload;
    const trimmedName = String(name).trim();

    const existing = await CategoryService.findOne({
      categoryId: category._id,
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });
    if (existing) {
      throw new ApiError(409, `Service "${trimmedName}" already exists in this category`);
    }

    const finalImage = (file && file.url) || imageUrl;
    const rawPrice = basePrice !== undefined ? basePrice : price;

    const service = await CategoryService.create({
      categoryId: category._id,
      name: trimmedName,
      icon: icon ? String(icon).trim() : undefined,
      imageUrl: finalImage ? formatUploadUrl(finalImage) : undefined,
      description: description ? String(description).trim() : undefined,
      basePrice: rawPrice !== undefined ? Math.max(0, Number(rawPrice)) : 0,
      unit: unit ? String(unit).trim().toUpperCase() : undefined,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return service;
  }

  async getServicesByCategory(categoryId, { includeInactive = false } = {}) {
    let catId = categoryId;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      const cat = await Category.findOne({ name: { $regex: new RegExp(`^${categoryId}$`, 'i') } });
      if (!cat) throw new ApiError(404, `Category "${categoryId}" not found`);
      catId = cat._id;
    }

    const query = { categoryId: catId };
    if (!includeInactive) query.isActive = true;

    return CategoryService.find(query).sort({ sortOrder: 1, name: 1 });
  }

  async getAllServices({ categoryId, includeInactive = false } = {}) {
    const query = {};
    if (categoryId) query.categoryId = categoryId;
    if (!includeInactive) query.isActive = true;

    return CategoryService.find(query)
      .populate('categoryId', 'name icon imageUrl')
      .sort({ sortOrder: 1, name: 1 });
  }

  async getServiceById(id) {
    const service = await CategoryService.findById(id).populate('categoryId', 'name icon imageUrl');
    if (!service) throw new ApiError(404, 'Service not found');
    return service;
  }

  async updateService(id, payload = {}, file = null) {
    const service = await CategoryService.findById(id);
    if (!service) throw new ApiError(404, 'Service not found');

    const { name, icon, imageUrl, description, basePrice, price, unit, sortOrder, isActive } = payload;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      const existing = await CategoryService.findOne({
        categoryId: service.categoryId,
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
        _id: { $ne: id },
      });
      if (existing) {
        throw new ApiError(409, `Another service with name "${trimmedName}" already exists in this category`);
      }
      service.name = trimmedName;
    }

    if (icon !== undefined) service.icon = String(icon).trim();
    const finalImage = (file && file.url) || imageUrl;
    if (finalImage !== undefined) service.imageUrl = finalImage ? formatUploadUrl(finalImage) : '';
    if (description !== undefined) service.description = String(description).trim();
    const rawPrice = basePrice !== undefined ? basePrice : price;
    if (rawPrice !== undefined) service.basePrice = Math.max(0, Number(rawPrice));
    if (unit !== undefined) service.unit = String(unit).trim().toUpperCase();
    if (sortOrder !== undefined) service.sortOrder = Number(sortOrder);
    if (isActive !== undefined) service.isActive = Boolean(isActive);

    await service.save();
    return service;
  }

  async toggleServiceStatus(id, isActive) {
    const service = await CategoryService.findById(id);
    if (!service) throw new ApiError(404, 'Service not found');

    service.isActive = Boolean(isActive);
    await service.save();
    return { id: service._id, name: service.name, isActive: service.isActive };
  }

  async deleteService(id, hard = false) {
    const service = await CategoryService.findById(id);
    if (!service) throw new ApiError(404, 'Service not found');

    if (hard === true || hard === 'true') {
      await CategoryService.findByIdAndDelete(id);
      return { message: `Service "${service.name}" permanently deleted` };
    }

    await service.softDelete();
    return { message: `Service "${service.name}" soft deleted successfully` };
  }
}

module.exports = new CategoryServiceService();
