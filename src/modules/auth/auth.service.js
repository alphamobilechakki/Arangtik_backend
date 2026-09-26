const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, OTP_EXPIRY, OTP_DEV_MODE } = require('../../config/env.config');
const User = require('./user.model');
const Otp = require('./otp.model');
const ApiError = require('../../utils/apiError');
const { formatPhoneNumber, sendWhatsAppOtp } = require('../../utils/whatsapp.service');

class AuthService {
  /**
   * Send OTP to user's phone via WhatsApp
   * Checks if user already exists so frontend knows whether to ask for user's name.
   */
  async sendOtp(phone) {
    if (!phone) {
      throw new ApiError(400, 'Phone number is required');
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    // Check if user already exists in DB
    const existingUser = await User.findOne({ phone: formattedPhone });
    const isExistingUser = !!existingUser;

    // Generate 4-digit numeric OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY * 60 * 1000);

    // Invalidate/delete any previous active OTP for this phone
    await Otp.deleteMany({ phone: formattedPhone });

    // Store new OTP in database
    await Otp.create({
      phone: formattedPhone,
      otp,
      expiresAt,
    });

    // Dispatch WhatsApp template message via API24
    await sendWhatsAppOtp(formattedPhone, otp);

    return {
      phone: formattedPhone,
      isExistingUser,
      expiresInMinutes: OTP_EXPIRY,
      // Included in development/dev mode for testing
      ...(OTP_DEV_MODE || process.env.NODE_ENV === 'development' ? { devOtp: otp } : {}),
    };
  }

  /**
   * Verify OTP and Authenticate / Register User
   * If new user, creates account with name if provided.
   */
  async verifyOtp(phone, otp, name = '') {
    if (!phone || !otp) {
      throw new ApiError(400, 'Phone number and OTP are required');
    }

    const formattedPhone = formatPhoneNumber(phone);
    const trimmedOtp = String(otp).trim();

    // Verify OTP record
    const record = await Otp.findOne({ phone: formattedPhone, otp: trimmedOtp });
    if (!record) {
      throw new ApiError(400, 'Invalid or expired OTP');
    }

    // Check expiration timestamp
    if (new Date() > record.expiresAt) {
      await Otp.deleteMany({ phone: formattedPhone });
      throw new ApiError(400, 'OTP has expired. Please request a new OTP');
    }

    let user = await User.findOne({ phone: formattedPhone });
    let isNewUser = false;

    if (!user) {
      // Create new user with name (only single user role)
      user = await User.create({
        phone: formattedPhone,
        name: name ? String(name).trim() : '',
        role: 'user',
      });
      isNewUser = true;
    } else {
      // Verify account status for existing user
      if (user.status === 'blocked' || user.status === 'inactive') {
        throw new ApiError(403, 'Your account has been deactivated or blocked. Please contact support.');
      }

      // If existing user has no name and name is supplied now, update it
      if ((!user.name || user.name.trim() === '') && name && name.trim()) {
        user.name = name.trim();
        await user.save();
      }
    }

    // Delete OTP once successfully verified
    await Otp.deleteMany({ phone: formattedPhone });

    // Generate JWT Access Token
    const token = jwt.sign(
      {
        id: user._id,
        phone: user.phone,
        role: user.role || 'user',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      isNewUser,
    };
  }

  /**
   * Fetch current authenticated user profile
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId).select('-__v');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }
}

module.exports = new AuthService();
