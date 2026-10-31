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


}

module.exports = new KitchenBoxController();

