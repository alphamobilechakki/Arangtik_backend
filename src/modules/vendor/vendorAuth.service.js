const jwt = require('jsonwebtoken');
const RegisteredVendor = require('./registeredVendor.model');
const Vendor = RegisteredVendor;
const UnregisteredVendor = require('./unregisteredVendor.model');
const Otp = require('../auth/otp.model');
const { JWT_SECRET, JWT_EXPIRES_IN, TEST_PHONE, TEST_OTP } = require('../../config/env.config');
const { formatPhoneNumber, sendWhatsAppOtp } = require('../../utils/whatsapp.service');
const ApiError = require('../../utils/apiError');

/**
 * Standard dynamic service categories for vendor registration & selection
 */
const VENDOR_CATEGORIES = [
  { id: 'dhobi', name: 'Dhobi', icon: '🧺', description: 'Laundry, Dry Cleaning & Garment Care' },
  { id: 'doodh_wala', name: 'Doodh Wala', icon: '🥛', description: 'Fresh Milk & Dairy Delivery' },
  { id: 'press_ironing', name: 'Press / Ironing', icon: '👔', description: 'Clothes Pressing & Fold Delivery' },
  { id: 'tailor', name: 'Tailor', icon: '✂️', description: 'Stitching & Garment Alteration' },
];

/**
 * Check if the provided phone matches the test account
 */
const isTestAccount = (phone) => {
  const target = (TEST_PHONE || '918949056321').replace(/\D/g, '');
  const cleaned = String(phone || '').replace(/\D/g, '');
  return cleaned === target || cleaned.endsWith('8949056321');
};

class VendorAuthService {
  /**
   * Return available vendor categories for mobile app selection dropdown (dynamically from DB)
   */
  async getCategories() {
    const vendorCategoryService = require('../admin/vendorCategory/vendorCategory.service');
    const categories = await vendorCategoryService.getAllCategories({ includeInactive: false });
    return categories.map((c) => ({
      id: c.code ? c.code.toLowerCase() : c.name.toLowerCase().replace(/\s+/g, '_'),
      name: c.name,
      code: c.code,
      icon: c.icon,
      description: c.description,
    }));
  }

  /**
   * Helper to format vendor document for client responses
   */
  formatVendorProfile(vendor) {
    return {
      _id: vendor._id,
      vendorId: vendor.vendorId,
      name: vendor.name,
      phone: vendor.phone,
      category: vendor.category || 'Dhobi',
      isRegistered: vendor.isRegistered === true,
      businessName: vendor.businessName || '',
      address: vendor.address || {},
      rating: vendor.rating || 5.0,
      totalOrdersHandled: vendor.totalOrdersHandled || 0,
      isVerified: vendor.isVerified !== undefined ? vendor.isVerified : true,
      status: vendor.status || 'ACTIVE',
      createdAt: vendor.createdAt,
    };
  }

  /**
   * Generate JWT Token for authenticated vendor
   */
  generateVendorToken(vendor) {
    return jwt.sign(
      {
        id: vendor._id,
        vendorId: vendor.vendorId,
        phone: vendor.phone,
        role: 'vendor',
        category: vendor.category || 'Dhobi',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN || '30d' }
    );
  }

