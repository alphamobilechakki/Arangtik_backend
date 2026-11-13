const mongoose = require('mongoose');
const CoinPurchase = require('../../../subscription/coins/coinPurchase.model');
const CoinTransaction = require('../../../subscription/coins/coinTransaction.model');
const ApiError = require('../../../../utils/apiError');

class AdminCoinService {
  /**
   * 1. Get light coin transactions list (3-4 essential fields for table view)
   */
  async getCoinTransactions(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const match = {};
    if (query.userId && mongoose.Types.ObjectId.isValid(query.userId)) {
      match.userId = new mongoose.Types.ObjectId(query.userId);
    }
    if (query.type && ['credit', 'debit'].includes(query.type.toLowerCase())) {
      match.type = query.type.toLowerCase();
    }
    if (query.status && query.status !== 'all') {
      match.status = query.status;
    }
    if (query.startDate || query.endDate) {
      match.createdAt = {};
      if (query.startDate) match.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) match.createdAt.$lte = new Date(query.endDate);
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { _id: 1, name: 1, phone: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ];

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': regex },
            { 'user.phone': regex },
            { reason: regex },
            { referenceId: regex },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          // Project only the required 3-4 table fields
          {
            $project: {
              _id: 1,
              user: {
                _id: '$user._id',
                name: '$user.name',
                phone: '$user.phone',
              },
              type: 1,
              amount: 1,
              reason: 1,
              status: 1,
              createdAt: 1,
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [result] = await CoinTransaction.aggregate(pipeline);
    const total = result?.totalCount?.[0]?.count || 0;

    return {
      transactions: result?.data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 2. Get single coin transaction full details by ID (for "Show More")
   */
  async getCoinTransactionById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid transaction ID format');
    }

    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                phone: 1,
                wallet: 1,
                profileImage: 1,
                status: 1,
                accountType: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'usersubscriptions',
          let: { uid: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
            { $sort: { createdAt: -1 } },
            {
              $project: {
                _id: 1,
                planCode: 1,
                planName: 1,
                durationMonths: 1,
                status: 1,
                expiresAt: 1,
                amountPaid: 1,
              },
            },
          ],
          as: 'userPlans',
        },
      },
    ];

    const [transaction] = await CoinTransaction.aggregate(pipeline);
    if (!transaction) {
      throw new ApiError(404, 'Coin transaction not found');
    }
    return transaction;
  }

  /**
   * 3. Get light coin purchases list (3-4 essential fields for table view)
   */
  async getCoinPurchases(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const match = {};
    if (query.userId && mongoose.Types.ObjectId.isValid(query.userId)) {
      match.userId = new mongoose.Types.ObjectId(query.userId);
    }
    const status = query.status || query.paymentStatus;
    if (status && status !== 'all') {
      match.paymentStatus = status;
    }
    if (query.startDate || query.endDate) {
      match.createdAt = {};
      if (query.startDate) match.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) match.createdAt.$lte = new Date(query.endDate);
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { _id: 1, name: 1, phone: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ];

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': regex },
            { 'user.phone': regex },
            { paymentOrderId: regex },
            { paymentId: regex },
            { 'packageSnapshot.name': regex },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          // Project only the required 3-4 table fields
          {
            $project: {
              _id: 1,
              user: {
                _id: '$user._id',
                name: '$user.name',
                phone: '$user.phone',
              },
              packageName: '$packageSnapshot.name',
              amount: 1,
              totalCoins: 1,
              paymentStatus: 1,
              createdAt: 1,
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [result] = await CoinPurchase.aggregate(pipeline);
    const total = result?.totalCount?.[0]?.count || 0;

    return {
      purchases: result?.data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 4. Get single coin purchase full details by ID (for "Show More")
   */
  async getCoinPurchaseById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid purchase ID format');
    }

    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                phone: 1,
                wallet: 1,
                profileImage: 1,
                status: 1,
                accountType: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'usersubscriptions',
          let: { uid: '$userId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
            { $sort: { createdAt: -1 } },
            {
              $project: {
                _id: 1,
                planCode: 1,
                planName: 1,
                durationMonths: 1,
                status: 1,
                expiresAt: 1,
                amountPaid: 1,
              },
            },
          ],
          as: 'userPlans',
        },
      },
    ];

    const [purchase] = await CoinPurchase.aggregate(pipeline);
    if (!purchase) {
      throw new ApiError(404, 'Coin purchase record not found');
    }
    return purchase;
  }
}

module.exports = new AdminCoinService();
