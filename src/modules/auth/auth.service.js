const fs = require('fs');
const path = require('path');
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
      // Create new user with name (gender & accountType use schema defaults: UNSPECIFIED & INDIVIDUAL)
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
        gender: user.gender || 'UNSPECIFIED',
        accountType: user.accountType || 'INDIVIDUAL',
        country: user.country || 'India',
        currency: user.currency || 'INR',
        preferredLanguage: user.preferredLanguage || 'en',
        profileImage: user.profileImage || '',
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

  /**
   * Update user profile information (name, gender, accountType, country, currency, preferredLanguage, profileImage / file)
   * If a profile image file is uploaded, automatically validates 1 clear face and generates 128-d reference face biometric embedding
   */
  async updateProfile(userId, updateData = {}, file = null) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (updateData.name !== undefined) {
      user.name = String(updateData.name).trim();
    }

    if (updateData.gender !== undefined) {
      const clean = String(updateData.gender).trim().toUpperCase();
      if (['MALE', 'MEN', 'M'].includes(clean)) user.gender = 'MALE';
      else if (['FEMALE', 'WOMEN', 'F'].includes(clean)) user.gender = 'FEMALE';
      else if (['OTHER', 'O'].includes(clean)) user.gender = 'OTHER';
      else user.gender = 'UNSPECIFIED';
    }

    if (updateData.accountType !== undefined) {
      const clean = String(updateData.accountType).trim().toUpperCase();
      if (['COMMERCIAL', 'BUSINESS', 'STORE', 'SHOP'].includes(clean)) {
        user.accountType = 'COMMERCIAL';
      } else {
        user.accountType = 'INDIVIDUAL';
      }
    }

    if (updateData.country !== undefined) {
      user.country = String(updateData.country).trim();
    }

    if (updateData.currency !== undefined) {
      user.currency = String(updateData.currency).trim().toUpperCase();
    }

    if (updateData.preferredLanguage !== undefined) {
      user.preferredLanguage = String(updateData.preferredLanguage).trim();
    }

    // Handle file upload if provided
    if (file) {
      const imagePath = `/uploads/${file.filename}`;
      const targetPath = file.path;

      try {
        const faceAIService = require('../../services/faceAI/faceAI.service');
        const face = await faceAIService.extractReferenceFace(targetPath);
        user.referenceFace = {
          embedding: face.embedding,
          boundingBox: face.boundingBox,
          detectionConfidence: face.confidence,
          lastGeneratedAt: new Date(),
          imagePath: imagePath,
        };
      } catch (err) {
        console.warn(`[updateProfile] Biometric extraction note: ${err.message}`);
        // If it's a strict single face validation error, throw to inform caller
        if (err.statusCode) throw err;
      }
      user.profileImage = imagePath;
    } else if (updateData.profileImage !== undefined && updateData.profileImage !== user.profileImage) {
      user.profileImage = updateData.profileImage;
      user.referenceFace = undefined;
    }

    await user.save();
    return user;
  }

  /**
   * Upload and update user profile image
   * Automatically validates for exactly 1 clear face and generates/stores the 128-d reference face embedding in a single atomic step.
   */
  async updateProfileImage(userId, imagePath, filePath = null) {
    if (!imagePath) {
      throw new ApiError(400, 'Profile image is required');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const faceAIService = require('../../services/faceAI/faceAI.service');
    const faceRecognitionService = require('../faceRecognition/faceRecognition.service');
    const targetPath = filePath || faceRecognitionService.resolveImagePath(imagePath);

    if (!fs.existsSync(targetPath)) {
      throw new ApiError(400, 'Profile image file could not be found on server storage');
    }

    // 1. Automatically validate image contains exactly 1 high-quality face & extract 128-d vector
    const face = await faceAIService.extractReferenceFace(targetPath);

    // 2. Save both profile image path and reference face biometric embedding
    user.profileImage = imagePath;
    user.referenceFace = {
      embedding: face.embedding,
      boundingBox: face.boundingBox,
      detectionConfidence: face.confidence,
      lastGeneratedAt: new Date(),
      imagePath: imagePath,
    };

    await user.save();
    console.log(`[updateProfileImage] Profile image uploaded and reference face embedding generated for user: ${userId}`);

    return {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      profileImage: user.profileImage,
      referenceFace: {
        hasReferenceFace: true,
        boundingBox: face.boundingBox,
        detectionConfidence: face.confidence,
        lastGeneratedAt: user.referenceFace.lastGeneratedAt,
      },
    };
  }
}

module.exports = new AuthService();
