const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');

class AuthController {
  /**
   * @desc    Send OTP to user phone via WhatsApp and check if existing user
   * @route   POST /api/auth/send-otp
   * @access  Public
   */
  sendOtp = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await authService.sendOtp(phone);
    return ApiResponse.success(res, result, 'OTP sent successfully to your WhatsApp number');
  });

  /**
   * @desc    Verify OTP and login or register user
   * @route   POST /api/auth/verify-otp
   * @access  Public
   */
  verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp, name } = req.body;
    const result = await authService.verifyOtp(phone, otp, name);
    return ApiResponse.success(res, result, 'Authentication successful');
  });

  /**
   * @desc    Get currently logged in user profile
   * @route   GET /api/auth/me
   * @access  Private
   */
  getMe = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.id);
    return ApiResponse.success(res, user, 'User profile fetched successfully');
  });

  /**
   * @desc    Logout user
   * @route   POST /api/auth/logout
   * @access  Private
   */
  logout = asyncHandler(async (req, res) => {
    return ApiResponse.success(res, null, 'Logged out successfully');
  });

  /**
   * @desc    Update user profile details
   * @route   PUT /api/auth/profile
   * @access  Private
   */
  updateProfile = asyncHandler(async (req, res) => {
    const { name, profileImage } = req.body;
    const user = await authService.updateProfile(req.user.id, { name, profileImage });
    return ApiResponse.success(res, user, 'Profile updated successfully');
  });

  /**
   * @desc    Upload user profile image
   * @route   POST /api/auth/profile-image
   * @access  Private
   */
  uploadProfileImage = asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'No profile image file uploaded',
      });
    }

    const imagePath = `/uploads/${file.filename}`;
    const user = await authService.updateProfileImage(req.user.id, imagePath);
    return ApiResponse.success(res, user, 'Profile image uploaded successfully');
  });
}

module.exports = new AuthController();
