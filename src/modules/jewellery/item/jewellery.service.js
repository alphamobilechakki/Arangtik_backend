const mongoose = require('mongoose');
const Jewellery = require('./jewellery.model');
const JewelleryBox = require('../box/jewelleryBox.model');
const JewelleryCategory = require('../category/jewelleryCategory.model');
const JewellerySet = require('../set/jewellerySet.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');
const { saveBase64Image } = require('../../../middlewares/upload.middleware');

const escapeRegex = (string = '') => string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

class JewelleryService {
  /**
   * Resolve category input (ObjectId or Code)
   */
  async resolveCategory(categoryInput) {
    if (!categoryInput) {
      throw new ApiError(400, 'Jewellery category is required');
    }
    if (mongoose.Types.ObjectId.isValid(categoryInput)) {
      const cat = await JewelleryCategory.findById(categoryInput);
      if (cat) return cat._id;
    }
    // Try resolving by uppercase code or name
    const cat = await JewelleryCategory.findOne({
      $or: [
        { code: String(categoryInput).trim().toUpperCase() },
        { name: { $regex: new RegExp(`^${escapeRegex(String(categoryInput).trim())}$`, 'i') } },
      ],
    });
    if (!cat) {
      throw new ApiError(404, `Jewellery category "${categoryInput}" not found`);
    }
    return cat._id;
  }

  /**
   * Resolve jewellery box (by ID or fallback to user's default box)
   */
  async resolveBox(userId, boxId) {
    if (boxId && mongoose.Types.ObjectId.isValid(boxId)) {
      const box = await JewelleryBox.findOne({ _id: boxId, userId });
      if (!box) {
        throw new ApiError(404, 'Jewellery box not found or unauthorized');
      }
      return box._id;
    }

    // Fallback to user's default box
    let defaultBox = await JewelleryBox.findOne({ userId, isDefault: true });
    if (!defaultBox) {
      defaultBox = await JewelleryBox.findOne({ userId });
    }
    if (!defaultBox) {
      // Auto-create a default box for the user
      defaultBox = await JewelleryBox.create({
        userId,
        name: 'My Jewellery Box',
        isDefault: true,
      });
    }
    return defaultBox._id;
  }

  /**
   * Helper to format an image input (file, base64, or string URL)
   */
  async processImageInput(fileOrUrl) {
    if (!fileOrUrl) return '';
    if (typeof fileOrUrl === 'object' && (fileOrUrl.url || fileOrUrl.dbUrl)) {
      return formatUploadUrl(fileOrUrl.url || fileOrUrl.dbUrl);
    }
    if (typeof fileOrUrl === 'string') {
      if (fileOrUrl.startsWith('data:image')) {
        const saved = await saveBase64Image(fileOrUrl);
        return formatUploadUrl(saved);
      }
      return formatUploadUrl(fileOrUrl);
    }
    return '';
  }

  /**
   * Create a single jewellery piece
   */
  async createItem(userId, payload = {}, files = null) {
    if (!userId) {
      throw new ApiError(401, 'User ID is required');
    }

    const {
      jewelleryBoxId,
      jewelleryCategory,
      setId,
      name,
      type,
      status,
      color,
      gemstone,
      weight,
      brand,
      sourceImageUrl,
      generatedImageUrl,
      processingStatus,
    } = payload;

    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      throw new ApiError(400, 'Jewellery name is required');
    }

    const resolvedBoxId = await this.resolveBox(userId, jewelleryBoxId);
    const resolvedCatId = await this.resolveCategory(jewelleryCategory);

    // Validate setId if provided
    let finalSetId = null;
    if (setId) {
      if (!mongoose.Types.ObjectId.isValid(setId)) {
        throw new ApiError(400, 'Invalid set ID');
      }
      const setDoc = await JewellerySet.findOne({ _id: setId, userId });
      if (!setDoc) {
        throw new ApiError(404, 'Jewellery set not found or unauthorized');
      }
      finalSetId = setDoc._id;
    }

    // Extract images
    let sourceImgUrl = '';
    let generatedImgUrl = '';

    if (files) {
      if (files.sourceImage && files.sourceImage[0]) {
        sourceImgUrl = formatUploadUrl(`/uploads/${files.sourceImage[0].filename}`);
      } else if (files.image && files.image[0]) {
        sourceImgUrl = formatUploadUrl(`/uploads/${files.image[0].filename}`);
      }
      if (files.generatedImage && files.generatedImage[0]) {
        generatedImgUrl = formatUploadUrl(`/uploads/${files.generatedImage[0].filename}`);
      }
    }

