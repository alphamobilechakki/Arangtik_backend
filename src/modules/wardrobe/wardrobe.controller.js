const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const wardrobeService = require('./wardrobe.service');

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
 * @desc    Analyze uploaded photo(s) to extract clothes and return auto-filled fields (Single or Bulk)
 * @route   POST /api/wardrobe/analyze-photo
 * @access  Private
 */
const analyzePhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = extractFilesFromReq(req);
  const options = {
    wardrobeId: req.body?.wardrobeId || req.query?.wardrobeId || null,
    verifyFace: req.body?.verifyFace === 'true' || req.body?.verifyFace === true,
    faceBoxes: req.body?.faceBoxes || null,
  };

  if (files.length === 0) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: 'Please upload at least one clothing photo under field "photo" or "photos"',
    });
  }

  // Single photo analysis mode
  if (files.length === 1) {
    const result = await wardrobeService.analyzePhoto(userId, files[0], options);
    return ApiResponse.success(res, result, 'Photo analyzed successfully with clothing recognition');
  }

  // Bulk photos analysis mode (multiple photos)
  const results = [];
  let totalGarments = 0;
  for (const file of files) {
    try {
      const singleRes = await wardrobeService.analyzePhoto(userId, file, options);
      results.push(singleRes);
      totalGarments += singleRes.detectedItemsCount || 1;
    } catch (err) {
      console.warn(`[analyzePhoto bulk] Error analyzing file ${file.filename}:`, err.message);
      results.push({ filename: file.filename, error: err.message });
    }
  }

  return ApiResponse.success(
    res,
    {
      totalPhotosAnalyzed: files.length,
      totalGarmentsDetected: totalGarments,
      items: results,
    },
    `Bulk photos analyzed successfully (${totalGarments} garment(s) detected across ${files.length} photos)`
  );
});

/**
 * @desc    Add item(s) to wardrobe store (supports JSON, Single Photo, or Bulk Photos)
 * @route   POST /api/wardrobe/add-item
 * @access  Private
 */
const addItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = extractFilesFromReq(req);

  // Bulk Add mode (if multiple photos uploaded)
  if (files.length > 1) {
    const createdItems = [];
    for (const file of files) {
      try {
        const item = await wardrobeService.addItem(userId, req.body, file);
        createdItems.push(item);
      } catch (err) {
        console.warn(`[addItem bulk] Error adding file ${file.filename}:`, err.message);
      }
    }
    return ApiResponse.created(
      res,
      {
        totalPhotosReceived: files.length,
        totalItemsCreated: createdItems.length,
        items: createdItems,
      },
      `Bulk items added successfully (${createdItems.length} items added to wardrobe)`
    );
  }

  // Batch Add mode from UI selection array (e.g. items selected by user after analyze-photo)
  let itemsList = req.body?.items;
  if (typeof itemsList === 'string') {
    try {
      itemsList = JSON.parse(itemsList);
    } catch (e) {
      itemsList = null;
    }
  }

  if (Array.isArray(itemsList) && itemsList.length > 0) {
    const createdItems = [];
    for (const singleItem of itemsList) {
      try {
        const item = await wardrobeService.addItemFromDetection(userId, singleItem, {
          wardrobeId: req.body.wardrobeId || singleItem.wardrobeId,
          sourcePhotoUrl: singleItem.sourcePhotoUrl || singleItem.originalImageUrl || '',
          sourceImageHash: singleItem.sourceImageHash || null,
        });
        createdItems.push(item);
      } catch (err) {
        console.warn(`[addItem multi-select] Error adding item "${singleItem.name}":`, err.message);
      }
    }
    return ApiResponse.created(
      res,
      {
        totalItemsCreated: createdItems.length,
        items: createdItems,
      },
      `Successfully added ${createdItems.length} selected item(s) to wardrobe`
    );
  }

  // Auto-Add All mode for single outfit photo containing multiple garments
  const singleFile = files[0] || null;
  if (
    singleFile &&
    (req.body.autoAddAll === true ||
      req.body.autoAddAll === 'true' ||
      req.body.addAll === true ||
      req.body.addAll === 'true')
  ) {
    const clothAnalysisService = require('../clothAnalysis/clothAnalysis.service');
    const analysisResult = await clothAnalysisService.analyzePhoto(userId, singleFile, {
      wardrobeId: req.body.wardrobeId,
    });
    const detectedItems = analysisResult.analysis || [];
    if (detectedItems.length > 1) {
      const createdItems = [];
      for (const det of detectedItems) {
        try {
          const item = await wardrobeService.addItemFromDetection(userId, det, {
            wardrobeId: req.body.wardrobeId,
            sourcePhotoUrl: `/uploads/${singleFile.filename}`,
            sourceImageHash: analysisResult.sourceImageHash,
          });
          createdItems.push(item);
        } catch (err) {
          console.warn(`[addItem autoAddAll] Error adding item "${det.name}":`, err.message);
        }
      }
      return ApiResponse.created(
        res,
        {
          totalItemsCreated: createdItems.length,
          items: createdItems,
        },
        `Detected and added all ${createdItems.length} items from photo to wardrobe`
      );
    }
  }

  const item = await wardrobeService.addItem(userId, req.body, singleFile);

  return ApiResponse.created(res, item, 'Item added successfully to wardrobe store');
});

/**
 * @desc    Get all items from wardrobe store with filters & pagination
 * @route   GET /api/wardrobe/get-all-items
 * @access  Private
 */
const getAllItems = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.getAllItems(userId, req.query);

  return ApiResponse.success(res, result, 'Wardrobe items fetched successfully');
});

