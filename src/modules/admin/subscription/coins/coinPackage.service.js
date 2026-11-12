const mongoose = require('mongoose');
const CoinPackage = require('../../../subscription/coins/coinPackage.model');
const ApiError = require('../../../../utils/apiError');

const escapeRegex = (string = '') => string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

class CoinPackageService {
  /**
   * Create a new coin package
   */
  async createCoinPackage(payload = {}) {
    const { name, coins, bonusCoins, price, currency, description } = payload;
    const trimmedName = String(name).trim();

    // Check for duplicate name (case-insensitive)
    const existing = await CoinPackage.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
    });

    if (existing) {
      throw new ApiError(409, `Coin package with name "${trimmedName}" already exists`);
    }

    const coinPackage = await CoinPackage.create({
      name: trimmedName,
      coins: Number(coins),
      bonusCoins: bonusCoins !== undefined && bonusCoins !== null ? Number(bonusCoins) : 0,
      price: Number(price),
      currency: currency || 'INR',
      description: description || '',
    });

    return coinPackage;
  }

  /**
   * Get all coin packages with pagination, search, and active filter
   */
  async getAllCoinPackages(query = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
    } = query;

    const filter = {};

    if (search && String(search).trim()) {
      filter.name = { $regex: escapeRegex(String(search).trim()), $options: 'i' };
    }

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [coinPackages, total] = await Promise.all([
      CoinPackage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      CoinPackage.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      coinPackages,
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
   * Get a single coin package by ID
   */
  async getCoinPackageById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid coin package ID');
    }

    const coinPackage = await CoinPackage.findById(id);
    if (!coinPackage) {
      throw new ApiError(404, 'Coin package not found');
    }

    return coinPackage;
  }

  /**
   * Update a coin package (partial update)
   */
  async updateCoinPackage(id, payload = {}) {
    const coinPackage = await this.getCoinPackageById(id);
    const { name, coins, bonusCoins, price, currency, description } = payload;

    // Check duplicate name if name is being changed
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      const duplicate = await CoinPackage.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
      });

      if (duplicate) {
        throw new ApiError(409, `Coin package with name "${trimmedName}" already exists`);
      }
      coinPackage.name = trimmedName;
    }

    if (coins !== undefined) {
      coinPackage.coins = Number(coins);
    }

    if (bonusCoins !== undefined) {
      coinPackage.bonusCoins = Number(bonusCoins);
    }

    if (price !== undefined) {
      coinPackage.price = Number(price);
    }

    if (currency !== undefined) {
      coinPackage.currency = currency;
    }

    if (description !== undefined) {
      coinPackage.description = description;
    }

    await coinPackage.save();
    return coinPackage;
  }

  /**
   * Activate or deactivate a coin package
   */
  async updateCoinPackageStatus(id, isActive) {
    const coinPackage = await this.getCoinPackageById(id);
    coinPackage.isActive = isActive;
    await coinPackage.save();
    return coinPackage;
  }
}

module.exports = new CoinPackageService();

