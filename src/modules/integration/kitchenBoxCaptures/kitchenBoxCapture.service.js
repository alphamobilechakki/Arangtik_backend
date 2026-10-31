const mongoose = require('mongoose');
const KitchenBoxCapture = require('../../hardware/kitchenBoxCaptures/kitchenBoxCapture.model');
const KitchenBox = require('../../hardware/kitchenBox/kitchenBox.model');
const Hub = require('../../hardware/hub/hub.model');
const ApiError = require('../../../utils/apiError');
const { saveBase64Image } = require('../../../middlewares/upload.middleware');

/**
 * Helper: Resolve KitchenBox by ObjectId or MAC address
 */
const resolveKitchenBox = async (identifier) => {
  if (!identifier) return null;
  const str = String(identifier).trim();

  if (mongoose.Types.ObjectId.isValid(str)) {
    const box = await KitchenBox.findById(str);
    if (box) return box;
  }

  const boxByMac = await KitchenBox.findOne({ mac_id: str.toUpperCase() });
  if (boxByMac) return boxByMac;

  throw new ApiError(404, `KitchenBox not found for identifier: ${identifier}`);
};

/**
 * Helper: Resolve Hub by ObjectId or MAC address
 */
const resolveHub = async (identifier) => {
  if (!identifier) return null;
  const str = String(identifier).trim();

  if (mongoose.Types.ObjectId.isValid(str)) {
    const hub = await Hub.findById(str);
    if (hub) return hub;
  }

  const hubByMac = await Hub.findOne({ mac_id: str.toUpperCase() });
  if (hubByMac) return hubByMac;

  throw new ApiError(404, `Hub not found for identifier: ${identifier}`);
};

/**
 * Record a new sensor snapshot (kitchenBoxId, hubId, image, tof, dimensions)
 * Automatically syncs latest readings to the parent KitchenBox.
 */
const createCapture = async (data = {}) => {
  const { kitchenBoxId, hubId, image, tof, dimensions } = data;

  if (!kitchenBoxId) {
    throw new ApiError(400, 'kitchenBoxId is required (ObjectId or MAC address)');
  }

  // 1. Resolve KitchenBox
  const box = await resolveKitchenBox(kitchenBoxId);

  // 2. Resolve Hub: from hubId or fallback to box's hub_mac_id
  let resolvedHub = null;
  if (hubId) {
    resolvedHub = await resolveHub(hubId);
  } else if (box.hub_mac_id) {
    resolvedHub = await Hub.findOne({ mac_id: box.hub_mac_id });
  }

  if (!resolvedHub) {
    throw new ApiError(400, 'A valid hubId is required or box must be paired with an existing Hub');
  }

  // 3. Parse ToF distance
  let parsedTof = null;
  if (tof !== undefined && tof !== null && tof !== '') {
    parsedTof = parseFloat(tof);
    if (isNaN(parsedTof)) {
      throw new ApiError(400, 'tof must be a valid number');
    }
  }

  // 4. Save and resolve image URL (convert base64 if needed)
  let finalImageUrl = image ? String(image).trim() : null;
  if (
    finalImageUrl &&
    (finalImageUrl.startsWith('data:image') ||
      finalImageUrl.startsWith('/9j/') ||
      finalImageUrl.startsWith('iVBORw') ||
      (finalImageUrl.length > 100 && !finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('/')))
  ) {
    finalImageUrl = await saveBase64Image(finalImageUrl);
  }

  // 5. Create Capture record
  const capture = new KitchenBoxCapture({
    kitchenBoxId: box._id,
    hubId: resolvedHub._id,
    image: finalImageUrl,
    tof: parsedTof,
    dimensions: dimensions ? String(dimensions).trim() : box.dimensions || null,
  });

  await capture.save();

  // 6. Automatically sync latest readings to parent KitchenBox container
  const boxUpdates = {};
  if (parsedTof !== null) boxUpdates.tof = parsedTof;
  if (finalImageUrl) boxUpdates.image = finalImageUrl;
  if (dimensions) boxUpdates.dimensions = String(dimensions).trim();

  if (Object.keys(boxUpdates).length > 0) {
    await KitchenBox.findByIdAndUpdate(box._id, { $set: boxUpdates });
  }

  return KitchenBoxCapture.findById(capture._id)
    .populate('kitchenBoxId', 'name mac_id item_name dimensions status')
    .populate('hubId', 'name mac_id status');
};

module.exports = {
  createCapture,
};
