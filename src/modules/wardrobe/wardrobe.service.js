const WardrobeItem = require('./wardrobe.model');
const ApiError = require('../../utils/apiError');
const aiVisionService = require('./aiVision.service');

/**
 * Analyze an uploaded photo from gallery or camera to detect garments, crop them, and match with wardrobe
 */
const analyzePhoto = async (userId, file) => {
  if (!file) {
    throw new ApiError(400, 'Please upload an image to analyze');
  }

  const originalImageUrl = `/uploads/${file.filename}`;
  const filePath = file.path;

  // 1. Detect garments and extract attributes using AI
  const rawDetections = await aiVisionService.analyzeImageWithGemini(filePath);

  // 2. Crop detected clothing pieces from the original image
  const croppedDetections = await aiVisionService.cropDetectedItems(filePath, rawDetections);

  // 3. Fetch existing wardrobe items for this user to check for duplicates/matches
  const existingItems = await WardrobeItem.find({ userId, storeType: 'WARDROBE' });

  // 4. Perform hybrid matching (Exact match, Ambiguous match, New item)
  const matchedDetections = aiVisionService.matchAgainstWardrobe(croppedDetections, existingItems);

  return {
    originalImageUrl,
    detectedItemsCount: matchedDetections.length,
    analysis: matchedDetections,
  };
};

/**
 * Add a new item to the user's Wardrobe / Store
 */
const addItem = async (userId, itemData) => {
  const {
    name,
    storeType = 'WARDROBE',
    category,
    subCategory,
    images = [],
    attributes = {},
    currentStatus = 'AVAILABLE',
    storageLocation,
    laundryCare,
    tags = [],
  } = itemData;

  if (!name || !category) {
    throw new ApiError(400, 'Item name and category are required');
  }

  // Ensure primary image flag is set if images exist
  let processedImages = images;
  if (Array.isArray(images) && images.length > 0) {
    const hasPrimary = images.some((img) => img.isPrimary);
    processedImages = images.map((img, idx) => ({
      ...img,
      isPrimary: hasPrimary ? !!img.isPrimary : idx === 0,
    }));
  }

  const newItem = await WardrobeItem.create({
    userId,
    name,
    storeType,
    category,
    subCategory,
    images: processedImages,
    attributes,
    currentStatus,
    currentLocation: storageLocation || { storagePlace: 'Main Closet' },
    laundryCare: laundryCare || {
      washTypePreferred: 'MACHINE_WASH',
      ironPreferred: true,
    },
    tags,
  });

  return newItem;
};

/**
 * Get all items from wardrobe store with search, filters, and pagination
 */
const getAllItems = async (userId, queryParams = {}) => {
  const {
    storeType = 'WARDROBE',
    category,
    subCategory,
    status,
    color,
    occasion,
    season,
    favorite,
    search,
    page = 1,
    limit = 20,
    sort = '-createdAt',
  } = queryParams;

  const filter = {
    userId,
    storeType,
  };

  if (category) filter.category = category;
  if (subCategory) filter.subCategory = new RegExp(`^${subCategory}$`, 'i');
  if (status) filter.currentStatus = status;
  if (favorite !== undefined) filter['usageStats.isFavorite'] = favorite === 'true' || favorite === true;

  // Filter inside dynamic attributes Map
  if (color) {
    filter['attributes.primaryColor'] = new RegExp(color, 'i');
  }
  if (occasion) {
    filter['attributes.occasions'] = { $in: [new RegExp(occasion, 'i')] };
  }
  if (season) {
    filter['attributes.seasons'] = { $in: [new RegExp(season, 'i')] };
  }

  // Keyword search
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { subCategory: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
      { 'attributes.brand': { $regex: search, $options: 'i' } },
    ];
  }

  // Sorting
  let sortOption = { createdAt: -1 };
  if (sort === 'mostWorn') sortOption = { 'usageStats.wearCount': -1 };
  else if (sort === 'lastWorn') sortOption = { 'usageStats.lastWornDate': -1 };
  else if (sort === 'newest') sortOption = { createdAt: -1 };
  else if (sort === 'oldest') sortOption = { createdAt: 1 };
  else if (typeof sort === 'string') sortOption = sort;

  const pageNumber = Math.max(1, parseInt(page, 10));
  const limitNumber = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNumber - 1) * limitNumber;

  const [items, totalItems] = await Promise.all([
    WardrobeItem.find(filter).sort(sortOption).skip(skip).limit(limitNumber),
    WardrobeItem.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limitNumber),
      currentPage: pageNumber,
      limit: limitNumber,
      hasNextPage: pageNumber * limitNumber < totalItems,
      hasPrevPage: pageNumber > 1,
    },
  };
};