  /**
   * 1. Vendor Registration with Category & Password
   * Automatically logs in the vendor and returns JWT token
   */
  async registerVendor(payload = {}) {
    const { phone, password, name, category, categoryId, businessName, address } = payload;

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    if (!password || String(password).trim().length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters long');
    }

    if (!name || !name.trim()) {
      throw new ApiError(400, 'Vendor name is required');
    }

    // Determine category name
    const rawCategory = category || categoryId;
    if (!rawCategory || !String(rawCategory).trim()) {
      throw new ApiError(400, 'Please select a vendor category (e.g. Dhobi, Doodh Wala)');
    }

    const VendorCategory = require('../admin/vendorCategory/vendorCategory.model');
    const trimmedCat = String(rawCategory).trim();
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(trimmedCat);

    const dbCat = await VendorCategory.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${trimmedCat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        { code: trimmedCat.toUpperCase() },
        ...(isMongoId ? [{ _id: trimmedCat }] : []),
      ],
      isActive: true,
    });

    const resolvedCategory = dbCat ? dbCat.name : trimmedCat;

    // Check if phone already registered as an active vendor with password
    let vendor = await Vendor.findOne({ phone: formattedPhone }).select('+password');

    if (vendor && vendor.password && vendor.isRegistered) {
      throw new ApiError(
        409,
        'A vendor with this mobile number is already registered. Please login with your password.'
      );
    }

    if (!vendor) {
      // Create fresh vendor record in unified Vendor table
      vendor = new Vendor({
        name: name.trim(),
        phone: formattedPhone,
        password: String(password).trim(),
        category: resolvedCategory,
        isRegistered: true,
        businessName: businessName ? businessName.trim() : '',
        address: address || {},
        status: 'ACTIVE',
      });
    } else {
      // Complete existing unpassworded / unregistered vendor record
      vendor.name = name.trim();
      vendor.password = String(password).trim();
      vendor.category = resolvedCategory;
      vendor.isRegistered = true;
      if (businessName) vendor.businessName = businessName.trim();
      if (address) vendor.address = address;
      vendor.status = 'ACTIVE';
    }

    await vendor.save();

    // Check & convert any unregistered vendor entries and link past laundry orders
    try {
      const unreg = await UnregisteredVendor.findOne({ phone: formattedPhone });
      if (unreg) {
        unreg.isConvertedToRegistered = true;
        unreg.convertedVendorId = vendor._id;
        unreg.convertedAt = new Date();
        await unreg.save();

        const LaundryOrder = require('../laundry/laundryOrder.model');
        if (LaundryOrder) {
          await LaundryOrder.updateMany(
            { vendorPhone: formattedPhone, isRegisteredVendor: false },
            {
              $set: {
                vendorId: vendor._id,
                isRegisteredVendor: true,
                vendorName: vendor.name,
              },
            }
          );
        }
      }
    } catch (syncErr) {
      console.warn('[Vendor Registration Sync Warning]:', syncErr.message);
    }

    // Generate JWT access token for instant automatic login
    const token = this.generateVendorToken(vendor);

    return {
      token,
      vendor: this.formatVendorProfile(vendor),
    };
  }

  /**
   * 2. Vendor Login using Mobile Number + Password
   */
  async loginVendor(phone, password) {
    if (!phone || !password) {
      throw new ApiError(400, 'Mobile number and password are required');
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    const vendor = await Vendor.findOne({ phone: formattedPhone }).select('+password');

    if (!vendor) {
      throw new ApiError(401, 'Invalid mobile number or password');
    }

    if (vendor.status === 'INACTIVE' || vendor.status === 'SUSPENDED') {
      throw new ApiError(403, 'Your vendor account is inactive or suspended. Please contact support.');
    }

    if (!vendor.password) {
      throw new ApiError(
        400,
        'Password has not been set for this vendor account yet. Please use "Forgot Password" to set your password.'
      );
    }

    const isMatch = await vendor.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid mobile number or password');
    }

    // Generate JWT Access Token
    const token = this.generateVendorToken(vendor);

    return {
      token,
      vendor: this.formatVendorProfile(vendor),
    };
  }

  /**
   * 3. Forgot Password - Send OTP to registered WhatsApp number
   */
  async forgotPassword(phone) {
    if (!phone) {
      throw new ApiError(400, 'Mobile number is required');
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    const vendor = await Vendor.findOne({ phone: formattedPhone });
    if (!vendor) {
      throw new ApiError(404, 'No registered vendor found with this mobile number');
    }

    if (vendor.status === 'SUSPENDED') {
      throw new ApiError(403, 'This vendor account has been suspended. Please contact support.');
    }

    const isTest = isTestAccount(formattedPhone);
    const otp = isTest ? (TEST_OTP || '1234') : Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any old OTP records for this phone
    await Otp.deleteMany({ phone: formattedPhone });

    // Store new OTP record
    await Otp.create({
      phone: formattedPhone,
      otp,
      expiresAt,
    });

    // Send OTP via WhatsApp
    try {
      await sendWhatsAppOtp(formattedPhone, otp);
    } catch (waErr) {
      console.warn(`[Vendor Forgot Password WhatsApp Warning for ${formattedPhone}]:`, waErr.message);
    }

    return {
      phone: formattedPhone,
      expiresInMinutes: 10,
    };
  }

  /**
   * 4. Verify OTP for password reset
   */
  async verifyResetOtp(phone, otp) {
    if (!phone || !otp) {
      throw new ApiError(400, 'Mobile number and OTP are required');
    }

    const formattedPhone = formatPhoneNumber(phone);
    const trimmedOtp = String(otp).trim();

    const isTest = isTestAccount(formattedPhone) && trimmedOtp === (TEST_OTP || '1234');

    if (!isTest) {
      const record = await Otp.findOne({ phone: formattedPhone, otp: trimmedOtp });
      if (!record) {
        throw new ApiError(400, 'Invalid or expired OTP');
      }

      if (new Date() > record.expiresAt) {
        await Otp.deleteMany({ phone: formattedPhone });
        throw new ApiError(400, 'OTP has expired. Please request a new OTP');
      }
    }

    return {
      phone: formattedPhone,
      verified: true,
    };
  }

  /**
   * 5. Set New Password after OTP verification
   */
  async resetPassword(phone, otp, newPassword) {
    if (!phone || !otp || !newPassword) {
      throw new ApiError(400, 'Mobile number, OTP, and new password are required');
    }

    if (String(newPassword).trim().length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters long');
    }

    // Verify OTP first
    await this.verifyResetOtp(phone, otp);

    const formattedPhone = formatPhoneNumber(phone);
    const vendor = await Vendor.findOne({ phone: formattedPhone }).select('+password');

    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    // Set new password (pre-save hook will hash it)
    vendor.password = String(newPassword).trim();
    vendor.isRegistered = true;
    await vendor.save();

    // Clean up OTP record
    const isTest = isTestAccount(formattedPhone);
    if (!isTest) {
      await Otp.deleteMany({ phone: formattedPhone });
    }

    return {
      phone: formattedPhone,
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    };
  }

  /**
   * 6. Get Current Authenticated Vendor Profile
   */
  async getCurrentVendor(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }
    return this.formatVendorProfile(vendor);
  }
}

module.exports = new VendorAuthService();
