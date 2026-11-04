const mongoose = require('mongoose');
const DensityCategory = require('./densityCategory.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');
const { saveBase64Image } = require('../../../middlewares/upload.middleware');

const escapeRegex = (string = '') => string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

class DensityCategoryService {
  /**
   * Create a new density category
   */
  async createDensityCategory(payload = {}, file = null) {
    const { materialType, defaultDensity, densityUnit, image } = payload;
    const trimmedMaterial = String(materialType).trim();

    let finalImage = (file && (file.url || file.dbUrl)) || image || null;
    if (finalImage && typeof finalImage === 'string') {
      if (finalImage.startsWith('data:image')) {
        finalImage = await saveBase64Image(finalImage);
      } else {
        finalImage = formatUploadUrl(finalImage);
      }
    }

    // Check active non-deleted category
    const existing = await DensityCategory.findOne({
      materialType: { $regex: new RegExp(`^${escapeRegex(trimmedMaterial)}$`, 'i') },
    });

    if (existing) {
      throw new ApiError(409, `Density category with material type "${trimmedMaterial}" already exists`);
    }

    // Check if a soft-deleted record exists to revive
    const softDeleted = await DensityCategory.findOne({
      isDeleted: true,
      materialType: { $regex: new RegExp(`^${escapeRegex(trimmedMaterial)}$`, 'i') },
    }).withDeleted();

    if (softDeleted) {
      softDeleted.materialType = trimmedMaterial;
      softDeleted.defaultDensity = Number(defaultDensity);
      softDeleted.densityUnit = densityUnit || 'g/ml';
      if (finalImage !== undefined && finalImage !== null) {
        softDeleted.image = finalImage;
      }
      await softDeleted.restore();
      return softDeleted;
    }

    const category = await DensityCategory.create({
      materialType: trimmedMaterial,
      defaultDensity: Number(defaultDensity),
      densityUnit: densityUnit || 'g/ml',
      image: finalImage,
    });

    return category;
  }

  /**
   * Get all density categories with pagination, optional search and deleted inclusion
   */
  async getAllDensityCategories(query = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      includeDeleted,
      paginate,
      all,
    } = query;

    const filter = {};
    if (search && String(search).trim()) {
      filter.materialType = { $regex: escapeRegex(String(search).trim()), $options: 'i' };
    }

    const Product = mongoose.models.Product || require('../product/product.model');

    // Support returning unpaginated list if requested via paginate=false or all=true
    if (paginate === 'false' || all === 'true') {
      const q = DensityCategory.find(filter).sort({ createdAt: -1 });
      if (includeDeleted === 'true' || includeDeleted === true) {
        q.withDeleted();
      }
      const rawCategories = await q;
      const categoryIds = rawCategories.map((c) => c._id);
      const countMap = {};
      if (categoryIds.length > 0) {
        const counts = await Product.aggregate([
          { $match: { densityCategoryId: { $in: categoryIds } } },
          { $group: { _id: '$densityCategoryId', count: { $sum: 1 } } },
        ]);
        counts.forEach((item) => {
          countMap[item._id.toString()] = item.count;
        });
      }
      return rawCategories.map((cat) => {
        const obj = cat.toObject ? cat.toObject() : { ...cat };
        obj.productCount = countMap[cat._id.toString()] || 0;
        return obj;
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const findQuery = DensityCategory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const countQuery = DensityCategory.countDocuments(filter);

    if (includeDeleted === 'true' || includeDeleted === true) {
      findQuery.withDeleted();
      countQuery.withDeleted();
    }

    const [categories, total] = await Promise.all([
      findQuery,
      countQuery,
    ]);

    const categoryIds = categories.map((c) => c._id);
    const countMap = {};
    if (categoryIds.length > 0) {
      const counts = await Product.aggregate([
        { $match: { densityCategoryId: { $in: categoryIds } } },
        { $group: { _id: '$densityCategoryId', count: { $sum: 1 } } },
      ]);
      counts.forEach((item) => {
        countMap[item._id.toString()] = item.count;
      });
    }

    const categoriesWithCount = categories.map((cat) => {
      const obj = cat.toObject ? cat.toObject() : { ...cat };
      obj.productCount = countMap[cat._id.toString()] || 0;
      return obj;
    });

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      categories: categoriesWithCount,
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
   * Get a single density category by ID
   */
  async getDensityCategoryById(id, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid density category ID');
    }

    const q = DensityCategory.findById(id);
    if (options.includeDeleted) {
      q.withDeleted();
    }

    const category = await q;
    if (!category) {
      throw new ApiError(404, 'Density category not found');
    }

    return category;
  }

  /**
   * Update a density category
   */
  async updateDensityCategory(id, payload = {}, file = null) {
    const category = await this.getDensityCategoryById(id);
    const { materialType, defaultDensity, densityUnit, image } = payload;

    if (materialType !== undefined) {
      const trimmedMaterial = String(materialType).trim();
      const duplicate = await DensityCategory.findOne({
        _id: { $ne: id },
        materialType: { $regex: new RegExp(`^${escapeRegex(trimmedMaterial)}$`, 'i') },
      });

      if (duplicate) {
        throw new ApiError(409, `Density category with material type "${trimmedMaterial}" already exists`);
      }
      category.materialType = trimmedMaterial;
    }

    if (defaultDensity !== undefined) {
      category.defaultDensity = Number(defaultDensity);
    }

    if (densityUnit !== undefined) {
      category.densityUnit = densityUnit;
    }

    const finalImage = (file && (file.url || file.dbUrl)) || image;
    if (finalImage !== undefined) {
      if (!finalImage || finalImage === '' || finalImage === 'null') {
        category.image = null;
      } else if (typeof finalImage === 'string' && finalImage.startsWith('data:image')) {
        category.image = await saveBase64Image(finalImage);
      } else {
        category.image = formatUploadUrl(finalImage);
      }
    }

    await category.save();
    return category;
  }

  /**
   * Delete a density category (soft-delete, prevented if assigned to any products)
   */
  async deleteDensityCategory(id, options = {}) {
    const category = await this.getDensityCategoryById(id);

    // Prevent deletion if products reference this density category
    const Product = mongoose.models.Product || require('../product/product.model');
    const productsCount = await Product.countDocuments({ densityCategoryId: id });
    if (productsCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete density category "${category.materialType}" because it is linked to ${productsCount} product(s)`
      );
    }

    if (options.hard === true || options.hard === 'true') {
      await DensityCategory.findByIdAndDelete(id);
      return { message: 'Density category permanently deleted' };
    }

    await category.softDelete();
    return { message: 'Density category deleted successfully' };
  }
}

module.exports = new DensityCategoryService();
