const mongoose = require('mongoose');
const JewellerySet = require('./jewellerySet.model');
const JewelleryBox = require('../box/jewelleryBox.model');
const ApiError = require('../../../utils/apiError');
const { formatUploadUrl } = require('../../../utils/url.util');
const { saveBase64Image } = require('../../../middlewares/upload.middleware');

const escapeRegex = (string = '') => string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

class JewellerySetService {
  /**
   * Create a new jewellery set
   */
  async createSet(userId, payload = {}, file = null) {
    if (!userId) {
      throw new ApiError(401, 'User ID is required');
    }

    const { jewelleryBoxId, name, coverImageUrl, sourcePhotoUrl } = payload;
    const trimmedName = String(name || '').trim();

    if (!trimmedName) {
      throw new ApiError(400, 'Set name is required');
    }

    if (!jewelleryBoxId || !mongoose.Types.ObjectId.isValid(jewelleryBoxId)) {
      throw new ApiError(400, 'Valid jewellery box ID is required');
    }

    // Verify box exists and belongs to user
    const box = await JewelleryBox.findOne({ _id: jewelleryBoxId, userId });
    if (!box) {
      throw new ApiError(404, 'Jewellery box not found or unauthorized');
    }

    let finalCover = (file && (file.url || file.dbUrl)) || coverImageUrl || '';
    if (finalCover && typeof finalCover === 'string') {
      if (finalCover.startsWith('data:image')) {
        finalCover = await saveBase64Image(finalCover);
      } else {
        finalCover = formatUploadUrl(finalCover);
      }
    }

    const set = await JewellerySet.create({
      userId,
      jewelleryBoxId,
      name: trimmedName,
      coverImageUrl: finalCover,
      sourcePhotoUrl: sourcePhotoUrl ? formatUploadUrl(sourcePhotoUrl) : finalCover,
    });

    return set;
  }

