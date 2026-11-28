const AiLook = require('./aiLook.model');
const User = require('../auth/user.model');
const WardrobeItem = require('../wardrobe/wardrobeItem.model');
const Jewellery = require('../jewellery/item/jewellery.model');
const Event = require('../event/event.model');
const ApiError = require('../../utils/apiError');
const { enqueueAiStylistJob } = require('../../queues/aiStylist/aiStylist.queue');

const TOP_CATEGORIES = ['UPPER_WEAR', 'FULL_BODY', 'OUTERWEAR', 'ONE_PIECE'];
const BOTTOM_CATEGORIES = ['LOWER_WEAR'];

const EVENT_TO_PYTHON_OCCASION = {
  WEDDING: 'ethnic',
  FESTIVAL: 'ethnic',
  PARTY: 'party',
  BIRTHDAY: 'party',
  DATE_NIGHT: 'party',
  FORMAL_MEETING: 'formal',
  CASUAL_OUTING: 'smart_casual',
  VACATION: 'smart_casual',
  SPORTS: 'smart_casual',
};

const mapEventToPythonOccasion = (eventTypeCode) =>
  EVENT_TO_PYTHON_OCCASION[String(eventTypeCode || '').trim().toUpperCase()] || 'smart_casual';

/**
 * Extract primary image URL from a WardrobeItem
 */
const getGarmentImageUrl = (item) => {
  if (!Array.isArray(item.images) || item.images.length === 0) return '';
  const primary = item.images.find((img) => img.isPrimary) || item.images[0];
  return primary?.url || '';
};

/**
 * Validate and resolve a WardrobeItem belonging to the user
 */
const resolveWardrobeGarment = async (itemId, userId, allowedCategories, label) => {
  const item = await WardrobeItem.findOne({ _id: itemId, userId });
  if (!item) {
    throw new ApiError(404, `${label} not found in your wardrobe`);
  }
  if (item.status !== 'ACTIVE') {
    throw new ApiError(400, `${label} is currently inactive or in laundry`);
  }
  if (item.processingStatus === 'PROCESSING') {
    throw new ApiError(400, `${label} is still being processed`);
  }
  if (allowedCategories.length && item.category && !allowedCategories.includes(item.category.toUpperCase())) {
    throw new ApiError(400, `${label} has invalid category (${item.category})`);
  }
  const imageUrl = getGarmentImageUrl(item);
  if (!imageUrl) {
    throw new ApiError(400, `${label} has no image available`);
  }
  return imageUrl;
};

/**
 * Create an AiLook record and enqueue the Python Virtual Try-On job
 */
const generateLook = async (userId, payload) => {
  const { topWearId, bottomWearId, jewelleryIds = [], eventId, maxCombinations = 1 } = payload;

  // 1. Prevent duplicate concurrent generation per user
  const activeLook = await AiLook.findOne({
    userId,
    isDeleted: { $ne: true },
    status: { $in: ['PENDING', 'PROCESSING'] },
  }).select('_id status');

  if (activeLook) {
    throw new ApiError(409, 'An AI look is already being generated. Please wait for it to finish.');
  }

  // 2. Resolve user avatar
  const user = await User.findById(userId).select('avatar referenceFace.imagePath');
  const avatarUrl = user?.avatar || user?.referenceFace?.imagePath || '';
  if (!avatarUrl) {
    throw new ApiError(400, 'Please upload or set a profile avatar first');
  }

  // 3. Validate event ownership & map eventTypeCode to Python occasion
  let pythonOccasion = 'smart_casual';
  if (eventId) {
    const event = await Event.findOne({ _id: eventId, userId }).select('eventTypeCode');
    if (!event) {
      throw new ApiError(404, 'Selected event not found');
    }
    pythonOccasion = mapEventToPythonOccasion(event.eventTypeCode);
  }

  // 4. Validate garments & collect image URLs
  const garmentUrls = [];
  if (topWearId) {
    garmentUrls.push(await resolveWardrobeGarment(topWearId, userId, TOP_CATEGORIES, 'Top Wear'));
  }
  if (bottomWearId) {
    garmentUrls.push(await resolveWardrobeGarment(bottomWearId, userId, BOTTOM_CATEGORIES, 'Bottom Wear'));
  }

  // 5. Validate jewellery items & append their images to garments list
  if (jewelleryIds.length > 0) {
    const jewelleryItems = await Jewellery.find({ _id: { $in: jewelleryIds }, userId });
    if (jewelleryItems.length !== jewelleryIds.length) {
      throw new ApiError(404, 'One or more selected jewellery items were not found');
    }
    for (const jItem of jewelleryItems) {
      if (jItem.status === 'LEND' || jItem.status === 'CLEANING') {
        throw new ApiError(400, `Jewellery "${jItem.name || 'item'}" is currently ${jItem.status.toLowerCase()}`);
      }
      const jUrl = jItem.generatedImage?.url || jItem.sourceImage?.url || '';
      if (!jUrl) {
        throw new ApiError(400, `Jewellery "${jItem.name || 'item'}" has no image available`);
      }
      garmentUrls.push(jUrl);
    }
  }

  // 6. Create PENDING record in MongoDB
  const aiLook = await AiLook.create({
    userId,
    eventId: eventId || null,
    topWearId: topWearId || null,
    bottomWearId: bottomWearId || null,
    jewelleryIds,
    avatarUrl,
    status: 'PENDING',
  });

  // 7. Enqueue BullMQ job
  const job = await enqueueAiStylistJob({
    lookId: aiLook._id.toString(),
    userId: userId.toString(),
    avatarUrl,
    garmentUrls,
    occasion: pythonOccasion,
    maxCombinations,
  });

  aiLook.bullmqJobId = job.id ? String(job.id) : '';
  await aiLook.save();

  return {
    lookId: aiLook._id,
    status: aiLook.status,
  };
};

/**
 * List user's non-deleted AI looks (paginated)
 */
const getSavedLooks = async (userId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = { userId, isDeleted: { $ne: true } };
  if (query.status) {
    filter.status = query.status.toUpperCase();
  }

  const [looks, total] = await Promise.all([
    AiLook.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('topWearId', 'name category images')
      .populate('bottomWearId', 'name category images')
      .populate('jewelleryIds', 'name type sourceImage generatedImage')
      .populate('eventId', 'title eventDate eventTypeCode'),
    AiLook.countDocuments(filter),
  ]);

  return {
    looks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single AI look by ID (used for detail view & status polling)
 */
const getLookById = async (userId, lookId) => {
  const look = await AiLook.findOne({ _id: lookId, userId, isDeleted: { $ne: true } })
    .populate('topWearId', 'name category images')
    .populate('bottomWearId', 'name category images')
    .populate('jewelleryIds', 'name type sourceImage generatedImage')
    .populate('eventId', 'title eventDate eventTypeCode');

  if (!look) {
    throw new ApiError(404, 'AI look not found');
  }
  return look;
};

/**
 * Soft delete an AI look
 */
const softDeleteLook = async (userId, lookId) => {
  const look = await AiLook.findOneAndUpdate(
    { _id: lookId, userId, isDeleted: { $ne: true } },
    { $set: { isDeleted: true, deletedAt: new Date() } },
    { new: true }
  );

  if (!look) {
    throw new ApiError(404, 'AI look not found');
  }
  return null;
};

module.exports = {
  mapEventToPythonOccasion,
  generateLook,
  getSavedLooks,
  getLookById,
  softDeleteLook,
};
