const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const ApiError = require('../../../utils/apiError');
const kitchenBoxCaptureService = require('./kitchenBoxCapture.service');

/**
 * Controller: Record a new sensor snapshot
 * POST /api/integration/captures
 */
const createCapture = asyncHandler(async (req, res) => {
  const { kitchenBoxId, hubId, image, tof, dimensions } = req.body;

  if (!kitchenBoxId) {
    throw new ApiError(400, 'kitchenBoxId is required (ObjectId or MAC address)');
  }

  const capture = await kitchenBoxCaptureService.createCapture({
    kitchenBoxId,
    hubId,
    image,
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