  /**
   * Get all sets for user
   */
  async getUserSets(userId, query = {}) {
    if (!userId) {
      throw new ApiError(401, 'User ID is required');
    }

    const {
      jewelleryBoxId,
      page = 1,
      limit = 20,
      search,
      includeDeleted,
      paginate,
      all,
    } = query;

    const filter = { userId };

    if (jewelleryBoxId && mongoose.Types.ObjectId.isValid(jewelleryBoxId)) {
      filter.jewelleryBoxId = jewelleryBoxId;
    }

    if (search && String(search).trim()) {
      filter.name = { $regex: escapeRegex(String(search).trim()), $options: 'i' };
    }

    const Jewellery = mongoose.models.Jewellery;

    const attachPiecesInfo = async (sets) => {
      const setIds = sets.map((s) => s._id);
      const pieceCountMap = {};
      if (Jewellery && setIds.length > 0) {
        const counts = await Jewellery.aggregate([
          { $match: { setId: { $in: setIds }, isDeleted: { $ne: true } } },
          { $group: { _id: '$setId', count: { $sum: 1 } } },
        ]);
        counts.forEach((c) => {
          pieceCountMap[c._id.toString()] = c.count;
        });
      }

      return sets.map((set) => {
        const obj = set.toObject ? set.toObject() : { ...set };
        obj.itemCount = pieceCountMap[set._id.toString()] || 0;
        return obj;
      });
    };

    if (paginate === 'false' || all === 'true') {
      const q = JewellerySet.find(filter)
        .populate('jewelleryBoxId', 'name type')
        .sort({ createdAt: -1 });

      if (includeDeleted === 'true' || includeDeleted === true) {
        q.withDeleted();
      }

      const sets = await q;
      return await attachPiecesInfo(sets);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const findQuery = JewellerySet.find(filter)
      .populate('jewelleryBoxId', 'name type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const countQuery = JewellerySet.countDocuments(filter);

    if (includeDeleted === 'true' || includeDeleted === true) {
      findQuery.withDeleted();
      countQuery.withDeleted();
    }

    const [sets, total] = await Promise.all([findQuery, countQuery]);
    const setsWithPieces = await attachPiecesInfo(sets);
    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      sets: setsWithPieces,
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
   * Get set by ID along with its jewellery items
   */
  async getSetById(userId, setId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(setId)) {
      throw new ApiError(400, 'Invalid set ID');
    }

    const q = JewellerySet.findOne({ _id: setId, userId }).populate(
      'jewelleryBoxId',
      'name type'
    );

    if (options.includeDeleted) {
      q.withDeleted();
    }

    const set = await q;
    if (!set) {
      throw new ApiError(404, 'Jewellery set not found');
    }

    const Jewellery = mongoose.models.Jewellery;
    const obj = set.toObject ? set.toObject() : { ...set };

    if (Jewellery) {
      const itemsQuery = Jewellery.find({ setId: set._id, userId })
        .populate('jewelleryCategory', 'name code icon')
        .sort({ createdAt: -1 });

      if (options.includeDeleted) {
        itemsQuery.withDeleted();
      }

      obj.items = await itemsQuery;
      obj.itemCount = obj.items.length;
    } else {
      obj.items = [];
      obj.itemCount = 0;
    }

    return obj;
  }

  /**
   * Update jewellery set
   */
  async updateSet(userId, setId, payload = {}, file = null) {
    if (!mongoose.Types.ObjectId.isValid(setId)) {
      throw new ApiError(400, 'Invalid set ID');
    }

    const set = await JewellerySet.findOne({ _id: setId, userId });
    if (!set) {
      throw new ApiError(404, 'Jewellery set not found');
    }

    const { name, jewelleryBoxId, coverImageUrl, sourcePhotoUrl } = payload;

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        throw new ApiError(400, 'Set name cannot be empty');
      }
      set.name = trimmedName;
    }

    if (jewelleryBoxId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(jewelleryBoxId)) {
        throw new ApiError(400, 'Invalid jewellery box ID');
      }
      const box = await JewelleryBox.findOne({ _id: jewelleryBoxId, userId });
      if (!box) {
        throw new ApiError(404, 'Target jewellery box not found');
      }
      set.jewelleryBoxId = jewelleryBoxId;

      // Also move member jewellery items to the new box
      const Jewellery = mongoose.models.Jewellery;
      if (Jewellery) {
        await Jewellery.updateMany(
          { setId: set._id, userId },
          { $set: { jewelleryBoxId } }
        );
      }
    }

    if (sourcePhotoUrl !== undefined) {
      set.sourcePhotoUrl = formatUploadUrl(sourcePhotoUrl);
    }

    const finalCover = (file && (file.url || file.dbUrl)) || coverImageUrl;
    if (finalCover !== undefined) {
      if (!finalCover || finalCover === '' || finalCover === 'null') {
        set.coverImageUrl = '';
      } else if (typeof finalCover === 'string' && finalCover.startsWith('data:image')) {
        set.coverImageUrl = await saveBase64Image(finalCover);
      } else {
        set.coverImageUrl = formatUploadUrl(finalCover);
      }
    }

    await set.save();
    return set;
  }

  /**
   * Delete set
   */
  async deleteSet(userId, setId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(setId)) {
      throw new ApiError(400, 'Invalid set ID');
    }

    const set = await JewellerySet.findOne({ _id: setId, userId });
    if (!set) {
      throw new ApiError(404, 'Jewellery set not found');
    }

    const isHard = options.hard === true || options.hard === 'true';
    const Jewellery = mongoose.models.Jewellery;

    if (isHard) {
      if (Jewellery) {
        // Unlink or delete items
        await Jewellery.updateMany({ setId: set._id }, { $set: { setId: null } });
      }
      await JewellerySet.findByIdAndDelete(set._id);
      return { message: 'Jewellery set permanently deleted' };
    }

    await set.softDelete();

    // In soft-delete, we can soft-delete the items in this set as well or unlink them
    // Soft deleting maintains cohesive set grouping
    if (Jewellery) {
      await Jewellery.updateMany(
        { setId: set._id, userId, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: new Date(), isActive: false } }
      );
    }

    return { message: 'Jewellery set and its items deleted successfully' };
  }
}

module.exports = new JewellerySetService();
