const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const kitchenBoxService = require('./kitchenBox.service');

class KitchenBoxController {
  // POST /hardware/boxes
  create = asyncHandler(async (req, res) => {
    const box = await kitchenBoxService.createKitchenBox({
      ...req.body,
      userId: req.body.userId || req.user?.id,
    });
    return ApiResponse.created(res, box, 'KitchenBox registered successfully');
  });

  // GET /hardware/boxes
  getAll = asyncHandler(async (req, res) => {
    const result = await kitchenBoxService.getKitchenBoxes({
      ...req.query,
      userId: req.query.userId || req.user?.id,
    });
    return ApiResponse.success(res, result, 'KitchenBoxes retrieved successfully');
  });

  // GET /hardware/boxes/:id
  getById = asyncHandler(async (req, res) => {
    const box = await kitchenBoxService.getKitchenBoxById(req.params.id);
    return ApiResponse.success(res, box, 'KitchenBox retrieved successfully');
  });

  // GET /hardware/boxes/mac/:mac_id
  getByMac = asyncHandler(async (req, res) => {
    const box = await kitchenBoxService.getKitchenBoxByMac(req.params.mac_id);
    return ApiResponse.success(res, box, 'KitchenBox retrieved successfully');
  });

  // PATCH /hardware/boxes/:id
  update = asyncHandler(async (req, res) => {
    const box = await kitchenBoxService.updateKitchenBox(req.params.id, req.body);
    return ApiResponse.success(res, box, 'KitchenBox updated successfully');
  });

  // PATCH /hardware/boxes/:id/tof
  updateTof = asyncHandler(async (req, res) => {
    const box = await kitchenBoxService.updateTof(req.params.id, req.body.tof);
    return ApiResponse.success(res, box, 'ToF reading updated successfully');
  });

  // PATCH /hardware/boxes/:id/status
  updateStatus = asyncHandler(async (req, res) => {
    const box = await kitchenBoxService.updateStatus(req.params.id, req.body.status);
    return ApiResponse.success(res, box, `KitchenBox status updated to ${box.status}`);
  });

  // DELETE /hardware/boxes/:id
  remove = asyncHandler(async (req, res) => {
    const result = await kitchenBoxService.deleteKitchenBox(req.params.id);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new KitchenBoxController();

