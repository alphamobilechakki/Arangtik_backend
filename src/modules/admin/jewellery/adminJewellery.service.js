const mongoose = require('mongoose');
const Jewellery = require('../../jewellery/item/jewellery.model');
const JewelleryBox = require('../../jewellery/box/jewelleryBox.model');
const JewellerySet = require('../../jewellery/set/jewellerySet.model');
const JewelleryCategory = require('../../jewellery/category/jewelleryCategory.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');

const escapeRegex = (string = '') => string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

class AdminJewelleryService {
  /**
   * 1. Get High-Level Operational KPIs & SLA Alerts
   */
  async getOperationalStats() {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalPieces,
      totalBoxes,
      totalSets,
      uniqueOwnersAgg,
      statusCounts,
      typeCounts,
      overdueCleaningCount,
      extendedLendCount,
      missingPhotosCount,
      topCategoriesAgg,
    ] = await Promise.all([
      Jewellery.countDocuments({ isDeleted: false }),
      JewelleryBox.countDocuments({ isDeleted: false }),
      JewellerySet.countDocuments({ isDeleted: false }),
      Jewellery.distinct('userId', { isDeleted: false }),
      // Aggregated status distribution
      Jewellery.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Aggregated type distribution
      Jewellery.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      // SLA Alert: Cleaning > 14 days
      Jewellery.countDocuments({
        isDeleted: false,
        status: 'CLEANING',
        updatedAt: { $lte: fourteenDaysAgo },
      }),
      // SLA Alert: Lend > 30 days
      Jewellery.countDocuments({
        isDeleted: false,
        status: 'LEND',
        updatedAt: { $lte: thirtyDaysAgo },
      }),
      // Data Quality Alert: Missing source image
      Jewellery.countDocuments({
        isDeleted: false,
        $or: [
          { 'sourceImage.url': { $exists: false } },
          { 'sourceImage.url': '' },
          { 'sourceImage.url': null },
        ],
      }),
      // Top Categories
      Jewellery.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$jewelleryCategory', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'jewellerycategories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            count: 1,
            name: { $ifNull: ['$category.name', 'Uncategorized'] },
            code: { $ifNull: ['$category.code', 'UNKNOWN'] },
          },
        },
      ]),
    ]);

    // Format status map with defaults
    const byStatus = {
      IN_LOCKER: 0,
      LEND: 0,
      CLEANING: 0,
      OTHER: 0,
    };
    statusCounts.forEach((s) => {
      if (s._id) byStatus[s._id] = s.count;
    });

    // Format type map with defaults
    const byType = {
      GOLD: 0,
      SILVER: 0,
      ARTIFICIAL: 0,
      CUSTOM: 0,
    };
    typeCounts.forEach((t) => {
      if (t._id) byType[t._id] = t.count;
    });

    return {
      overview: {
        totalPieces,
        totalBoxes,
        totalSets,
        uniqueOwners: uniqueOwnersAgg.length,
      },
      statusDistribution: byStatus,
      typeDistribution: byType,
      operationalAlerts: {
        overdueCleaning: overdueCleaningCount,
        extendedLend: extendedLendCount,
        missingPhotos: missingPhotosCount,
        totalAlerts: overdueCleaningCount + extendedLendCount + missingPhotosCount,
      },
      topCategories: topCategoriesAgg,
    };
  }

  /**
   * 2. Global Jewellery Operations Table (Searchable, Filterable, with SLA Aging & Tab Badges)
   */
  async getAllItems(query = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      type,
      jewelleryCategory,
      userId,
      isAlert,
      includeDeleted,
    } = query;

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filter = {};

    if (includeDeleted === 'true' || includeDeleted === true) {
      // no isDeleted filter
    } else {
      filter.isDeleted = false;
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = userId;
    }

    if (status) {
      filter.status = String(status).toUpperCase().trim();
    }

    if (type) {
      filter.type = String(type).toUpperCase().trim();
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

    // Filter by SLA Alert if requested
    if (isAlert === 'true' || isAlert === true) {
      filter.$or = [
        { status: 'CLEANING', updatedAt: { $lte: fourteenDaysAgo } },
        { status: 'LEND', updatedAt: { $lte: thirtyDaysAgo } },
      ];
    }

    // ── Two-Phase Indexed Search ──────────────────────────────
    if (search && String(search).trim()) {
      const term = String(search).trim();
      const escaped = escapeRegex(term);

      // Phase 1: Search Users by Phone or Name using User index
      const matchingUsers = await User.find({
        $or: [
          { phone: { $regex: escaped, $options: 'i' } },
          { name: { $regex: escaped, $options: 'i' } },
        ],
      })
        .select('_id')
        .limit(100);

      const matchingUserIds = matchingUsers.map((u) => u._id);

      // Phase 2: Search Item fields or matching User IDs
      const searchConditions = [
        { name: { $regex: escaped, $options: 'i' } },
        { brand: { $regex: escaped, $options: 'i' } },
        { color: { $regex: escaped, $options: 'i' } },
        { gemstone: { $regex: escaped, $options: 'i' } },
      ];

      if (matchingUserIds.length > 0) {
        searchConditions.push({ userId: { $in: matchingUserIds } });
      }

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Fetch live tab badges in parallel
    const [items, total, tabLocker, tabLend, tabCleaning, tabOverdue] = await Promise.all([
      Jewellery.find(filter)
        .populate('userId', 'name phone')
        .populate('jewelleryBoxId', 'name type')
        .populate('jewelleryCategory', 'name code icon')
        .populate('setId', 'name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Jewellery.countDocuments(filter),
      Jewellery.countDocuments({ isDeleted: false, status: 'IN_LOCKER' }),
      Jewellery.countDocuments({ isDeleted: false, status: 'LEND' }),
      Jewellery.countDocuments({ isDeleted: false, status: 'CLEANING' }),
      Jewellery.countDocuments({
        isDeleted: false,
        $or: [
          { status: 'CLEANING', updatedAt: { $lte: fourteenDaysAgo } },
          { status: 'LEND', updatedAt: { $lte: thirtyDaysAgo } },
        ],
      }),
    ]);

    // Annotate items with SLA aging
    const annotatedItems = items.map((item) => {
      const obj = item.toObject ? item.toObject() : { ...item };
      const lastStatusChange = obj.updatedAt || obj.createdAt;
      const daysInStatus = lastStatusChange
        ? Math.max(0, Math.floor((now - new Date(lastStatusChange)) / (1000 * 60 * 60 * 24)))
        : 0;

      let alertReason = null;
      if (obj.status === 'CLEANING' && daysInStatus >= 14) {
        alertReason = `OVERDUE_CLEANING (${daysInStatus} days at vendor)`;
      } else if (obj.status === 'LEND' && daysInStatus >= 30) {
        alertReason = `EXTENDED_LEND (${daysInStatus} days lent out)`;
      }

      obj.daysInStatus = daysInStatus;
      obj.isAlert = Boolean(alertReason);
      obj.alertReason = alertReason;
      obj.user = obj.userId;
      obj.box = obj.jewelleryBoxId;
      obj.category = obj.jewelleryCategory;

      return obj;
    });

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      tabCounts: {
        all: tabLocker + tabLend + tabCleaning,
        inLocker: tabLocker,
        lend: tabLend,
        cleaning: tabCleaning,
        overdue: tabOverdue,
      },
      items: annotatedItems,
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
   * 3. Get Single Piece Detailed Inspection
   */
  async getItemById(itemId) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ApiError(400, 'Invalid jewellery item ID');
    }

    const item = await Jewellery.findById(itemId)
      .withDeleted()
      .populate('userId', 'name phone role createdAt')
      .populate('jewelleryBoxId', 'name type ownerName isDefault')
      .populate('jewelleryCategory', 'name code icon description')
      .populate('setId', 'name coverImageUrl');

    if (!item) {
      throw new ApiError(404, 'Jewellery item not found');
    }

    const now = new Date();
    const obj = item.toObject();
    const lastChange = obj.updatedAt || obj.createdAt;
    const daysInStatus = lastChange
      ? Math.max(0, Math.floor((now - new Date(lastChange)) / (1000 * 60 * 60 * 24)))
      : 0;

    let alertReason = null;
    if (obj.status === 'CLEANING' && daysInStatus >= 14) {
      alertReason = `OVERDUE_CLEANING (${daysInStatus} days at vendor)`;
    } else if (obj.status === 'LEND' && daysInStatus >= 30) {
      alertReason = `EXTENDED_LEND (${daysInStatus} days lent out)`;
    }

    obj.daysInStatus = daysInStatus;
    obj.isAlert = Boolean(alertReason);
    obj.alertReason = alertReason;
    obj.user = obj.userId;
    obj.box = obj.jewelleryBoxId;
    obj.category = obj.jewelleryCategory;

    return obj;
  }

  /**
   * 4. Support Intervention: Status Override with Audit Logging
   */
  async statusOverride(adminId, itemId, payload = {}) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ApiError(400, 'Invalid jewellery item ID');
    }

    const { status, reason } = payload;
    const validStatuses = ['IN_LOCKER', 'LEND', 'CLEANING', 'OTHER'];
    const upperStatus = String(status || '').toUpperCase().trim();

    if (!validStatuses.includes(upperStatus)) {
      throw new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    if (!reason || !String(reason).trim()) {
      throw new ApiError(400, 'Audit reason is required for administrative status override');
    }

    const item = await Jewellery.findById(itemId).withDeleted();
    if (!item) {
      throw new ApiError(404, 'Jewellery item not found');
    }

    const previousStatus = item.status;
    item.status = upperStatus;
    item.lastModifiedBy = adminId;
    await item.save();

    return {
      _id: item._id,
      name: item.name,
      previousStatus,
      status: item.status,
      reason: String(reason).trim(),
      updatedBy: adminId,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * 5. Accidental Deletion Recovery (Restore Soft-Deleted Item)
   */
  async restoreItem(adminId, itemId) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new ApiError(400, 'Invalid jewellery item ID');
    }

    const item = await Jewellery.findById(itemId).withDeleted();
    if (!item) {
      throw new ApiError(404, 'Jewellery item not found');
    }

    if (!item.isDeleted) {
      return { message: 'Jewellery item is already active', item };
    }

    await item.restore();
    item.lastModifiedBy = adminId;
    await item.save();

    return {
      message: 'Jewellery item restored successfully',
      item,
    };
  }

  /**
   * 6. User Customer Support Drill-down
   */
  async getUserJewelleryOverview(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID');
    }

    const user = await User.findById(userId).select('name phone role createdAt');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const [boxes, sets, items] = await Promise.all([
      JewelleryBox.find({ userId, isDeleted: false }).sort({ isDefault: -1, createdAt: -1 }),
      JewellerySet.find({ userId, isDeleted: false }).sort({ createdAt: -1 }),
      Jewellery.find({ userId, isDeleted: false })
        .populate('jewelleryCategory', 'name code icon')
        .populate('jewelleryBoxId', 'name')
        .sort({ createdAt: -1 }),
    ]);

    const statusBreakdown = {
      IN_LOCKER: 0,
      LEND: 0,
      CLEANING: 0,
      OTHER: 0,
    };

    items.forEach((item) => {
      if (item.status && statusBreakdown[item.status] !== undefined) {
        statusBreakdown[item.status]++;
      }
    });

    return {
      user,
      totalPieces: items.length,
      statusBreakdown,
      boxes,
      sets,
      items,
    };
  }
}

module.exports = new AdminJewelleryService();
