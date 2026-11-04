const mongoose = require('mongoose');
const Product = require('./product.model');
const DensityCategory = require('../densityCategory/densityCategory.model');
const ApiError = require('../../../utils/apiError');

const escapeRegex = (string = '') => string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

const normalizeAliases = (aliases) => {
  if (!aliases) return [];
  if (typeof aliases === 'string') {
    return aliases
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
  }
  if (Array.isArray(aliases)) {
    return aliases
      .map((a) => String(a).trim())
      .filter(Boolean);
  }
  return [];
};

class ProductService {
  /**
   * Create a new product
   */
  async createProduct(payload = {}) {
    const { name, densityCategoryId, densityOverride, aliases } = payload;

    // Verify density category exists
    const category = await DensityCategory.findById(densityCategoryId);
    if (!category) {
      throw new ApiError(404, 'Density category not found');
    }

    let parsedOverride = null;
    if (densityOverride !== undefined && densityOverride !== null && densityOverride !== '') {
      parsedOverride = Number(densityOverride);
    }

    const resolvedAliases = normalizeAliases(aliases);

    const product = await Product.create({
      name: String(name).trim(),
      aliases: resolvedAliases,
      densityCategoryId,
      densityOverride: parsedOverride,
    });

    await product.populate('densityCategoryId', 'materialType defaultDensity densityUnit');
    return product;
  }

  /**
   * Bulk create products
   */
  async createBulkProducts(payload = {}) {
    const { densityCategoryId: defaultCategoryId, products = [] } = payload;

    if (!Array.isArray(products) || products.length === 0) {
      throw new ApiError(400, 'Products array is required and cannot be empty');
    }

    const docsToInsert = [];
    const categoryCache = {};

    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      const name = item.name ? String(item.name).trim() : '';
      if (!name) continue;

      const catId = item.densityCategoryId || defaultCategoryId;
      if (!catId || !mongoose.Types.ObjectId.isValid(catId)) {
        throw new ApiError(400, `Valid density category ID is required for product "${name}" at index ${i}`);
      }

      if (!categoryCache[catId]) {
        const cat = await DensityCategory.findById(catId);
        if (!cat) {
          throw new ApiError(404, `Density category not found for product "${name}"`);
        }
        categoryCache[catId] = cat;
      }

      let parsedOverride = null;
      if (item.densityOverride !== undefined && item.densityOverride !== null && item.densityOverride !== '') {
        const num = Number(item.densityOverride);
        if (!isNaN(num) && num >= 0) {
          parsedOverride = num;
        }
      }

      docsToInsert.push({
        name,
        aliases: normalizeAliases(item.aliases),
        densityCategoryId: catId,
        densityOverride: parsedOverride,
      });
    }

    if (docsToInsert.length === 0) {
      throw new ApiError(400, 'No valid products provided to create');
    }

    const created = await Product.insertMany(docsToInsert);
    return {
      count: created.length,
      products: created,
    };
  }

  /**
   * Get all products with optional search (by name or alias) and category filters
   */
  async getAllProducts(query = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      densityCategoryId,
      paginate,
      all,
    } = query;

    const filter = {};

    if (search && String(search).trim()) {
      const searchRegex = { $regex: escapeRegex(String(search).trim()), $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { aliases: searchRegex },
      ];
    }

    if (densityCategoryId && mongoose.Types.ObjectId.isValid(densityCategoryId)) {
      filter.densityCategoryId = densityCategoryId;
    }

    // Support returning unpaginated list if requested via paginate=false or all=true
    if (paginate === 'false' || all === 'true') {
      return await Product.find(filter)
        .populate('densityCategoryId', 'materialType defaultDensity densityUnit')
        .sort({ createdAt: -1 });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('densityCategoryId', 'materialType defaultDensity densityUnit')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      products,
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
   * Get a single product by ID
   */
  async getProductById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid product ID');
    }

    const product = await Product.findById(id).populate(
      'densityCategoryId',
      'materialType defaultDensity densityUnit'
    );

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    return product;
  }

  /**
   * Update a product
   */
  async updateProduct(id, payload = {}) {
    const product = await this.getProductById(id);
    const { name, densityCategoryId, densityOverride, aliases } = payload;

    if (densityCategoryId !== undefined) {
      const category = await DensityCategory.findById(densityCategoryId);
      if (!category) {
        throw new ApiError(404, 'Density category not found');
      }
      product.densityCategoryId = densityCategoryId;
    }

    if (name !== undefined) {
      product.name = String(name).trim();
    }

    if (aliases !== undefined) {
      product.aliases = normalizeAliases(aliases);
    }

    if (densityOverride !== undefined) {
      product.densityOverride =
        densityOverride !== null && densityOverride !== '' ? Number(densityOverride) : null;
    }

    await product.save();
    await product.populate('densityCategoryId', 'materialType defaultDensity densityUnit');
    return product;
  }

  /**
   * Delete a product
   */
  async deleteProduct(id) {
    await this.getProductById(id);
    await Product.findByIdAndDelete(id);
    return { message: 'Product deleted successfully' };
  }
}

module.exports = new ProductService();
