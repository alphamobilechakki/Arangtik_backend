const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');
const coinPackageService = require('./coinPackage.service');

class CoinPackageController {
  create = asyncHandler(async (req, res) => {
    const coinPackage = await coinPackageService.createCoinPackage(req.body);
    return ApiResponse.created(res, coinPackage, 'Coin package created successfully');
  });

  getAll = asyncHandler(async (req, res) => {
    const result = await coinPackageService.getAllCoinPackages(req.query);
    return ApiResponse.success(res, result, 'Coin packages retrieved successfully');
  });

  getById = asyncHandler(async (req, res) => {
    const coinPackage = await coinPackageService.getCoinPackageById(req.params.id);
    return ApiResponse.success(res, coinPackage, 'Coin package retrieved successfully');
  });

  update = asyncHandler(async (req, res) => {
    const coinPackage = await coinPackageService.updateCoinPackage(req.params.id, req.body);
    return ApiResponse.success(res, coinPackage, 'Coin package updated successfully');
  });

  updateStatus = asyncHandler(async (req, res) => {
    const coinPackage = await coinPackageService.updateCoinPackageStatus(req.params.id, req.body.isActive);
    const statusText = coinPackage.isActive ? 'activated' : 'deactivated';
    return ApiResponse.success(res, coinPackage, `Coin package ${statusText} successfully`);
  });
}

module.exports = new CoinPackageController();