/**
 * Get item details by ID
 */
const getItemById = async (userId, itemId) => {
  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  return item;
};

/**
 * Update an existing wardrobe item (PATCH)
 */
const updateItem = async (userId, itemId, updateData) => {
  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  // Prevent updating non-editable core fields directly
  const allowedFields = [
    'name',
    'category',
    'subCategory',
    'images',
    'attributes',
    'currentStatus',
    'storageLocation',
    'laundryCare',
    'tags',
    'usageStats',
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'attributes' && typeof updateData.attributes === 'object') {
        // Merge or update attributes Map
        for (const [attrKey, attrVal] of Object.entries(updateData.attributes)) {
          item.attributes.set(attrKey, attrVal);
        }
      } else if (field === 'storageLocation') {
        item.currentLocation = {
          ...item.currentLocation.toObject(),
          ...updateData.storageLocation,
        };
      } else if (field === 'laundryCare') {
        item.laundryCare = {
          ...item.laundryCare.toObject(),
          ...updateData.laundryCare,
        };
      } else {
        item[field] = updateData[field];
      }
    }
  }

  await item.save();
  return item;
};

/**
 * Quick update item operational status (PATCH)
 */
const updateItemStatus = async (userId, itemId, status) => {
  const validStatuses = [
    'AVAILABLE',
    'IN_USE',
    'DIRTY',
    'IN_LAUNDRY',
    'LENT_OUT',
    'IN_REPAIR',
    'ARCHIVED',
  ];

  if (!status || !validStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  item.currentStatus = status;
  await item.save();

  return item;
};

/**
 * Delete / Archive item from wardrobe store
 */
const deleteItem = async (userId, itemId, permanent = false) => {
  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  if (permanent === true || permanent === 'true') {
    await WardrobeItem.deleteOne({ _id: itemId, userId });
    return { deleted: true, permanent: true };
  } else {
    item.currentStatus = 'ARCHIVED';
    await item.save();
    return { deleted: true, archived: true, item };
  }
};

const WearLog = require('./wearLog.model');

/**
 * Log a worn dress / outfit into Wear History and increment wear statistics
 */
const logWornDress = async (userId, logData) => {
  const {
    itemIds = [],
    wornDate = new Date(),
    occasion = 'CASUAL',
    sourcePhotoUrl,
    location,
    notes,
    rating,
    markAsDirty = false,
  } = logData;

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new ApiError(400, 'Please select at least one wardrobe item to log');
  }

  // Fetch all items to record snapshot details
  const items = await WardrobeItem.find({ _id: { $in: itemIds }, userId });

  if (items.length === 0) {
    throw new ApiError(404, 'No valid wardrobe items found for the given IDs');
  }

  const itemsSnapshot = items.map((item) => ({
    itemId: item._id,
    name: item.name,
    category: item.category,
    subCategory: item.subCategory,
    photoUrl: item.images?.find((img) => img.isPrimary)?.url || item.images?.[0]?.url,
  }));

  // Create WearLog document
  const wearLog = await WearLog.create({
    userId,
    items: itemsSnapshot,
    wornDate: new Date(wornDate),
    occasion,
    sourcePhotoUrl,
    location,
    notes,
    rating,
  });

  // Increment wear count and update lastWornDate for each item
  const updatePromises = items.map((item) => {
    item.usageStats.wearCount = (item.usageStats.wearCount || 0) + 1;
    item.usageStats.useCount = (item.usageStats.useCount || 0) + 1;
    item.usageStats.lastWornDate = new Date(wornDate);
    item.usageStats.lastUsedDate = new Date(wornDate);

    if (markAsDirty === true || markAsDirty === 'true') {
      item.currentStatus = 'DIRTY';
    }

    return item.save();
  });

  await Promise.all(updatePromises);

  return wearLog;
};

/**
 * Get user wear history logs with pagination and filters
 */
