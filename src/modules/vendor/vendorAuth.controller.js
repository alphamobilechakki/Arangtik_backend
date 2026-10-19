const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const vendorAuthService = require('./vendorAuth.service');

class VendorAuthController {
  /**
   * @desc    Get available vendor service categories (Dhobi, Doodh Wala, etc.)
   * @route   GET /api/vendor/categories
   * @access  Public
   */
  getCategories = asyncHandler(async (req, res) => {
    const categories = await vendorAuthService.getCategories();
    return ApiResponse.success(res, categories, 'Vendor categories retrieved successfully');
  });

  /**
   * @desc    Send OTP to vendor mobile number via WhatsApp
   * @route   POST /api/vendor/auth/send-otp
   * @access  Public
   */
  sendOtp = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await vendorAuthService.sendOtp(phone);
    return ApiResponse.success(res, result, 'OTP sent successfully to your WhatsApp number');
  });

  /**
   * @desc    Verify OTP to Login or Register Vendor (Passwordless)
   * @route   POST /api/vendor/auth/verify-otp
   * @access  Public
   */
  verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp, name, category, categoryId, businessName, address } = req.body;
    const result = await vendorAuthService.verifyOtp(phone, otp, {
      name,
      category,
      categoryId,
      businessName,
      address,
    });
    return ApiResponse.success(
      res,
      result,
      result.isNewVendor
        ? 'Vendor registered and logged in successfully'
        : 'Vendor login successful'
    );
  });

  /**
   * @desc    Register new vendor with selected category & OTP / direct
   * @route   POST /api/vendor/auth/register
   * @access  Public
   */
  register = asyncHandler(async (req, res) => {
    const result = await vendorAuthService.registerVendor(req.body);
    return ApiResponse.created(res, result, 'Vendor registered and logged in successfully');
  });

  /**
   * @desc    Login vendor using phone and OTP (or password)
   * @route   POST /api/vendor/auth/login
   * @access  Public
   */
  login = asyncHandler(async (req, res) => {
    const { phone, otp, password } = req.body;
    const credential = otp || password;
    const result = await vendorAuthService.loginVendor(phone, credential);
    return ApiResponse.success(
      res,
      result,
      result.token ? 'Vendor login successful' : 'OTP sent successfully to your WhatsApp number'
    );
  });

  /**
   * @desc    Forgot Password - Send OTP to registered WhatsApp number
   * @route   POST /api/vendor/auth/forgot-password
   * @access  Public
   */
  forgotPassword = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await vendorAuthService.forgotPassword(phone);
    return ApiResponse.success(
      res,
      result,
      'Password reset OTP sent successfully to your WhatsApp number'
    );
  });

  /**
   * @desc    Verify OTP for password reset
   * @route   POST /api/vendor/auth/verify-reset-otp
   * @access  Public
   */
  verifyResetOtp = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    const result = await vendorAuthService.verifyResetOtp(phone, otp);
    return ApiResponse.success(res, result, 'OTP verified successfully');
  });

  /**
   * @desc    Reset password after OTP verification
   * @route   POST /api/vendor/auth/reset-password
   * @access  Public
   */
  resetPassword = asyncHandler(async (req, res) => {
    const { phone, otp, newPassword } = req.body;
    const result = await vendorAuthService.resetPassword(phone, otp, newPassword);
    return ApiResponse.success(res, result, result.message);
  });

  /**
   * @desc    Get currently logged in vendor profile
   * @route   GET /api/vendor/auth/me
   * @access  Private (Vendor)
   */
  getMe = asyncHandler(async (req, res) => {
    const vendorId = req.vendor?._id || req.user?.id;
    const vendor = await vendorAuthService.getCurrentVendor(vendorId);
    return ApiResponse.success(res, vendor, 'Vendor profile fetched successfully');
  });
}

module.exports = new VendorAuthController();
