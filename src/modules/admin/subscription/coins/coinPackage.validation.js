const mongoose = require('mongoose');
const ApiError = require('../../../../utils/apiError');

const validateCreateCoinPackage = (req, res, next) => {
  const { name, coins, bonusCoins, price } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Package name is required'));
  }

  if (coins === undefined || coins === null) {
    return next(new ApiError(400, 'Coins amount is required'));
  }
  if (!Number.isInteger(Number(coins)) || Number(coins) < 1) {
    return next(new ApiError(400, 'Coins must be a positive integer'));
  }

  if (bonusCoins !== undefined && bonusCoins !== null) {
    if (!Number.isInteger(Number(bonusCoins)) || Number(bonusCoins) < 0) {
      return next(new ApiError(400, 'Bonus coins must be a non-negative integer'));
    }
  }

  if (price === undefined || price === null) {
    return next(new ApiError(400, 'Price is required'));
  }
  if (isNaN(Number(price)) || Number(price) <= 0) {
    return next(new ApiError(400, 'Price must be greater than zero'));
  }

  next();
};

const validateUpdateCoinPackage = (req, res, next) => {
  const { name, coins, bonusCoins, price } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Package name cannot be empty'));
    }
  }

  if (coins !== undefined) {
    if (!Number.isInteger(Number(coins)) || Number(coins) < 1) {
      return next(new ApiError(400, 'Coins must be a positive integer'));
    }
  }

  if (bonusCoins !== undefined && bonusCoins !== null) {
    if (!Number.isInteger(Number(bonusCoins)) || Number(bonusCoins) < 0) {
      return next(new ApiError(400, 'Bonus coins must be a non-negative integer'));
    }
  }

  if (price !== undefined) {
    if (isNaN(Number(price)) || Number(price) <= 0) {
      return next(new ApiError(400, 'Price must be greater than zero'));
    }
  }

  next();
};

const validateCoinPackageId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ApiError(400, 'Invalid coin package ID'));
  }
  next();
};

const validateStatusUpdate = (req, res, next) => {
  const { isActive } = req.body;

  if (isActive === undefined || isActive === null || typeof isActive !== 'boolean') {
    return next(new ApiError(400, 'isActive must be a boolean value'));
  }

  next();
};

module.exports = {
  validateCreateCoinPackage,
  validateUpdateCoinPackage,
  validateCoinPackageId,
  validateStatusUpdate,
};