const getWearHistory = async (userId, queryParams = {}) => {
  const { occasion, itemId, page = 1, limit = 20 } = queryParams;

  const filter = { userId };
  if (occasion) filter.occasion = occasion;
  if (itemId) filter['items.itemId'] = itemId;

  const pageNumber = Math.max(1, parseInt(page, 10));
  const limitNumber = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNumber - 1) * limitNumber;

  const [logs, totalLogs] = await Promise.all([
    WearLog.find(filter).sort({ wornDate: -1 }).skip(skip).limit(limitNumber),
    WearLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      totalLogs,
      totalPages: Math.ceil(totalLogs / limitNumber),
      currentPage: pageNumber,
      limit: limitNumber,
      hasNextPage: pageNumber * limitNumber < totalLogs,
      hasPrevPage: pageNumber > 1,
    },
  };
};

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_API_KEY } = require('../../config/env.config');

/**
 * AI Smart Stylist: Suggest matching outfits from user's currently AVAILABLE wardrobe collection
 */
const suggestOutfit = async (userId, options = {}) => {
  const {
    occasion = 'CASUAL',
    preferredStyle,
    weather,
    colorPreference,
    customPrompt,
  } = options;

  // STRICT RULE: Only fetch items that are AVAILABLE in closet
  const availableItems = await WardrobeItem.find({
    userId,
    storeType: 'WARDROBE',
    currentStatus: 'AVAILABLE',
  });

  if (availableItems.length === 0) {
    return {
      occasion,
      totalAvailableItems: 0,
      outfitSuggestions: [],
      message: 'No available items found in your wardrobe closet. Please add clothes or check items currently in laundry.',
    };
  }

  // If Gemini API Key is available, use Gemini for AI Stylist reasoning
  if (GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const itemsSummary = availableItems.map((item) => ({
        id: item._id.toString(),
        name: item.name,
        category: item.category,
        subCategory: item.subCategory,
        primaryColor: item.attributes?.get ? item.attributes.get('primaryColor') : item.attributes?.primaryColor,
        pattern: item.attributes?.get ? item.attributes.get('pattern') : item.attributes?.pattern,
        fabric: item.attributes?.get ? item.attributes.get('fabric') : item.attributes?.fabric,
        fit: item.attributes?.get ? item.attributes.get('fit') : item.attributes?.fit,
        occasions: item.attributes?.get ? item.attributes.get('occasions') : item.attributes?.occasions,
      }));

      const prompt = `
You are a professional Personal Fashion Stylist for Arangtik.
User Request:
- Occasion: "${occasion}"
- Preferred Style: "${preferredStyle || 'Any'}"
- Weather: "${JSON.stringify(weather || 'Normal')}"
- Color Preference: "${colorPreference || 'Any'}"
- Custom Note: "${customPrompt || 'None'}"

Here are the user's ONLY AVAILABLE clothes in their closet:
${JSON.stringify(itemsSummary, null, 2)}

Task:
Create 1 to 3 distinct stylish outfit combinations (e.g. Formal Look, Trendy Look, Festive Look) using ONLY the IDs from the available list.
For each outfit recommendation, select appropriate Topwear/Upper Wear, Bottomwear/Lower Wear, and if available Traditional/Footwear/Outerwear/Accessories.

Return a raw JSON array of objects with:
- "title": Descriptive title (e.g. "Sharp Corporate Meeting Look", "Royal Festive Attire")
- "itemIds": Array of exact IDs used
- "stylingTip": Explanation in Hinglish/English of why this combination works for ${occasion}
- "colorHarmony": Description of color match (e.g. "Contrast of Navy Blue with Beige")
- "matchScore": Number between 80 and 99

Return ONLY raw valid JSON without markdown formatting or code blocks.
`;

      const result = await model.generateContent(prompt);
      const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedOutfits = JSON.parse(cleanJson);

      const formattedSuggestions = (Array.isArray(parsedOutfits) ? parsedOutfits : parsedOutfits.outfits || []).map((outfit) => {
        const outfitItems = availableItems.filter((it) => (outfit.itemIds || []).includes(it._id.toString()));
        return {
          title: outfit.title,
          stylingTip: outfit.stylingTip,
          colorHarmony: outfit.colorHarmony,
          matchScore: outfit.matchScore || 90,
          itemsCount: outfitItems.length,
          items: outfitItems,
        };
      });

      return {
        occasion,
        totalAvailableItems: availableItems.length,
        outfitSuggestions: formattedSuggestions,
      };
    } catch (err) {
      console.error('Gemini Stylist error, using fashion rules engine fallback:', err.message);
    }
  }

  // Intelligent Fallback Fashion Rules Engine
  const uppers = availableItems.filter((i) => i.category === 'UPPER_WEAR');
  const lowers = availableItems.filter((i) => i.category === 'LOWER_WEAR');
  const traditionals = availableItems.filter((i) => i.category === 'TRADITIONAL');
  const footwears = availableItems.filter((i) => i.category === 'FOOTWEAR');

  const suggestions = [];

  // 1. Traditional Look for Wedding / Festive
  if (['WEDDING', 'PARTY', 'FESTIVE'].includes(occasion.toUpperCase()) && traditionals.length > 0) {
    const selectedTrad = traditionals[0];
    const matchingFootwear = footwears[0];
    const combo = [selectedTrad, matchingFootwear].filter(Boolean);

    suggestions.push({
      title: 'Royal Ethnic Look',
      stylingTip: `Aapka ${selectedTrad.name} ${occasion} ke liye perfect traditional grace deta hai.`,
      colorHarmony: 'Classic Ethnic Palette',
      matchScore: 94,
      itemsCount: combo.length,
      items: combo,
    });
  }

  // 2. Upper + Lower Combination for Office / Interview / Casual
  if (uppers.length > 0) {
    const selectedUpper = uppers[0];
    const selectedLower = lowers.length > 0 ? lowers[0] : null;
    const selectedFootwear = footwears.length > 0 ? footwears[0] : null;
    const combo = [selectedUpper, selectedLower, selectedFootwear].filter(Boolean);

    const isFormal = ['OFFICE', 'FORMAL', 'INTERVIEW'].includes(occasion.toUpperCase());
    suggestions.push({
      title: isFormal ? 'Sharp Professional Look' : 'Effortless Smart Look',
      stylingTip: `Ye combination ${selectedUpper.name} ke sath clean contrast banata hai jo ${occasion} ke liye well-balanced hai.`,
      colorHarmony: 'Balanced Color Contrast',
      matchScore: isFormal ? 92 : 88,
      itemsCount: combo.length,
      items: combo,
    });
  }

  return {
    occasion,
    totalAvailableItems: availableItems.length,
    outfitSuggestions: suggestions,
  };
};

