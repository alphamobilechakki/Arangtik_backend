const mongoose = require('mongoose');
const Category = require('./category.model');
const ApiError = require('../../utils/apiError');
const { formatUploadUrl } = require('../../utils/url.util');

class CategoryService {
  async resolveStoreTypeIds(storeTypes) {
    if (!storeTypes) return undefined;
    const items = Array.isArray(storeTypes)
      ? storeTypes
      : typeof storeTypes === 'string'
      ? storeTypes.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const ids = [];
    const StoreType = mongoose.model('StoreType');
    for (const item of items) {
      if (mongoose.Types.ObjectId.isValid(item)) {
        ids.push(item);
      } else if (typeof item === 'string' && item.trim()) {
        const found = await StoreType.findOne({
          $or: [
            { code: item.trim().toUpperCase() },
            { name: new RegExp(`^${item.trim()}$`, 'i') },
          ],
        });
        if (found) ids.push(found._id);
      }
    }
    return ids;
  }

  async createCategory(payload = {}, file = null) {
    const { name, icon, imageUrl, description, sortOrder, isActive, storeTypes, storeTypeIds } = payload;

    if (!name || !String(name).trim()) {
      throw new ApiError(400, 'Category name is required');
    }

    const trimmedName = String(name).trim();
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });
    if (existing) {
      throw new ApiError(409, `Category with name "${trimmedName}" already exists`);
    }

    const finalImage = (file && file.url) || imageUrl;
    const resolvedStoreTypes = await this.resolveStoreTypeIds(storeTypes || storeTypeIds);

    const category = await Category.create({
      name: trimmedName,
      icon: icon ? String(icon).trim() : undefined,
      imageUrl: finalImage ? formatUploadUrl(finalImage) : undefined,
      description: description ? String(description).trim() : undefined,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      storeTypes: resolvedStoreTypes,
    });

    return category;
  }

  async getAllCategories({ includeInactive = false, storeType } = {}) {
    const query = {};
    if (!includeInactive) query.isActive = true;
    if (storeType) {
      if (mongoose.Types.ObjectId.isValid(storeType)) {
        query.storeTypes = storeType;
      } else {
        const StoreType = mongoose.model('StoreType');
        const found = await StoreType.findOne({
          $or: [
            { code: String(storeType).trim().toUpperCase() },
            { name: new RegExp(`^${String(storeType).trim()}$`, 'i') },
          ],
        });
        if (found) query.storeTypes = found._id;
        else query.storeTypes = storeType;
      }
    }

    return Category.find(query)
      .populate('storeTypes', 'name code image')
      .populate('services')
      .sort({ sortOrder: 1, name: 1 });
  }

  async getCategoryById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Valid Category ID is required');
    }
    const category = await Category.findById(id)
      .populate('storeTypes', 'name code image')
      .populate('services');
    if (!category) throw new ApiError(404, 'Category not found');
    return category;
  }

  async updateCategory(id, payload = {}, file = null) {
    const category = await Category.findById(id);
    if (!category) throw new ApiError(404, 'Category not found');

    const { name, icon, imageUrl, description, sortOrder, isActive, storeTypes, storeTypeIds } = payload;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) throw new ApiError(400, 'Category name cannot be empty');

      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
        _id: { $ne: id },
      });
      if (existing) {
        throw new ApiError(409, `Category with name "${trimmedName}" already exists`);
      }
      category.name = trimmedName;
    }

    if (icon !== undefined) category.icon = String(icon).trim();
    const finalImage = (file && file.url) || imageUrl;
    if (finalImage !== undefined) category.imageUrl = finalImage ? formatUploadUrl(finalImage) : '';
    if (description !== undefined) category.description = String(description).trim();
    if (sortOrder !== undefined) category.sortOrder = Number(sortOrder);
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    const inputStoreTypes = storeTypes !== undefined ? storeTypes : storeTypeIds;
    if (inputStoreTypes !== undefined) {
      category.storeTypes = (await this.resolveStoreTypeIds(inputStoreTypes)) || [];
    }

    await category.save();
    return category;
  }

  async deleteCategory(id, hard = false) {
    const category = await Category.findById(id);
    if (!category) throw new ApiError(404, 'Category not found');

    if (hard === true || hard === 'true') {
      const CategoryService = require('../categoryService/categoryService.model');
      await CategoryService.deleteMany({ categoryId: category._id });
      await Category.findByIdAndDelete(id);
      return { message: `Category "${category.name}" permanently deleted` };
    }

    await category.softDelete();
    return { message: `Category "${category.name}" soft deleted successfully` };
  }

  async getCategoriesByStoreType(storeType) {
    if (!storeType) throw new ApiError(400, 'Store type is required');
    return this.getAllCategories({ storeType });
  }

  async getCategoriesByWardrobe(wardrobeId) {
    if (!mongoose.Types.ObjectId.isValid(wardrobeId)) {
      throw new ApiError(400, 'Valid wardrobe ID is required');
    }
    return this.getAllCategories();
  }
}

module.exports = new CategoryService();
