const jwt = require('jsonwebtoken');
const Admin = require('./admin.model');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../../../config/env.config');
const { formatPhoneNumber } = require('../../../utils/whatsapp.service');
const ApiError = require('../../../utils/apiError');

const DEFAULT_ADMIN = {
  phone: '6202579799',
  password: '123456',
  name: 'Super Admin',
};

class AdminAuthService {
  /**
   * Seed the default admin (6202579799 / 123456) if not present
   */
  async seedDefaultAdmin() {
    const formattedPhone = formatPhoneNumber(DEFAULT_ADMIN.phone);
    let admin = await Admin.findOne({ phone: formattedPhone });

    if (!admin) {
      admin = new Admin({
        name: DEFAULT_ADMIN.name,
        phone: formattedPhone,
        password: DEFAULT_ADMIN.password,
        role: 'admin',
        status: 'ACTIVE',
      });
      await admin.save();
    }
    return admin;
  }

  /**
   * Generate JWT Token for authenticated Admin
   */
  generateAdminToken(admin) {
    return jwt.sign(
      {
        id: admin._id,
        phone: admin.phone,
        role: 'admin',
        isAdmin: true,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Format admin profile for response
   */
  formatAdminProfile(admin) {
    return {
      _id: admin._id,
      name: admin.name,
      phone: admin.phone,
      role: admin.role || 'admin',
      status: admin.status || 'ACTIVE',
      createdAt: admin.createdAt,
    };
  }

  /**
   * Admin Login with Phone Number & Password
   */
  async loginAdmin(phone, password) {
    if (!phone || !password) {
      throw new ApiError(400, 'Mobile number and password are required');
    }

    // Ensure default admin exists
    await this.seedDefaultAdmin();

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    const admin = await Admin.findOne({ phone: formattedPhone }).select('+password');
    if (!admin) {
      throw new ApiError(401, 'Invalid mobile number or password');
    }

    if (admin.status === 'INACTIVE') {
      throw new ApiError(403, 'Your admin account has been deactivated. Please contact the owner.');
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid mobile number or password');
    }

    const token = this.generateAdminToken(admin);

    return {
      token,
      admin: this.formatAdminProfile(admin),
    };
  }

  /**
   * Get current authenticated admin profile
   */
  async getAdminProfile(adminId) {
    if (!adminId) {
      throw new ApiError(400, 'Admin ID is required');
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new ApiError(404, 'Admin account not found');
    }

    return this.formatAdminProfile(admin);
  }
}

module.exports = new AdminAuthService();
