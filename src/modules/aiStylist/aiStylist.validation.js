const mongoose = require('mongoose');
const ApiError = require('../../utils/apiError');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Validate POST /api/ai-stylist/generate request body
 */
const validateGenerateLook = (req, res, next) => {
  const { topWearId, bottomWearId, jewelleryIds, eventId, maxCombinations } = req.body;

  if (!topWearId && !bottomWearId) {
    throw new ApiError(400, 'Please select at least a Top Wear or Bottom Wear garment');
  }

  if (topWearId && !isValidObjectId(topWearId)) {
    throw new ApiError(400, 'Invalid topWearId');
  }

  if (bottomWearId && !isValidObjectId(bottomWearId)) {
    throw new ApiError(400, 'Invalid bottomWearId');
  }

  if (eventId && !isValidObjectId(eventId)) {
    throw new ApiError(400, 'Invalid eventId');
  }

  if (jewelleryIds !== undefined) {
    if (!Array.isArray(jewelleryIds) || jewelleryIds.some((id) => !isValidObjectId(id))) {
      throw new ApiError(400, 'jewelleryIds must be an array of valid IDs');
    }
  }

  if (maxCombinations !== undefined) {
    const num = Number(maxCombinations);
    if (!Number.isInteger(num) || num < 1 || num > 4) {
      throw new ApiError(400, 'maxCombinations must be an integer between 1 and 4');
    }
  }

  next();
};

/**
 * Validate :id route parameter as a MongoDB ObjectId
 */
const validateLookIdParam = (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Invalid AI Look ID');
  }
  next();
};

module.exports = {
  validateGenerateLook,
  validateLookIdParam,
};
