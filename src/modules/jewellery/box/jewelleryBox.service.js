const mongoose = require('mongoose');
const JewelleryBox = require('./jewelleryBox.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');
const { saveBase64Image } = require('../../../middlewares/upload.middleware');

const escapeRegex = (string = '') => string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

class JewelleryBoxService {
  /**
   * Create a new jewellery box for user
   */
  async createBox(userId, payload = {}, file = null) {
    if (!userId) {
      throw new ApiError(401, 'User ID is required');
    }

    const { name, description, type, ownerName, isDefault, coverImage } = payload;
    const trimmedName = String(name || '').trim();

    if (!trimmedName) {
      throw new ApiError(400, 'Box name is required');
    }

    let finalCover = (file && (file.url || file.dbUrl)) || coverImage || '';
    if (finalCover && typeof finalCover === 'string') {
      if (finalCover.startsWith('data:image')) {
        finalCover = await saveBase64Image(finalCover);
      } else {
        finalCover = formatUploadUrl(finalCover);
      }
    }

    // Check if this is the user's first box - if so, make it default automatically
    const existingCount = await JewelleryBox.countDocuments({ userId });
    const shouldBeDefault = Boolean(isDefault) || existingCount === 0;

    // If setting as default, unset other boxes for this user
    if (shouldBeDefault) {
      await JewelleryBox.updateMany({ userId, isDefault: true }, { $set: { isDefault: false } });
    }

    const box = await JewelleryBox.create({
      userId,
      name: trimmedName,
      description: description || '',
      type: type || 'PERSONAL',
      ownerName: ownerName || '',
      coverImage: finalCover,
      isDefault: shouldBeDefault,
    });

    return box;
  }

