const mongoose = require('mongoose');
const JewelleryCategory = require('./jewelleryCategory.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');
const { saveBase64Image } = require('../../../middlewares/upload.middleware');

const escapeRegex = (string = '') => string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

class JewelleryCategoryService {
  /**
   * Create a new jewellery category
   */
  async createCategory(payload = {}, file = null) {
    const { name, code, description, icon, isActive } = payload;
    const trimmedName = String(name || '').trim();

    if (!trimmedName) {
      throw new ApiError(400, 'Category name is required');
    }

    const normalizedCode = code
      ? String(code).trim().toUpperCase()
      : trimmedName
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');

    let finalIcon = (file && (file.url || file.dbUrl)) || icon || '';
    if (finalIcon && typeof finalIcon === 'string') {
      if (finalIcon.startsWith('data:image')) {
        finalIcon = await saveBase64Image(finalIcon);
      } else {
        finalIcon = formatUploadUrl(finalIcon);
      }
    }

    // Check active non-deleted category
    const existing = await JewelleryCategory.findOne({
      $or: [
        { code: normalizedCode },
        { name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') } },
      ],
    });

    if (existing) {
      throw new ApiError(409, `Jewellery category "${trimmedName}" or code "${normalizedCode}" already exists`);
    }

    // Check if soft-deleted record exists to revive
    const softDeleted = await JewelleryCategory.findOne({
      isDeleted: true,
      $or: [
        { code: normalizedCode },
        { name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') } },
      ],
    }).withDeleted();

    if (softDeleted) {
      softDeleted.name = trimmedName;
      softDeleted.code = normalizedCode;
      softDeleted.description = description !== undefined ? description : softDeleted.description;
      if (finalIcon) {
        softDeleted.icon = finalIcon;
      }
      softDeleted.isActive = isActive !== undefined ? Boolean(isActive) : true;
      await softDeleted.restore();
      return softDeleted;
    }

    const category = await JewelleryCategory.create({
      name: trimmedName,
      code: normalizedCode,
      description: description || '',
      icon: finalIcon,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return category;
  }

  /**
   * Get all jewellery categories
   */
  async getAllCategories(query = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      includeDeleted,
      isActive,
      paginate,
      all,
    } = query;

    const filter = {};
    if (search && String(search).trim()) {
      const term = escapeRegex(String(search).trim());
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { code: { $regex: term, $options: 'i' } },
      ];
    }

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    // Unpaginated list by default for mobile category discovery dropdowns, unless paginate=true explicitly requested
    if (paginate !== 'true') {
      const q = JewelleryCategory.find(filter).sort({ name: 1 });
      if (includeDeleted === 'true' || includeDeleted === true) {
        q.withDeleted();
      }
      return await q;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const findQuery = JewelleryCategory.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum);

    const countQuery = JewelleryCategory.countDocuments(filter);

    if (includeDeleted === 'true' || includeDeleted === true) {
      findQuery.withDeleted();
      countQuery.withDeleted();
    }

    const [categories, total] = await Promise.all([findQuery, countQuery]);
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      categories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        currentPage: pageNum,
        perPage: limitNum,
        totalRecords: total,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  /**
   * Get a single category by ID or Code
   */
  async getCategoryById(id, options = {}) {
    let q;
    if (mongoose.Types.ObjectId.isValid(id)) {
      q = JewelleryCategory.findById(id);
    } else {
      q = JewelleryCategory.findOne({ code: String(id).toUpperCase().trim() });
    }

    if (options.includeDeleted) {
      q.withDeleted();
    }

    const category = await q;
    if (!category) {
      throw new ApiError(404, 'Jewellery category not found');
    }

    return category;
  }

  /**
   * Update category
   */
  async updateCategory(id, payload = {}, file = null) {
    const category = await this.getCategoryById(id);
    const { name, code, description, icon, isActive } = payload;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        throw new ApiError(400, 'Category name cannot be empty');
      }
      const duplicate = await JewelleryCategory.findOne({
        _id: { $ne: category._id },
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
      });
      if (duplicate) {
        throw new ApiError(409, `Category name "${trimmedName}" already in use`);
      }
      category.name = trimmedName;
    }

    if (code !== undefined) {
      const normalizedCode = String(code).trim().toUpperCase();
      if (!normalizedCode) {
        throw new ApiError(400, 'Category code cannot be empty');
      }
      const duplicateCode = await JewelleryCategory.findOne({
        _id: { $ne: category._id },
        code: normalizedCode,
      });
      if (duplicateCode) {
        throw new ApiError(409, `Category code "${normalizedCode}" already in use`);
      }
      category.code = normalizedCode;
    }

    if (description !== undefined) {
      category.description = String(description).trim();
    }

    if (isActive !== undefined) {
      category.isActive = Boolean(isActive);
    }

    const finalIcon = (file && (file.url || file.dbUrl)) || icon;
    if (finalIcon !== undefined) {
      if (!finalIcon || finalIcon === '' || finalIcon === 'null') {
        category.icon = '';
      } else if (typeof finalIcon === 'string' && finalIcon.startsWith('data:image')) {
        category.icon = await saveBase64Image(finalIcon);
      } else {
        category.icon = formatUploadUrl(finalIcon);
      }
    }

    await category.save();
    return category;
  }

  /**
   * Soft-delete category
   */
  async deleteCategory(id, options = {}) {
    const category = await this.getCategoryById(id);

    // Check if any Jewellery document is linked to this category
    const Jewellery = mongoose.models.Jewellery;
    if (Jewellery) {
      const linkedCount = await Jewellery.countDocuments({ jewelleryCategory: category._id });
      if (linkedCount > 0) {
        throw new ApiError(
          400,
          `Cannot delete jewellery category "${category.name}" because it is linked to ${linkedCount} jewellery item(s)`
        );
      }
    }

    if (options.hard === true || options.hard === 'true') {
      await JewelleryCategory.findByIdAndDelete(category._id);
      return { message: 'Jewellery category permanently deleted' };
    }

    await category.softDelete();
    return { message: 'Jewellery category deleted successfully' };
  }
}

module.exports = new JewelleryCategoryService();
