const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const clothAnalysisService = require('./clothAnalysis.service');

const extractFilesFromReq = (req) => {
  if (Array.isArray(req.files)) {
    return req.files;
  }
  if (req.files && typeof req.files === 'object') {
    const collected = [];
    const fields = ['photos', 'images', 'photo', 'image', 'file', 'files'];
    for (const f of fields) {
      if (Array.isArray(req.files[f])) {
        collected.push(...req.files[f]);
      }
    }
    if (collected.length > 0) return collected;
  }
  if (req.file) {
    return [req.file];
  }
  return [];
};

/**
 * @desc    Direct Dress Digitization (No Face Scan - Supports single or 1 to 100 photos)
 * @route   POST /api/cloth-analysis/extract-dress
 * @access  Private
 */
const extractDirectDress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = extractFilesFromReq(req);
  const options = {
    wardrobeId: req.body.wardrobeId || req.query.wardrobeId || null,
    collectionId: req.body.collectionId || req.query.collectionId || null,
    storagePlace: req.body.storagePlace || 'Main Closet',
  };

  if (files.length === 0) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: 'Please upload at least one clothing photo under field "photo" or "photos"',
    });
  }

  // Single file preview analysis mode (if explicitly requested with autoPersist=false)
  if (files.length === 1 && req.body.autoPersist === 'false') {
    const result = await clothAnalysisService.analyzePhoto(userId, files[0], options);
    return ApiResponse.success(res, result, 'Photo analyzed successfully with clothing recognition');
  }

  const result = await clothAnalysisService.bulkAddDressPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    result.summaryMessage || `Clothing processed: ${result.newItemsCreated.length} items added to wardrobe, ${result.existingMatches.length} existing duplicate items skipped`
  );
});

/**
 * @desc    Gallery Photo Scanning & Digitization (Face Verify + Clothes Extract - Single or 1 to 100 photos)
 * @route   POST /api/cloth-analysis/extract-from-gallery
 * @access  Private
 */
const extractFromGallery = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = extractFilesFromReq(req);
  const options = {
    wardrobeId: req.body.wardrobeId || req.query.wardrobeId || null,
    collectionId: req.body.collectionId || req.query.collectionId || null,
    autoCreateNewItems: req.body.autoCreateNewItems !== 'false' && req.body.autoCreateNewItems !== false,
    threshold: req.body.threshold ? parseFloat(req.body.threshold) : null,
  };

  if (files.length === 0) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: 'Please upload at least one gallery photo under field "photo" or "photos"',
    });
  }

  const result = await clothAnalysisService.ingestGalleryPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    result.summaryMessage || `Gallery scanned: ${result.matchedUserImagesCount} photos matched your face, ${result.newWardrobeItemsCreated.length} new items added to wardrobe`
  );
});

/**
 * @desc    Analyze single photo to extract clothes and check wardrobe duplicates
 * @route   POST /api/cloth-analysis/analyze-photo
 * @access  Private
 */
const analyzePhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = extractFilesFromReq(req);
  const file = files[0] || req.file;
  const options = {
    wardrobeId: req.body.wardrobeId || req.query.wardrobeId || null,
    collectionId: req.body.collectionId || req.query.collectionId || null,
    verifyFace: req.body.verifyFace === 'true' || req.body.verifyFace === true,
    faceBoxes: req.body.faceBoxes || null,
  };
  const result = await clothAnalysisService.analyzePhoto(userId, file, options);

  return ApiResponse.success(res, result, 'Photo analyzed successfully with clothing recognition');
});

/**
 * @desc    Scan a single user gallery photo for authenticated user & extract clothing
 * @route   POST /api/cloth-analysis/scan-gallery-photo
 * @access  Private
 */
const scanGalleryPhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = extractFilesFromReq(req);
  const file = files[0] || req.file;
  const options = {
    wardrobeId: req.body.wardrobeId || req.query.wardrobeId || null,
    collectionId: req.body.collectionId || req.query.collectionId || null,
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
  const files = extractFilesFromReq(req);
  const options = {
    wardrobeId: req.body.wardrobeId || req.query.wardrobeId || null,
    collectionId: req.body.collectionId || req.query.collectionId || null,
    storagePlace: req.body.storagePlace || 'Main Closet',
  };

  const result = await clothAnalysisService.bulkAddDressPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    result.summaryMessage || `Bulk processing complete: ${result.newItemsCreated.length} items added to wardrobe, ${result.existingMatches.length} existing duplicate items skipped`
  );
});

/**
 * @desc    Ingest clothes from gallery photos (Face Match -> AI Garment Extract -> Digital Wardrobe Ingest)
 * @route   POST /api/cloth-analysis/ingest-gallery
 * @access  Private
 */
const ingestGalleryPhotos = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = extractFilesFromReq(req);
  const options = {
    wardrobeId: req.body.wardrobeId || req.query.wardrobeId || null,
    collectionId: req.body.collectionId || req.query.collectionId || null,
    autoCreateNewItems: req.body.autoCreateNewItems !== 'false' && req.body.autoCreateNewItems !== false,
    threshold: req.body.threshold ? parseFloat(req.body.threshold) : null,
  };

  const result = await clothAnalysisService.ingestGalleryPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    result.summaryMessage || `Gallery scanned: ${result.matchedUserImagesCount} photos matched your face, ${result.newWardrobeItemsCreated.length} new items added to wardrobe`
  );
});

module.exports = {
  extractDirectDress,
  extractFromGallery,
  analyzePhoto,
  scanGalleryPhoto,
  bulkAddPhotos,
  ingestGalleryPhotos,
};