/**
 * Lend wardrobe item to a friend/relative (Status -> LENT_OUT)
 */
const lendItem = async (userId, lendData) => {
  const {
    itemId,
    assignedTo,
    assignedPhone,
    purpose = 'LENT_FOR_WEARING',
    givenDate = new Date(),
    expectedReturnDate,
  } = lendData;

  if (!itemId || !assignedTo) {
    throw new ApiError(400, 'Item ID and recipient name (assignedTo) are required');
  }

  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  if (item.currentStatus === 'LENT_OUT') {
    throw new ApiError(400, `Item is already lent out to ${item.activeAssignment?.assignedTo || 'someone'}`);
  }

  item.currentStatus = 'LENT_OUT';
  item.currentLocation = {
    ...item.currentLocation.toObject(),
    holderPerson: {
      name: assignedTo,
      phone: assignedPhone || '',
      relation: 'Friend/Family',
    },
  };

  item.activeAssignment = {
    assignedTo,
    assignedPhone: assignedPhone || '',
    purpose,
    givenDate: new Date(givenDate),
    expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
  };

  await item.save();
  return item;
};

/**
 * Return a lent item back to Wardrobe Store (Status -> AVAILABLE)
 */
const returnLentItem = async (userId, itemId) => {
  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  if (item.currentStatus !== 'LENT_OUT') {
    throw new ApiError(400, 'Item is not currently lent out');
  }

  item.currentStatus = 'AVAILABLE';
  item.currentLocation = {
    storagePlace: item.currentLocation?.storagePlace || 'Main Closet',
    holderPerson: null,
  };
  item.activeAssignment = null;

  await item.save();
  return item;
};

/**
 * Get all items currently lent out to friends / outside
 */
const getLentItems = async (userId) => {
  const items = await WardrobeItem.find({
    userId,
    storeType: 'WARDROBE',
    currentStatus: 'LENT_OUT',
  }).sort({ 'activeAssignment.expectedReturnDate': 1 });

  return {
    totalLentItems: items.length,
    items,
  };
};

module.exports = {
  analyzePhoto,
  addItem,
  getAllItems,
  getItemById,
  updateItem,
  updateItemStatus,
  deleteItem,
  logWornDress,
  getWearHistory,
  suggestOutfit,
  lendItem,
  returnLentItem,
  getLentItems,
};
