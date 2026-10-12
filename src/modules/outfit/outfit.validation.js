const ApiError = require('../../utils/apiError');

const VALID_OCCASIONS = [
  'CASUAL',
  'OFFICE',
  'WORK',
  'FORMAL',
  'PARTY',
  'WEDDING',
  'FESTIVE',
  'TRADITIONAL',
  'DATE',
  'TRAVEL',
  'VACATION',
  'LOUNGE',
  'SPORTS',
  'DAILY',
];

/**
 * Validate outfit suggestion request payload
 */
const validateSuggestRequest = (req, res, next) => {
  const { occasion, limit, wardrobeIds } = req.body;

  if (occasion && typeof occasion !== 'string') {
    throw new ApiError(400, 'Occasion must be a valid text string (e.g. CASUAL, OFFICE, PARTY)');
  }

  if (wardrobeIds !== undefined && !Array.isArray(wardrobeIds) && typeof wardrobeIds !== 'string') {
    throw new ApiError(400, 'wardrobeIds must be an array of wardrobe IDs or a comma-separated string');
  }

  if (limit !== undefined) {
    const numLimit = parseInt(limit, 10);
    if (isNaN(numLimit) || numLimit < 1 || numLimit > 20) {
      throw new ApiError(400, 'Limit must be a number between 1 and 20');
    }
  }

  next();
};

/**
 * Validate save outfit request payload
 */
const validateSaveOutfit = (req, res, next) => {
  const { title, occasion, items } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new ApiError(400, 'Title is required for saving an outfit');
  }

  if (!occasion || typeof occasion !== 'string' || occasion.trim().length === 0) {
    throw new ApiError(400, 'Occasion is required for saving an outfit');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Outfit must contain at least one wardrobe item');
  }

  for (const item of items) {
    if (!item.itemId || !item.slot) {
      throw new ApiError(400, 'Each outfit item must have an itemId and slot');
    }
  }

  next();
};

module.exports = {
  validateSuggestRequest,
  validateSaveOutfit,
  VALID_OCCASIONS,
};
