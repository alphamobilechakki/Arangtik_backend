const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const { formatUploadUrl } = require('../../utils/url.util');

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
   * @desc    Verify OTP and login or register user (registers FCM device token if provided)
   * @route   POST /api/auth/verify-otp
   * @access  Public
   */
  verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp, name, fcmToken, deviceToken, platform, deviceId, deviceModel, appVersion } = req.body;
    const tokenToRegister = fcmToken || deviceToken || req.body?.token;
    const deviceData = tokenToRegister
      ? {
          token: tokenToRegister,
          platform,
          deviceId,
          deviceModel,
          appVersion,
        }
      : null;

    const result = await authService.verifyOtp(phone, otp, name, deviceData);
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
   * @desc    Logout user (permanently deletes device token from DB if specified, or deletes all user device tokens)
   * @route   POST /api/auth/logout
   * @access  Private
   */
  logout = asyncHandler(async (req, res) => {
    const token = req.body?.fcmToken || req.body?.deviceToken || req.body?.token;
    if (req.user?.id) {
      try {
        const notificationService = require('../notification/notification.service');
        if (token) {
          await notificationService.deleteDeviceToken(req.user.id, token);
        } else {
          await notificationService.deleteAllUserDeviceTokens(req.user.id);
        }
      } catch (tokenErr) {
        console.warn('[Logout Token Deletion Warning]:', tokenErr.message);
        // Non-fatal, allow logout to succeed
      }
    }
    return ApiResponse.success(res, null, 'Logged out successfully');
  });

  /**
   * @desc    Update user profile details (name, gender, accountType, country, currency, preferredLanguage, profileImage / file)
   * @route   PATCH /api/auth/profile
   * @access  Private
   */
  updateProfile = asyncHandler(async (req, res) => {
    const file = req.file || (req.files?.image ? req.files.image[0] : (req.files?.profileImage ? req.files.profileImage[0] : null));
    const user = await authService.updateProfile(req.user.id, req.body, file);
    return ApiResponse.success(res, user, 'Profile updated successfully');
  });

  /**
   * @desc    Upload user profile image & automatically register reference face embedding
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

    const imagePath = formatUploadUrl(`/uploads/${file.filename}`);
    const result = await authService.updateProfileImage(req.user.id, imagePath, file.path);
    return ApiResponse.success(res, result, 'Profile image uploaded and reference face biometric registered successfully');
  });
}

module.exports = new AuthController();
