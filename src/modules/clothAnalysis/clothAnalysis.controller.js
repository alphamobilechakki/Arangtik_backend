const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const clothAnalysisService = require('./clothAnalysis.service');

/**
 * @desc    Analyze single photo to extract clothes and check wardrobe duplicates
 * @route   POST /api/cloth-analysis/analyze-photo
 * @access  Private
 */
const analyzePhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await clothAnalysisService.analyzePhoto(userId, req.file);

  return ApiResponse.success(res, result, 'Photo analyzed successfully with clothing recognition');
});

/**
 * @desc    Scan a single user gallery photo for authenticated user & extract clothing
 * @route   POST /api/cloth-analysis/scan-gallery-photo
 * @access  Private
 */
const scanGalleryPhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const file = req.file || (req.files?.photo?.[0] || req.files?.image?.[0]);
  const options = {
    wardrobeId: req.body.wardrobeId || null,
    collectionId: req.body.collectionId || null,
    threshold: req.body.threshold ? parseFloat(req.body.threshold) : null,
  };

  const result = await clothAnalysisService.scanGalleryPhoto(userId, file, options);

  const message = result.matched
    ? `User matched successfully! Extracted ${result.detectedItemsCount} clothing items.`
    : 'User face not detected in this photo. Skipped clothing extraction.';

  return ApiResponse.success(res, result, message);
});

/**
 * @desc    Bulk add standalone dress photos (1 to 100 photos)
 * @route   POST /api/cloth-analysis/bulk-add-photos
 * @access  Private
 */
const bulkAddPhotos = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = req.files || (req.file ? [req.file] : []);
  const options = {
    wardrobeId: req.body.wardrobeId || null,
    collectionId: req.body.collectionId || null,
    storagePlace: req.body.storagePlace || 'Main Closet',
  };

  const result = await clothAnalysisService.bulkAddDressPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    `Bulk processing complete: ${result.newItemsCreated.length} items added to wardrobe, ${result.existingMatches.length} existing items matched`
  );
});

/**
 * @desc    Ingest clothes from gallery photos (Face Match -> AI Garment Extract -> Digital Wardrobe Ingest)
 * @route   POST /api/cloth-analysis/ingest-gallery
 * @access  Private
 */
const ingestGalleryPhotos = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = req.files || (req.file ? [req.file] : []);
  const options = {
    wardrobeId: req.body.wardrobeId || null,
    collectionId: req.body.collectionId || null,
    autoCreateNewItems: req.body.autoCreateNewItems !== 'false' && req.body.autoCreateNewItems !== false,
    threshold: req.body.threshold ? parseFloat(req.body.threshold) : null,
  };

  const result = await clothAnalysisService.ingestGalleryPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    `Gallery scanned: ${result.matchedUserImagesCount} photos matched your face, ${result.newWardrobeItemsCreated.length} new items added to wardrobe`
  );
});

module.exports = {
  analyzePhoto,
  scanGalleryPhoto,
  bulkAddPhotos,
  ingestGalleryPhotos,
};
