const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const vendorService = require('./vendor.service');

class VendorController {
  /**
   * @desc    Lookup vendor by phone number (from contacts or manual input)
   * @route   GET /api/v1/vendor/lookup?phone=919876543210
   * @access  Private
   */
  lookupVendor = asyncHandler(async (req, res) => {
    const { phone } = req.query;
    const result = await vendorService.lookupVendor(phone, req.user?.id);
    return ApiResponse.success(
      res,
      result,
      result.isRegistered
        ? 'Registered vendor found'
        : 'Vendor details retrieved'
    );
  });
}

module.exports = new VendorController();
