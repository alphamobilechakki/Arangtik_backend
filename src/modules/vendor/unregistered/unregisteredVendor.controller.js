const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const unregisteredVendorService = require('./unregisteredVendor.service');

class UnregisteredVendorController {
  /**
   * @desc    Lookup vendor by phone number (customer order flow)
   * @route   GET /api/vendor/lookup or /api/vendor/unregistered/lookup
   * @access  Private (User / Customer)
   */
  lookupVendor = asyncHandler(async (req, res) => {
    const { phone } = req.query;
    const result = await unregisteredVendorService.lookupVendor(phone, req.user?.id);
    return ApiResponse.success(
      res,
      result,
      result.isRegistered ? 'Registered vendor found' : 'Vendor details retrieved'
    );
  });

  /**
   * @desc    Get list of unregistered vendors
   * @route   GET /api/vendor/unregistered
   * @access  Private (Admin / Internal)
   */
  getUnregisteredVendors = asyncHandler(async (req, res) => {
    const result = await unregisteredVendorService.getUnregisteredVendors(req.query);
    return ApiResponse.success(res, result, 'Unregistered vendors retrieved successfully');
  });
}

module.exports = new UnregisteredVendorController();
