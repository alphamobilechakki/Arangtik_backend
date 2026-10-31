const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const ApiError = require('../../../utils/apiError');
const kitchenBoxCaptureService = require('./kitchenBoxCapture.service');
const { saveBase64Image } = require('../../../middlewares/upload.middleware');

/**
 * Controller: Record a new sensor snapshot
 * POST /api/integration/captures
 */
const createCapture = asyncHandler(async (req, res) => {
  const { kitchenBoxId, hubId, image, tof, dimensions } = req.body;

  if (!kitchenBoxId) {
    throw new ApiError(400, 'kitchenBoxId is required (ObjectId or MAC address)');
  }

  // Convert base64 image (Data URI or raw base64) to static file in /uploads
  let savedImageUrl = image;
  if (image && typeof image === 'string') {
    savedImageUrl = await saveBase64Image(image, req);
  }

  const capture = await kitchenBoxCaptureService.createCapture({
    kitchenBoxId,
    hubId,
    image: savedImageUrl,
    tof,
    dimensions,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, capture, 'KitchenBox sensor capture snapshot recorded successfully'));
});

module.exports = {
  createCapture,
};
