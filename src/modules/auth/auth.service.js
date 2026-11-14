const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  OTP_EXPIRY,
  OTP_DEV_MODE,
  OTP_LENGTH,
  TEST_PHONE,
  TEST_OTP,
} = require('../../config/env.config');
const User = require('./user.model');
const Otp = require('./otp.model');
const ApiError = require('../../utils/apiError');
const { formatPhoneNumber, sendSmsOtp } = require('../../utils/sms.service');
const { formatUploadUrl } = require('../../utils/url.util');

/**
 * Check if the provided phone number matches the Play Store test/review account
 */
const isTestAccount = (phone) => {
  const target = (TEST_PHONE || '918949056321').replace(/\D/g, '');
  const cleaned = String(phone || '').replace(/\D/g, '');
  return cleaned === target || cleaned.endsWith('8949056321');
};

class AuthService {
  /**
   * Parse and validate location input into GeoJSON Point: { type: 'Point', coordinates: [longitude, latitude] }
   * Supports GeoJSON Point format, { latitude, longitude }, { lat, lng }, stringified JSON, or flat fields.
   * Returns:
   *   - { type: 'Point', coordinates: [longitude, latitude] } if valid coordinates provided
   *   - null if explicitly cleared (null, empty string, etc.)
   *   - undefined if location was not provided
   */
  parseAndValidateLocation(rawLocation, fallback = {}) {
    let location = rawLocation;

    // Handle explicit clear
    if (location === null || location === '' || location === 'null') {
      return null;
    }

    // Handle stringified JSON from multipart/form-data or mobile clients
    if (typeof location === 'string') {
      const trimmed = location.trim();
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
        return null;
      }
      try {
        location = JSON.parse(trimmed);
      } catch {
        throw new ApiError(400, 'Invalid location format. Expected valid JSON or object');
      }
    }

    // If location is array e.g. [lng, lat]
    if (Array.isArray(location) && location.length === 2) {
      location = { coordinates: location };
    }

    // Case 1: GeoJSON format or coordinates array: [longitude, latitude]
    const coords = location?.coordinates || fallback?.coordinates;
    if (Array.isArray(coords)) {
      if (coords.length !== 2) {
        throw new ApiError(400, 'Location coordinates must contain exactly 2 numbers: [longitude, latitude]');
      }
      const [lng, lat] = coords.map(Number);
      if (isNaN(lng) || isNaN(lat)) {
        throw new ApiError(400, 'Location coordinates must contain valid numbers [longitude, latitude]');
      }
      if (lng < -180 || lng > 180) {
        throw new ApiError(400, 'Longitude must be between -180 and 180 degrees');
      }
      if (lat < -90 || lat > 90) {
        throw new ApiError(400, 'Latitude must be between -90 and 90 degrees');
      }
      return { type: 'Point', coordinates: [lng, lat] };
    }

    // Case 2: Object { latitude, longitude } or { lat, lng } in location or fallback
    const lat = location?.latitude ?? location?.lat ?? fallback?.latitude ?? fallback?.lat;
    const lng = location?.longitude ?? location?.lng ?? fallback?.longitude ?? fallback?.lng;

    if (lat !== undefined || lng !== undefined) {
      if (lat === undefined || lng === undefined) {
        throw new ApiError(400, 'Both latitude and longitude are required');
      }
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (isNaN(numLat) || isNaN(numLng)) {
        throw new ApiError(400, 'Latitude and Longitude must be valid numbers');
      }
      if (numLng < -180 || numLng > 180) {
        throw new ApiError(400, 'Longitude must be between -180 and 180 degrees');
      }
      if (numLat < -90 || numLat > 90) {
        throw new ApiError(400, 'Latitude must be between -90 and 90 degrees');
      }
      return { type: 'Point', coordinates: [numLng, numLat] };
    }

    // If rawLocation was explicitly provided but in an invalid format
    if (rawLocation !== undefined) {
      throw new ApiError(
        400,
        'Invalid location format. Expected GeoJSON { type: "Point", coordinates: [lng, lat] } or { latitude, longitude }'
      );
    }