/**
 * @desc    Get single item details by ID
 * @route   GET /api/wardrobe/get-item-details/:id
 * @access  Private
 */
const getItemDetails = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const item = await wardrobeService.getItemById(userId, req.params.id);

  return ApiResponse.success(res, item, 'Wardrobe item details fetched successfully');
});

/**
 * @desc    Update an existing wardrobe item
 * @route   PATCH /api/wardrobe/update-item/:id
 * @access  Private
 */
const updateItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updatedItem = await wardrobeService.updateItem(userId, req.params.id, req.body);

  return ApiResponse.success(res, updatedItem, 'Wardrobe item updated successfully');
});

/**
 * @desc    Delete / Archive item from wardrobe store
 * @route   DELETE /api/wardrobe/delete-item/:id
 * @access  Private
 */
const deleteItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { permanent } = req.query;
  const result = await wardrobeService.deleteItem(userId, req.params.id, permanent);

  return ApiResponse.success(res, result, 'Wardrobe item deleted/archived successfully');
});

/**
 * @desc    Ingest clothes from gallery photos (Face Match -> AI Garment Extract -> Digital Wardrobe Ingest)
 * @route   POST /api/wardrobe/ingest-gallery
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

  const result = await wardrobeService.ingestGalleryPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    `Gallery scanned: ${result.matchedUserImagesCount} photos matched your face, ${result.newWardrobeItemsCreated.length} new items added to wardrobe`
  );
});

/**
 * @desc    Bulk add standalone dress photos (1 to 100 photos)
 * @route   POST /api/wardrobe/bulk-add-photos
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

  const result = await wardrobeService.bulkAddDressPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    `Bulk processing complete: ${result.newItemsCreated.length} items added to wardrobe, ${result.existingMatches.length} existing items matched`
  );
});

/**
 * @desc    Scan a single user gallery photo for authenticated user & extract clothing
 * @route   POST /api/wardrobe/scan-gallery-photo
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

  const result = await wardrobeService.scanGalleryPhoto(userId, file, options);

  const message = result.matched
    ? `User matched successfully! Extracted ${result.detectedItemsCount} clothing items.`
    : 'User face not detected in this photo. Skipped clothing extraction.';

  return ApiResponse.success(res, result, message);
});

/**
 * @desc    Create a new Wardrobe (Closet container)
 * @route   POST /api/wardrobe/create-wardrobe OR /api/wardrobe/closets
 * @access  Private
 */
const createWardrobe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const ownerFaceFile = req.files?.ownerFaceImage?.[0] || null;
  const coverFile =
    req.files?.coverImage?.[0] ||
    req.files?.photo?.[0] ||
    req.files?.image?.[0] ||
    req.file ||
    null;

  const filesObj = {
    ownerFaceImage: ownerFaceFile,
    coverImage: coverFile,
  };
  const result = await wardrobeService.createWardrobe(userId, req.body, filesObj);

  return ApiResponse.created(res, result, 'Wardrobe closet created successfully');
});

/**
 * @desc    Get all active Wardrobes for user
 * @route   GET /api/wardrobe/get-wardrobes OR /api/wardrobe/closets
 * @access  Private
 */
const getWardrobes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.getWardrobes(userId, req.query);

  return ApiResponse.success(res, result, 'Wardrobe closets fetched successfully');
});

/**
 * @desc    Trigger AI Human-to-Garment & Ghost Mannequin extraction pipeline
 * @route   POST /api/wardrobe/items/:id/garment-processing
 * @access  Private
 */
const triggerGarmentProcessing = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.id || req.params.itemId;
  const options = req.body || {};

  const job = await wardrobeService.triggerGarmentProcessing(userId, itemId, options);

  return ApiResponse.success(
    res,
    job,
    'Garment extraction and ghost mannequin processing initiated'
  );
});

/**
 * @desc    Get Garment Processing Job status and output URLs
 * @route   GET /api/wardrobe/items/:id/garment-processing/status
 * @access  Private
 */
const getGarmentProcessingStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const identifier = req.params.id || req.params.itemId || req.params.jobId;

  const job = await wardrobeService.getGarmentProcessingStatus(userId, identifier);

  return ApiResponse.success(res, job, 'Garment processing job status fetched');
});

/**
 * @desc    Retry Garment Processing Job
 * @route   POST /api/wardrobe/items/:id/garment-processing/retry
 * @access  Private
 */
const retryGarmentProcessing = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.id || req.params.itemId;
  const options = req.body || {};

  const job = await wardrobeService.retryGarmentProcessing(userId, itemId, options);

  return ApiResponse.success(
    res,
    job,
    'Garment processing job retried successfully'
  );
});

/**
 * @desc    Validate body pose and garment occlusion coordinates against avatar guide
 * @route   POST /api/wardrobe/pose-validation
 * @access  Private
 */
const validatePose = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const file = req.file || req.files?.photo?.[0] || req.files?.image?.[0] || req.files?.file?.[0] || null;

  const result = await wardrobeService.validatePose(userId, file, req.body || {});

  const message = result.poseStatus === 'POSE_VALID'
    ? 'Pose is perfectly aligned with avatar guide'
    : `Pose status: ${result.poseStatus}`;

  return ApiResponse.success(res, result, message);
});

module.exports = {
  createWardrobe,
  getWardrobes,
  addItem,
  getAllItems,
  getItemDetails,
  updateItem,
  deleteItem,
  analyzePhoto,
  scanGalleryPhoto,
  bulkAddPhotos,
  ingestGalleryPhotos,
  // Garment processing handlers
  triggerGarmentProcessing,
  getGarmentProcessingStatus,
  retryGarmentProcessing,
  validatePose,
};
