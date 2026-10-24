const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const adminAuthService = require('./adminAuth.service');

class AdminAuthController {
  /**
   * @desc    Admin login with phone number and password
   * @route   POST /api/admin/auth/login
   * @access  Public
   */
  login = asyncHandler(async (req, res) => {
    const { phone, password } = req.body;
    const result = await adminAuthService.loginAdmin(phone, password);
    return ApiResponse.success(res, result, 'Admin login successful');
  });

  /**
   * @desc    Get currently logged in admin profile
   * @route   GET /api/admin/auth/me
   * @access  Private (Admin)
   */
  getMe = asyncHandler(async (req, res) => {
    const adminId = req.user?.id || req.user?._id;
    const admin = await adminAuthService.getAdminProfile(adminId);
    return ApiResponse.success(res, admin, 'Admin profile fetched successfully');
  });
}

module.exports = new AdminAuthController();
