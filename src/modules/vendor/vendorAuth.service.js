const jwt = require('jsonwebtoken');
const RegisteredVendor = require('./registeredVendor.model');
const Vendor = RegisteredVendor;
const UnregisteredVendor = require('./unregisteredVendor.model');
const Otp = require('../auth/otp.model');
const { JWT_SECRET, JWT_EXPIRES_IN, OTP_EXPIRY, TEST_PHONE, TEST_OTP } = require('../../config/env.config');
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
   * 1. Send OTP to vendor's phone via WhatsApp for Registration / Login
   */
  async sendOtp(phone) {
    if (!phone) {
      throw new ApiError(400, 'Mobile number is required');
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    // Check if vendor already exists in DB & account status
    const existingVendor = await Vendor.findOne({ phone: formattedPhone });
    if (existingVendor && (existingVendor.status === 'INACTIVE' || existingVendor.status === 'SUSPENDED')) {
      throw new ApiError(403, 'Your vendor account is inactive or suspended. Please contact support.');
    }

    const isExistingVendor = !!(existingVendor && existingVendor.isRegistered);
    const isTest = isTestAccount(formattedPhone);

    const otp = isTest ? (TEST_OTP || '1234') : Math.floor(1000 + Math.random() * 9000).toString();
    const expiryMins = parseInt(OTP_EXPIRY, 10) || 5;
    const expiresAt = isTest
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + expiryMins * 60 * 1000);

    // Invalidate/delete any previous active OTP for this phone
    await Otp.deleteMany({ phone: formattedPhone });

    // Store new OTP in database
    await Otp.create({
      phone: formattedPhone,
      otp,
      expiresAt,
    });

    // Dispatch WhatsApp message via API24
    if (isTest) {
      try {
        await sendWhatsAppOtp(formattedPhone, otp);
      } catch (waErr) {
        console.warn(`[Vendor Test Account]: WhatsApp send skipped for ${formattedPhone}:`, waErr.message);
      }
    } else {
      await sendWhatsAppOtp(formattedPhone, otp);
    }

    return {
      phone: formattedPhone,
      isExistingVendor,
      expiresInMinutes: expiryMins,
    };
  }

  /**
   * 2. Verify OTP and Authenticate / Register Vendor (Passwordless)
   * If existing vendor: logs in directly.
   * If new vendor: completes registration with name, category, businessName, address.
   */
  async verifyOtp(phone, otp, registrationData = {}) {
    if (!phone || !otp) {
      throw new ApiError(400, 'Mobile number and OTP are required');
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

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

    // Lookup vendor in unified Vendor table
    let vendor = await Vendor.findOne({ phone: formattedPhone });

    // Case A: Existing registered vendor -> Login
    if (vendor && vendor.isRegistered) {
      if (vendor.status === 'INACTIVE' || vendor.status === 'SUSPENDED') {
        throw new ApiError(403, 'Your vendor account is inactive or suspended. Please contact support.');
      }

      if (!isTest) {
        await Otp.deleteMany({ phone: formattedPhone });
      }

      const token = this.generateVendorToken(vendor);
      return {
        token,
        isNewVendor: false,
        vendor: this.formatVendorProfile(vendor),
      };
    }

    // Case B: New vendor or unregistered vendor completing registration
    const { name, category, categoryId, businessName, address } = registrationData;

    let vendorName = name ? String(name).trim() : '';
    if (!vendorName && vendor && vendor.name) {
      vendorName = vendor.name;
    }

    if (!vendorName) {
      const unreg = await UnregisteredVendor.findOne({ phone: formattedPhone });
      if (unreg && unreg.name) {
        vendorName = unreg.name;
      }
    }

    if (!vendorName) {
      throw new ApiError(400, 'Vendor name is required to complete registration');
    }

    const rawCategory = category || categoryId;
    if (!rawCategory || !String(rawCategory).trim()) {
      throw new ApiError(400, 'Vendor category is required (e.g. Dhobi, Tailor, Press / Ironing)');
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

    if (!vendor) {
      vendor = new Vendor({
        name: vendorName,
        phone: formattedPhone,
        category: resolvedCategory,
        isRegistered: true,
        businessName: businessName ? String(businessName).trim() : '',
        address: address || {},
        status: 'ACTIVE',
      });
    } else {
      vendor.name = vendorName;
      vendor.category = resolvedCategory;
      vendor.isRegistered = true;
      if (businessName) vendor.businessName = String(businessName).trim();
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

    if (!isTest) {
      await Otp.deleteMany({ phone: formattedPhone });
    }

    const token = this.generateVendorToken(vendor);
    return {
      token,
      isNewVendor: true,
      vendor: this.formatVendorProfile(vendor),
    };
  }

  /**
   * 3. Vendor Registration (Supports OTP or direct registration)
   */
  async registerVendor(payload = {}) {
    const { phone, otp, password, name, category, categoryId, businessName, address } = payload;

    // If OTP provided, delegate to OTP-based registration
    if (otp) {
      return this.verifyOtp(phone, otp, payload);
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    if (!name || !name.trim()) {
      throw new ApiError(400, 'Vendor name is required');
    }

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

    let vendor = await Vendor.findOne({ phone: formattedPhone });

    if (vendor && vendor.isRegistered) {
      throw new ApiError(
        409,
        'A vendor with this mobile number is already registered. Please login.'
      );
    }

    if (!vendor) {
      vendor = new Vendor({
        name: name.trim(),
        phone: formattedPhone,
        ...(password && password.trim().length >= 6 ? { password: String(password).trim() } : {}),
        category: resolvedCategory,
        isRegistered: true,
        businessName: businessName ? businessName.trim() : '',
        address: address || {},
        status: 'ACTIVE',
      });
    } else {
      vendor.name = name.trim();
      if (password && password.trim().length >= 6) {
        vendor.password = String(password).trim();
      }
      vendor.category = resolvedCategory;
      vendor.isRegistered = true;
      if (businessName) vendor.businessName = businessName.trim();
      if (address) vendor.address = address;
      vendor.status = 'ACTIVE';
    }

    await vendor.save();

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

    const token = this.generateVendorToken(vendor);
    return {
      token,
      vendor: this.formatVendorProfile(vendor),
    };
  }

  /**
   * 4. Vendor Login (Supports OTP or Password)
   */
  async loginVendor(phone, credential) {
    if (!phone) {
      throw new ApiError(400, 'Mobile number is required');
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    // If no credential provided, send an OTP for login
    if (!credential) {
      return this.sendOtp(formattedPhone);
    }

    // If credential looks like an OTP (4 to 6 digits), attempt OTP verification
    const trimmed = String(credential).trim();
    if (/^\d{4,6}$/.test(trimmed)) {
      return this.verifyOtp(formattedPhone, trimmed);
    }

    // Otherwise treat as password fallback
    const vendor = await Vendor.findOne({ phone: formattedPhone }).select('+password');
    if (!vendor) {
      throw new ApiError(401, 'Invalid mobile number or credentials');
    }

    if (vendor.status === 'INACTIVE' || vendor.status === 'SUSPENDED') {
      throw new ApiError(403, 'Your vendor account is inactive or suspended. Please contact support.');
    }

    if (!vendor.password) {
      throw new ApiError(
        400,
        'Please login using WhatsApp OTP sent to your mobile number.'
      );
    }

    const isMatch = await vendor.comparePassword(trimmed);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid mobile number or password');
    }

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
