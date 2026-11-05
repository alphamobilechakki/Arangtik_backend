const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const wardrobeService = require('./wardrobe.service');
const { formatUploadUrl } = require('../../utils/url.util');

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
 * @desc    Add item to wardrobe store (Single unified endpoint)
 *          Handles photo upload, with/without person mode, Python AI split & background Gemini analysis
 * @route   POST /api/wardrobe/add-item
 * @access  Private
 */
const addItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = extractFilesFromReq(req);
  const mode = req.body.mode || req.body.personMode || req.body.type || (req.body.withPerson === 'true' || req.body.withPerson === true ? 'with_person' : 'without_person');

  // Multi-Photo or Single Photo Upload mode (e.g. 1 to 50 gallery photos)
  if (files.length > 0) {
    const clothAnalysisService = require('../clothAnalysis/clothAnalysis.service');
    const createdItems = [];
    const duplicateItems = [];

    // Har image ke liye alag item create hoga aur background me process hoga
    for (const file of files) {
      try {
        const result = await clothAnalysisService.processAndSaveWardrobeItem(userId, file, {
          ...req.body,
          mode,
        });

        if (result.isDuplicate) {
          duplicateItems.push(result.item);
        } else if (result.item) {
          createdItems.push(result.item);
        }
      } catch (err) {
        console.warn(`[addItem] Error processing photo ${file.filename}:`, err.message);
      }
    }

    // Single photo response format
    if (files.length === 1) {
      if (duplicateItems.length > 0 && createdItems.length === 0) {
        return ApiResponse.success(
          res,
          {
            item: duplicateItems[0],
            isDuplicate: true,
            duplicates: duplicateItems,
            items: [],
          },
          `This dress already exists in your Almari as "${duplicateItems[0].name}" (skipped duplicate addition).`
        );
      }
      return ApiResponse.created(res, createdItems[0], 'Item added successfully to wardrobe store');
    }

    // Multiple photos response format (e.g. 10 photos uploaded from gallery at once)
    return ApiResponse.created(
      res,
      {
        totalUploaded: files.length,
        totalCreated: createdItems.length,
        totalDuplicates: duplicateItems.length,
        items: createdItems,
        duplicates: duplicateItems,
      },
      `${createdItems.length} item(s) added successfully! Processing each photo in background.`
    );
  }

  // Fallback for manual JSON item creation without photo
  const item = await wardrobeService.addItem(userId, req.body, null);
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
 * @desc    Create a new Wardrobe (Closet container)
 * @route   POST /api/wardrobe/create-wardrobe
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
 * @route   GET /api/wardrobe/get-wardrobes
 * @access  Private
 */
const getWardrobes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.getWardrobes(userId, req.query);

  return ApiResponse.success(res, result, 'Wardrobes fetched successfully');
});

/**
 * @desc    Get single Wardrobe by ID
 * @route   GET /api/wardrobe/get-wardrobe/:id
 * @access  Private
 */
const getWardrobeById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const includeDeleted = req.query.includeDeleted === 'true' || req.query.includeDeleted === true;
  const result = await wardrobeService.getWardrobeById(userId, req.params.id, { includeDeleted });

  return ApiResponse.success(res, result, 'Wardrobe container retrieved successfully');
});

/**
 * @desc    Update a wardrobe container
 * @route   PATCH /api/wardrobe/update-wardrobe/:id
 * @access  Private
 */
const updateWardrobe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const wardrobeId = req.params.id;
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
  const result = await wardrobeService.updateWardrobe(userId, wardrobeId, req.body, filesObj);

  return ApiResponse.success(res, result, 'Wardrobe container updated successfully');
});

/**
 * @desc    Delete a wardrobe container (Soft deletion by default, hard via ?hard=true)
 * @route   DELETE /api/wardrobe/delete-wardrobe/:id
 * @access  Private
 */
const deleteWardrobe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const wardrobeId = req.params.id;
  const hard = req.query.hard === 'true' || req.query.hard === true;
  const result = await wardrobeService.deleteWardrobe(userId, wardrobeId, { hard });

  return ApiResponse.success(res, result, result.message);
});

/**
 * @desc    Restore a soft-deleted wardrobe container
 * @route   PATCH /api/wardrobe/restore-wardrobe/:id
 * @access  Private
 */
const restoreWardrobe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const wardrobeId = req.params.id;
  const result = await wardrobeService.restoreWardrobe(userId, wardrobeId);

  return ApiResponse.success(res, result, 'Wardrobe container restored successfully');
});

/**
 * @desc    Generate 3D model (.glb) for a wardrobe garment using Hugging Face TripoSR
 * @route   POST /api/wardrobe/generate-3d/:id
 * @access  Private
 */
const generateItem3D = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.id;

  const result = await wardrobeService.generateItem3DModel(userId, itemId);

  return ApiResponse.success(res, result, '3D Garment model generated successfully via TripoSR');
});

module.exports = {
  createWardrobe,
  getWardrobes,
  getWardrobeById,
  updateWardrobe,
  deleteWardrobe,
  restoreWardrobe,
  addItem,
  getAllItems,
  getItemDetails,
  updateItem,
  deleteItem,
  generateItem3D,
};
