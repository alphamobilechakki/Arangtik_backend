const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const kitchenBoxService = require('./kitchenBox.service');

class KitchenBoxController {
  // PATCH /hardware/boxes/activate
  activate = asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.body.userId;
    const box = await kitchenBoxService.activateKitchenBox(req.body, userId);
    return ApiResponse.success(res, box, 'KitchenBox activated successfully');
  });

  // PATCH /hardware/boxes/deactivate
  deactivate = asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.body.userId;
    const box = await kitchenBoxService.deactivateKitchenBox(req.body, userId);
    return ApiResponse.success(res, box, 'KitchenBox deactivated successfully');
  });

  // GET /hardware/boxes/get-myboxes
  getMyBoxes = asyncHandler(async (req, res) => {
    const boxes = await kitchenBoxService.getMyBoxes(req.user?.id || req.query.userId);
    return ApiResponse.success(res, boxes, 'KitchenBoxes retrieved successfully');
  });


}

module.exports = new KitchenBoxController();