    if (!sourceImgUrl && sourceImageUrl) {
      sourceImgUrl = await this.processImageInput(sourceImageUrl);
    }
    if (!generatedImgUrl && generatedImageUrl) {
      generatedImgUrl = await this.processImageInput(generatedImageUrl);
    }

    const item = await Jewellery.create({
      userId,
      jewelleryBoxId: resolvedBoxId,
      jewelleryCategory: resolvedCatId,
      setId: finalSetId,
      name: trimmedName,
      sourceImage: {
        url: sourceImgUrl,
        filename: files?.sourceImage?.[0]?.filename || '',
      },
      generatedImage: {
        url: generatedImgUrl,
        filename: files?.generatedImage?.[0]?.filename || '',
        generatedAt: generatedImgUrl ? new Date() : null,
      },
      type: type || 'GOLD',
      status: status || 'IN_LOCKER',
      color: color || '',
      gemstone: gemstone || '',
      weight: weight !== undefined && weight !== null && weight !== '' ? Number(weight) : null,
      brand: brand || '',
      processingStatus: processingStatus || 'COMPLETED',
      lastModifiedBy: userId,
    });

    return await this.getItemById(userId, item._id);
  }

  /**
   * Create a complete set with multiple pieces from one photo
   */
  async createSetWithItems(userId, payload = {}, file = null) {
    if (!userId) {
      throw new ApiError(401, 'User ID is required');
    }

    const {
      setName,
      jewelleryBoxId,
      sourcePhotoUrl,
      items = [],
    } = payload;

    if (!setName || !String(setName).trim()) {
      throw new ApiError(400, 'Set name is required');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'At least one jewellery item must be provided in the set');
    }

    const resolvedBoxId = await this.resolveBox(userId, jewelleryBoxId);

    let photoUrl = '';
    if (file && (file.url || file.dbUrl)) {
      photoUrl = formatUploadUrl(file.url || file.dbUrl);
    } else if (sourcePhotoUrl) {
      photoUrl = await this.processImageInput(sourcePhotoUrl);
    }

    // 1. Create the JewellerySet
    const set = await JewellerySet.create({
      userId,
      jewelleryBoxId: resolvedBoxId,
      name: String(setName).trim(),
      coverImageUrl: photoUrl,
      sourcePhotoUrl: photoUrl,
    });

    // 2. Create each member jewellery piece
    const createdItems = [];
    for (const itemData of items) {
      const resolvedCatId = await this.resolveCategory(itemData.jewelleryCategory);
      const piece = await Jewellery.create({
        userId,
        jewelleryBoxId: resolvedBoxId,
        jewelleryCategory: resolvedCatId,
        setId: set._id,
        name: itemData.name || `${set.name} Piece`,
        sourceImage: {
          url: itemData.sourceImageUrl ? formatUploadUrl(itemData.sourceImageUrl) : photoUrl,
        },
        generatedImage: {
          url: itemData.generatedImageUrl ? formatUploadUrl(itemData.generatedImageUrl) : '',
          generatedAt: itemData.generatedImageUrl ? new Date() : null,
        },
        type: itemData.type || 'GOLD',
        status: itemData.status || 'IN_LOCKER',
        color: itemData.color || '',
        gemstone: itemData.gemstone || '',
        weight: itemData.weight ? Number(itemData.weight) : null,
        brand: itemData.brand || '',
        processingStatus: itemData.processingStatus || 'COMPLETED',
        lastModifiedBy: userId,
      });
      createdItems.push(piece);
    }

    return {
      set,
      items: createdItems,
    };
  }

  /**
   * Get all jewellery items for user with filtering & pagination
   */
  async getUserItems(userId, query = {}) {
    if (!userId) {
      throw new ApiError(401, 'User ID is required');
    }

    const {
      jewelleryBoxId,
      jewelleryCategory,
      setId,
      type,
      status,
      isFavorite,
      search,
      page = 1,
      limit = 20,
      includeDeleted,
      paginate,
      all,
    } = query;

    const filter = { userId };

    if (jewelleryBoxId && mongoose.Types.ObjectId.isValid(jewelleryBoxId)) {
      filter.jewelleryBoxId = jewelleryBoxId;
    }

    if (jewelleryCategory) {
      if (mongoose.Types.ObjectId.isValid(jewelleryCategory)) {
        filter.jewelleryCategory = jewelleryCategory;
      } else {
        const cat = await JewelleryCategory.findOne({
          code: String(jewelleryCategory).toUpperCase().trim(),
        });
        if (cat) filter.jewelleryCategory = cat._id;
      }
    }

    if (setId) {
      if (setId === 'null' || setId === 'none') {
        filter.setId = null;
      } else if (mongoose.Types.ObjectId.isValid(setId)) {
        filter.setId = setId;
      }
    }

    if (type) {
      filter.type = String(type).toUpperCase().trim();
    }

    if (status) {
      filter.status = String(status).toUpperCase().trim();
    }

    if (isFavorite !== undefined && isFavorite !== '') {
      filter.isFavorite = isFavorite === 'true' || isFavorite === true;
    }

    if (search && String(search).trim()) {
      const term = escapeRegex(String(search).trim());
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { brand: { $regex: term, $options: 'i' } },
        { color: { $regex: term, $options: 'i' } },
        { gemstone: { $regex: term, $options: 'i' } },
      ];
    }

    const populateFields = (q) =>
      q
        .populate('jewelleryCategory', 'name code icon')
        .populate('jewelleryBoxId', 'name type')
        .populate('setId', 'name coverImageUrl');

    if (paginate === 'false' || all === 'true') {
      const q = populateFields(Jewellery.find(filter).sort({ createdAt: -1 }));
      if (includeDeleted === 'true' || includeDeleted === true) {
        q.withDeleted();
      }
      return await q;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const findQuery = populateFields(
      Jewellery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum)
    );

    const countQuery = Jewellery.countDocuments(filter);

    if (includeDeleted === 'true' || includeDeleted === true) {
      findQuery.withDeleted();
      countQuery.withDeleted();
    }

    const [items, total] = await Promise.all([findQuery, countQuery]);
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      items,
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
   * Get single jewellery item by ID
   */
  async getItemById(userId, itemId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ApiError(400, 'Invalid jewellery item ID');
    }

    const q = Jewellery.findOne({ _id: itemId, userId })
      .populate('jewelleryCategory', 'name code icon')
      .populate('jewelleryBoxId', 'name type')
      .populate('setId', 'name coverImageUrl');

    if (options.includeDeleted) {
      q.withDeleted();
    }

    const item = await q;
    if (!item) {
      throw new ApiError(404, 'Jewellery item not found');
    }

    return item;
  }

  /**
   * Update jewellery item
   */
  async updateItem(userId, itemId, payload = {}, files = null) {
    const item = await Jewellery.findOne({ _id: itemId, userId });
    if (!item) {
      throw new ApiError(404, 'Jewellery item not found');
    }

    const {
      name,
      jewelleryBoxId,
      jewelleryCategory,
      setId,
      type,
      status,
      color,
      gemstone,
      weight,
      brand,
      isFavorite,
      sourceImageUrl,
      generatedImageUrl,
    } = payload;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        throw new ApiError(400, 'Jewellery name cannot be empty');
      }
      item.name = trimmedName;
    }

    if (jewelleryBoxId !== undefined) {
      item.jewelleryBoxId = await this.resolveBox(userId, jewelleryBoxId);
    }

    if (jewelleryCategory !== undefined) {
      item.jewelleryCategory = await this.resolveCategory(jewelleryCategory);
    }

    if (setId !== undefined) {
      if (!setId || setId === 'null' || setId === 'none') {
        item.setId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(setId)) {
          throw new ApiError(400, 'Invalid set ID');
        }
        const setDoc = await JewellerySet.findOne({ _id: setId, userId });
        if (!setDoc) {
          throw new ApiError(404, 'Jewellery set not found or unauthorized');
        }
        item.setId = setDoc._id;
      }
    }

    if (type !== undefined) {
      const validTypes = ['GOLD', 'SILVER', 'ARTIFICIAL', 'CUSTOM'];
      const upperType = String(type).toUpperCase().trim();
      if (!validTypes.includes(upperType)) {
        throw new ApiError(400, `Type must be one of: ${validTypes.join(', ')}`);
      }
      item.type = upperType;
    }

    if (status !== undefined) {
      const validStatuses = ['IN_LOCKER', 'LEND', 'CLEANING', 'OTHER'];
      const upperStatus = String(status).toUpperCase().trim();
      if (!validStatuses.includes(upperStatus)) {
        throw new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`);
      }
      item.status = upperStatus;
    }

    if (color !== undefined) item.color = String(color).trim();
    if (gemstone !== undefined) item.gemstone = String(gemstone).trim();
    if (brand !== undefined) item.brand = String(brand).trim();

    if (weight !== undefined) {
      item.weight = weight !== null && weight !== '' ? Number(weight) : null;
    }

    if (isFavorite !== undefined) {
      item.isFavorite = Boolean(isFavorite);
    }

    // Image updates
    if (files) {
      if (files.sourceImage && files.sourceImage[0]) {
        item.sourceImage = {
          url: formatUploadUrl(`/uploads/${files.sourceImage[0].filename}`),
          filename: files.sourceImage[0].filename,
        };
      }
      if (files.generatedImage && files.generatedImage[0]) {
        item.generatedImage = {
          url: formatUploadUrl(`/uploads/${files.generatedImage[0].filename}`),
          filename: files.generatedImage[0].filename,
          generatedAt: new Date(),
        };
      }
    }

    if (sourceImageUrl !== undefined) {
      const formatted = await this.processImageInput(sourceImageUrl);
      item.sourceImage = { url: formatted };
    }
    if (generatedImageUrl !== undefined) {
      const formatted = await this.processImageInput(generatedImageUrl);
      item.generatedImage = {
        url: formatted,
        generatedAt: formatted ? new Date() : null,
      };
    }

    item.lastModifiedBy = userId;
    await item.save();

    return await this.getItemById(userId, item._id);
  }

  /**
   * Update item status directly (IN_LOCKER | LEND | CLEANING | OTHER)
   */
  async updateItemStatus(userId, itemId, status) {
    const validStatuses = ['IN_LOCKER', 'LEND', 'CLEANING', 'OTHER'];
    const upperStatus = String(status || '').toUpperCase().trim();

    if (!validStatuses.includes(upperStatus)) {
      throw new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    const item = await Jewellery.findOne({ _id: itemId, userId });
    if (!item) {
      throw new ApiError(404, 'Jewellery item not found');
    }

    item.status = upperStatus;
    item.lastModifiedBy = userId;
    await item.save();

    return item;
  }

  /**
   * Move item to another box
   */
  async moveItem(userId, itemId, targetJewelleryBoxId) {
    if (!targetJewelleryBoxId || !mongoose.Types.ObjectId.isValid(targetJewelleryBoxId)) {
      throw new ApiError(400, 'Valid target jewelleryBoxId is required');
    }

    const [item, targetBox] = await Promise.all([
      Jewellery.findOne({ _id: itemId, userId }),
      JewelleryBox.findOne({ _id: targetJewelleryBoxId, userId }),
    ]);

    if (!item) {
      throw new ApiError(404, 'Jewellery item not found');
    }
    if (!targetBox) {
      throw new ApiError(404, 'Target jewellery box not found');
    }

    item.jewelleryBoxId = targetBox._id;
    item.lastModifiedBy = userId;
    await item.save();

    return item;
  }

  /**
   * Toggle favorite
   */
  async toggleFavorite(userId, itemId) {
    const item = await Jewellery.findOne({ _id: itemId, userId });
    if (!item) {
      throw new ApiError(404, 'Jewellery item not found');
    }

    item.isFavorite = !item.isFavorite;
    item.lastModifiedBy = userId;
    await item.save();

    return {
      _id: item._id,
      isFavorite: item.isFavorite,
      message: item.isFavorite ? 'Item added to favorites' : 'Item removed from favorites',
    };
  }

  /**
   * Delete single jewellery item
   */
  async deleteItem(userId, itemId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ApiError(400, 'Invalid jewellery item ID');
    }

    const item = await Jewellery.findOne({ _id: itemId, userId });
    if (!item) {
      throw new ApiError(404, 'Jewellery item not found');
    }

    if (options.hard === true || options.hard === 'true') {
      await Jewellery.findByIdAndDelete(item._id);
      return { message: 'Jewellery item permanently deleted' };
    }

    await item.softDelete();
    return { message: 'Jewellery item deleted successfully' };
  }
}

module.exports = new JewelleryService();
