const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const jewelleryBoxService = require('./jewelleryBox.service');

class JewelleryBoxController {
  create = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const box = await jewelleryBoxService.createBox(userId, req.body, req.file);
    return ApiResponse.created(res, box, 'Jewellery box created successfully');
  });

  getAll = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const result = await jewelleryBoxService.getUserBoxes(userId, req.query);
    return ApiResponse.success(res, result, 'Jewellery boxes retrieved successfully');
  });

  getById = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const box = await jewelleryBoxService.getBoxById(userId, req.params.id, {
      includeDeleted: req.query.includeDeleted === 'true',
    });
    return ApiResponse.success(res, box, 'Jewellery box retrieved successfully');
  });

  update = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const box = await jewelleryBoxService.updateBox(userId, req.params.id, req.body, req.file);
    return ApiResponse.success(res, box, 'Jewellery box updated successfully');
  });

  delete = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const hard = req.query.hard === 'true' || req.query.hard === true;
    const result = await jewelleryBoxService.deleteBox(userId, req.params.id, { hard });
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new JewelleryBoxController();