  /**
   * Get all boxes of a user
   */
  async getUserBoxes(userId, query = {}) {
    if (!userId) {
      throw new ApiError(401, 'User ID is required');
    }

    const {
      page = 1,
      limit = 20,
      search,
      includeDeleted,
      paginate,
      all,
    } = query;

    const filter = { userId };
    if (search && String(search).trim()) {
      filter.name = { $regex: escapeRegex(String(search).trim()), $options: 'i' };
    }

    // Attach item counts to each box
    const Jewellery = mongoose.models.Jewellery;

    const attachCounts = async (boxes) => {
      const boxIds = boxes.map((b) => b._id);
      const countMap = {};
      if (Jewellery && boxIds.length > 0) {
        const counts = await Jewellery.aggregate([
          { $match: { jewelleryBoxId: { $in: boxIds }, isDeleted: { $ne: true } } },
          { $group: { _id: '$jewelleryBoxId', count: { $sum: 1 } } },
        ]);
        counts.forEach((c) => {
          countMap[c._id.toString()] = c.count;
        });
      }
      return boxes.map((box) => {
        const obj = box.toObject ? box.toObject() : { ...box };
        obj.itemCount = countMap[box._id.toString()] || 0;
        return obj;
      });
    };

    if (paginate === 'false' || all === 'true') {
      const q = JewelleryBox.find(filter).sort({ isDefault: -1, createdAt: -1 });
      if (includeDeleted === 'true' || includeDeleted === true) {
        q.withDeleted();
      }
      const boxes = await q;
      return await attachCounts(boxes);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const findQuery = JewelleryBox.find(filter)
      .sort({ isDefault: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const countQuery = JewelleryBox.countDocuments(filter);

    if (includeDeleted === 'true' || includeDeleted === true) {
      findQuery.withDeleted();
      countQuery.withDeleted();
    }

    const [boxes, total] = await Promise.all([findQuery, countQuery]);
    const boxesWithCounts = await attachCounts(boxes);
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      boxes: boxesWithCounts,
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
   * Get single box by ID (with ownership check)
   */
  async getBoxById(userId, boxId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(boxId)) {
      throw new ApiError(400, 'Invalid box ID');
    }

    const q = JewelleryBox.findOne({ _id: boxId, userId });
    if (options.includeDeleted) {
      q.withDeleted();
    }

    const box = await q;
    if (!box) {
      throw new ApiError(404, 'Jewellery box not found');
    }

    const Jewellery = mongoose.models.Jewellery;
    const obj = box.toObject ? box.toObject() : { ...box };
    if (Jewellery) {
      obj.itemCount = await Jewellery.countDocuments({
        jewelleryBoxId: box._id,
        isDeleted: { $ne: true },
      });
    } else {
      obj.itemCount = 0;
    }

    return obj;
  }

  /**
   * Update box details
   */
  async updateBox(userId, boxId, payload = {}, file = null) {
    if (!mongoose.Types.ObjectId.isValid(boxId)) {
      throw new ApiError(400, 'Invalid box ID');
    }

    const box = await JewelleryBox.findOne({ _id: boxId, userId });
    if (!box) {
      throw new ApiError(404, 'Jewellery box not found');
    }

    const { name, description, type, ownerName, isDefault, coverImage } = payload;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        throw new ApiError(400, 'Box name cannot be empty');
      }
      box.name = trimmedName;
    }

    if (description !== undefined) {
      box.description = String(description).trim();
    }

    if (type !== undefined) {
      box.type = type;
    }

    if (ownerName !== undefined) {
      box.ownerName = String(ownerName).trim();
    }

    if (isDefault !== undefined && Boolean(isDefault) === true) {
      // Unset other defaults
      await JewelleryBox.updateMany(
        { userId, _id: { $ne: box._id }, isDefault: true },
        { $set: { isDefault: false } }
      );
      box.isDefault = true;
    }

    const finalCover = (file && (file.url || file.dbUrl)) || coverImage;
    if (finalCover !== undefined) {
      if (!finalCover || finalCover === '' || finalCover === 'null') {
        box.coverImage = '';
      } else if (typeof finalCover === 'string' && finalCover.startsWith('data:image')) {
        box.coverImage = await saveBase64Image(finalCover);
      } else {
        box.coverImage = formatUploadUrl(finalCover);
      }
    }

    await box.save();
    return box;
  }

  /**
   * Soft-delete a jewellery box and cascade soft-deletion to its items and sets
   */
  async deleteBox(userId, boxId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(boxId)) {
      throw new ApiError(400, 'Invalid box ID');
    }

    const box = await JewelleryBox.findOne({ _id: boxId, userId });
    if (!box) {
      throw new ApiError(404, 'Jewellery box not found');
    }

    const isHard = options.hard === true || options.hard === 'true';

    // Cascade soft deletion / hard deletion to items and sets
    const Jewellery = mongoose.models.Jewellery;
    const JewellerySet = mongoose.models.JewellerySet;

    if (isHard) {
      if (Jewellery) {
        await Jewellery.deleteMany({ jewelleryBoxId: box._id });
      }
      if (JewellerySet) {
        await JewellerySet.deleteMany({ jewelleryBoxId: box._id });
      }
      await JewelleryBox.findByIdAndDelete(box._id);
      return { message: 'Jewellery box permanently deleted' };
    }

    await box.softDelete();

    if (Jewellery) {
      await Jewellery.updateMany(
        { jewelleryBoxId: box._id, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: new Date(), isActive: false } }
      );
    }
    if (JewellerySet) {
      await JewellerySet.updateMany(
        { jewelleryBoxId: box._id, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: new Date(), isActive: false } }
      );
    }

    // If deleted box was default, pick another box as default if available
    if (box.isDefault) {
      const nextBox = await JewelleryBox.findOne({ userId, isDeleted: false }).sort({ createdAt: -1 });
      if (nextBox) {
        nextBox.isDefault = true;
        await nextBox.save();
      }
    }

    return { message: 'Jewellery box and its items deleted successfully' };
  }
}

module.exports = new JewelleryBoxService();
