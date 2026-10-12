const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const outfitService = require('./outfit.service');

/**
 * @desc    Generate occasion-based smart outfit combinations strictly from user's wardrobe
 * @route   POST /api/outfit/suggest
 * @access  Private
 */
const suggestOutfits = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { wardrobeId, occasion, season, limit } = req.body;

  const result = await outfitService.suggestOutfits(userId, {
    wardrobeId: wardrobeId || null,
    occasion: occasion || 'CASUAL',
    season: season || null,
    limit: limit ? parseInt(limit, 10) : 5,
  });

  return ApiResponse.success(res, result, 'Outfit recommendations generated successfully');
});

/**
 * @desc    Save an outfit to user's favorites
 * @route   POST /api/outfit/save
 * @access  Private
 */
const saveOutfit = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const savedOutfit = await outfitService.saveOutfit(userId, req.body);

  return ApiResponse.created(res, savedOutfit, 'Outfit saved to your closet collection');
});

/**
 * @desc    Get all saved outfits for user
 * @route   GET /api/outfit/saved
 * @access  Private
 */
const getSavedOutfits = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const outfits = await outfitService.getSavedOutfits(userId, req.query);

  return ApiResponse.success(res, outfits, 'Saved outfits retrieved successfully');
});

/**
 * @desc    Delete a saved outfit
 * @route   DELETE /api/outfit/saved/:id
 * @access  Private
 */
const deleteSavedOutfit = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await outfitService.deleteSavedOutfit(userId, req.params.id);

  return ApiResponse.success(res, result, 'Saved outfit removed successfully');
});

module.exports = {
  suggestOutfits,
  saveOutfit,
  getSavedOutfits,
  deleteSavedOutfit,
};
