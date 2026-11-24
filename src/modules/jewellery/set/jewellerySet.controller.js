const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const jewellerySetService = require('./jewellerySet.service');

class JewellerySetController {
  create = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const set = await jewellerySetService.createSet(userId, req.body, req.file);
    return ApiResponse.created(res, set, 'Jewellery set created successfully');
  });

  getAll = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const result = await jewellerySetService.getUserSets(userId, req.query);
    return ApiResponse.success(res, result, 'Jewellery sets retrieved successfully');
  });

  getById = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const set = await jewellerySetService.getSetById(userId, req.params.id, {
      includeDeleted: req.query.includeDeleted === 'true',
    });
    return ApiResponse.success(res, set, 'Jewellery set retrieved successfully');
  });

  update = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const set = await jewellerySetService.updateSet(userId, req.params.id, req.body, req.file);
    return ApiResponse.success(res, set, 'Jewellery set updated successfully');
  });

  delete = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const hard = req.query.hard === 'true' || req.query.hard === true;
    const result = await jewellerySetService.deleteSet(userId, req.params.id, { hard });
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new JewellerySetController();
