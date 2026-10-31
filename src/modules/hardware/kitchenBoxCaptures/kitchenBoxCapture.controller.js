const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const kitchenBoxCaptureService = require('./kitchenBoxCapture.service');
const { saveBase64Image } = require('../../../middlewares/upload.middleware');

class KitchenBoxCaptureController {
  // POST /hardware/captures
  create = asyncHandler(async (req, res) => {
    let payload = { ...req.body };
    if (payload.image && typeof payload.image === 'string') {
      payload.image = await saveBase64Image(payload.image, req);
    }
    const capture = await kitchenBoxCaptureService.createCapture(payload);
    return ApiResponse.created(res, capture, 'KitchenBox capture saved successfully');
  });

  // GET /hardware/captures
  getAll = asyncHandler(async (req, res) => {
    const result = await kitchenBoxCaptureService.getCaptures(req.query);
    return ApiResponse.success(res, result, 'KitchenBox captures retrieved successfully');
  });

  // GET /hardware/captures/:id
  getById = asyncHandler(async (req, res) => {
    const capture = await kitchenBoxCaptureService.getCaptureById(req.params.id);
    return ApiResponse.success(res, capture, 'KitchenBox capture retrieved successfully');
  });

  // GET /hardware/captures/box/:kitchenBoxId
  getByBoxId = asyncHandler(async (req, res) => {
    const result = await kitchenBoxCaptureService.getCapturesByBoxId(
      req.params.kitchenBoxId,
      req.query
    );
    return ApiResponse.success(res, result, 'KitchenBox captures retrieved successfully');
  });

  // GET /hardware/captures/box/:kitchenBoxId/latest
  getLatestByBoxId = asyncHandler(async (req, res) => {
    const capture = await kitchenBoxCaptureService.getLatestCaptureByBoxId(
      req.params.kitchenBoxId
    );
    return ApiResponse.success(res, capture, 'Latest KitchenBox capture retrieved successfully');
  });

  // GET /hardware/captures/hub/:hubId
  getByHubId = asyncHandler(async (req, res) => {
    const result = await kitchenBoxCaptureService.getCapturesByHubId(
      req.params.hubId,
      req.query
    );
    return ApiResponse.success(res, result, 'Hub captures retrieved successfully');
  });

  // DELETE /hardware/captures/:id
  remove = asyncHandler(async (req, res) => {
    const result = await kitchenBoxCaptureService.deleteCapture(req.params.id);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new KitchenBoxCaptureController();