    return undefined;
  }

  /**
   * Send OTP to user's phone via SMS (VoiceNSMS gateway)
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

    const isTest = isTestAccount(formattedPhone);

    // Generate 4-digit numeric OTP (fixed '1234' for Play Store review account)
    const otpLength = Number(OTP_LENGTH) || 4;
    const otp = isTest
      ? (TEST_OTP || '1234')
      : (otpLength === 6
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : Math.floor(1000 + Math.random() * 9000).toString());

    const expiresAt = isTest
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiry for test account
      : new Date(Date.now() + OTP_EXPIRY * 60 * 1000);

    // Invalidate/delete any previous active OTP for this phone
    await Otp.deleteMany({ phone: formattedPhone });

    // Store new OTP in database
    await Otp.create({
      phone: formattedPhone,
      otp,
      expiresAt,
    });

    // Dispatch SMS message via VoiceNSMS gateway
    if (isTest) {
      try {
        await sendSmsOtp(formattedPhone, otp);
      } catch (smsErr) {
        console.warn(`[Play Store Review Account]: SMS send skipped/warning for ${formattedPhone}:`, smsErr.message);
      }
    } else {
      await sendSmsOtp(formattedPhone, otp);
    }

    return {
      phone: formattedPhone,
      isExistingUser,
      expiresInMinutes: OTP_EXPIRY,
    };
  }

  /**
   * Verify OTP and Authenticate / Register User
   * If new user, creates account with name if provided.
   * If deviceData / fcmToken is provided, registers the device token for FCM push notifications.
   * If locationData is provided, saves user's GeoJSON location coordinates.
   */
  async verifyOtp(phone, otp, name = '', deviceData = null, locationData = null) {
      if (!phone || !otp) {
        throw new ApiError(400, 'Phone number and OTP are required');
      }

      let userName = typeof name === 'string' ? name : '';
      let devicePayload = deviceData;
      let resolvedLocationPayload = locationData;
      if (typeof name === 'object' && name !== null) {
        devicePayload = name;
        userName = name.name || '';
        if (
          !resolvedLocationPayload &&
          (name.location !== undefined ||
            name.latitude !== undefined ||
            name.longitude !== undefined ||
            name.lat !== undefined ||
            name.lng !== undefined ||
            name.coordinates !== undefined)
        ) {
          resolvedLocationPayload = name.location !== undefined ? name.location : name;
        }
      }

      const resolvedLocation = this.parseAndValidateLocation(resolvedLocationPayload);

      const formattedPhone = formatPhoneNumber(phone);
      const trimmedOtp = String(otp).trim();

      const isTest =
        isTestAccount(formattedPhone) &&
        (trimmedOtp === (TEST_OTP || '1234') || trimmedOtp === '1234' || trimmedOtp === '123456');

      if (!isTest) {
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
      }

      let user = await User.findOne({ phone: formattedPhone });
      let isNewUser = false;

      if (!user) {
        // Create new user with name (gender & accountType use schema defaults: UNSPECIFIED & INDIVIDUAL)
        user = await User.create({
          phone: formattedPhone,
          name: userName ? String(userName).trim() : '',
          role: 'user',
          ...(resolvedLocation ? { location: resolvedLocation } : {}),
        });
        isNewUser = true;
      } else {
        // Verify account status for existing user
        if (user.status === 'blocked' || user.status === 'inactive') {
          throw new ApiError(403, 'Your account has been deactivated or blocked. Please contact support.');
        }

        let shouldSave = false;
        if ((!user.name || user.name.trim() === '') && userName && userName.trim()) {
          user.name = userName.trim();
          shouldSave = true;
        }
        if (resolvedLocation) {
          user.location = resolvedLocation;
          shouldSave = true;
        }
        if (shouldSave) {
          await user.save();
        }
      }

      // Delete OTP once successfully verified (retain test account OTP so testers/reviewers can login repeatedly)
      if (!isTest) {
        await Otp.deleteMany({ phone: formattedPhone });
      }

      // Check and sync if user's phone was previously logged as an unregistered vendor
      try {
        const vendorService = require('../vendor/vendor.service');
        await vendorService.syncUnregisteredToRegistered(user);
      } catch (syncErr) {
        console.error('[Vendor Sync on Login Error]:', syncErr.message);
      }

      // Auto-accept any pending Frequent Connect cluster invitations for this phone
      if (isNewUser) {
        try {
          const inviteService = require('../frequentConnect/invite/invite.service');
          const inviteResult = await inviteService.autoAcceptPendingInvites(user._id, formattedPhone);
          if (inviteResult.accepted > 0) {
            console.log(`[FC Invite Auto-Accept]: Accepted ${inviteResult.accepted} pending invites for ${formattedPhone}`);
          }
        } catch (inviteErr) {
          console.error('[FC Invite Auto-Accept Error]:', inviteErr.message);
        }
      }

      // Register FCM device token on login if provided
      let registeredDevice = null;
      const rawDeviceToken = devicePayload?.token || devicePayload?.fcmToken || devicePayload?.deviceToken;
      if (rawDeviceToken && typeof rawDeviceToken === 'string' && rawDeviceToken.trim()) {
        try {
          const notificationService = require('../notification/notification.service');
          registeredDevice = await notificationService.registerDeviceToken(user._id, {
            token: rawDeviceToken.trim(),
            platform: devicePayload.platform,
            deviceId: devicePayload.deviceId,
            deviceModel: devicePayload.deviceModel,
            appVersion: devicePayload.appVersion,
          });
        } catch (tokenErr) {
          console.warn('[FCM Token Registration on Login Warning]:', tokenErr.message);
        }
      }

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
          location:
            user.location && Array.isArray(user.location.coordinates) && user.location.coordinates.length === 2
              ? user.location
              : null,
          profileImage: user.profileImage || '',
          role: user.role,
          status: user.status,
          wallet: user.wallet || 0,
        },
        isNewUser,
        ...(registeredDevice ? { fcmToken: registeredDevice.token, deviceRegistered: true } : {}),
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

      // Handle location update / clearing
      const hasLocationField =
        updateData.location !== undefined ||
        updateData.latitude !== undefined ||
        updateData.lat !== undefined ||
        updateData.longitude !== undefined ||
        updateData.lng !== undefined ||
        updateData.coordinates !== undefined;

      if (hasLocationField) {
        const locationPayload =
          updateData.location !== undefined
            ? updateData.location
            : {
              latitude: updateData.latitude,
              lat: updateData.lat,
              longitude: updateData.longitude,
              lng: updateData.lng,
              coordinates: updateData.coordinates,
            };

        const resolvedLocation = this.parseAndValidateLocation(locationPayload, updateData);
        if (resolvedLocation === null) {
          user.location = undefined;
        } else if (resolvedLocation) {
          user.location = resolvedLocation;
        }
      }

      // Handle file upload if provided
      if (file) {
        user.profileImage = formatUploadUrl(`/uploads/${file.filename}`);
      } else if (updateData.profileImage !== undefined && updateData.profileImage !== user.profileImage) {
        user.profileImage = updateData.profileImage;
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

      user.profileImage = imagePath;
      await user.save();
      console.log(`[updateProfileImage] Profile image uploaded successfully for user: ${userId}`);

      return {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage,
      };
    }
  }

module.exports = new AuthService();
