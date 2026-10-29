const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Vendor = require('./vendor.model');
const UnregisteredVendor = require('./unregistered/unregisteredVendor.model');
const Otp = require('../auth/otp.model');
const Category = require('../category/category.model');
const CategoryService = require('../categoryService/categoryService.model');
const VendorService = require('../vendorService/vendorService.model');
const vendorServiceService = require('../vendorService/vendorService.service');
const unregisteredVendorService = require('./unregistered/unregisteredVendor.service');
const Order = require('../order/order.model');
const WardrobeItem = require('../wardrobe/wardrobeItem.model');
const ApiError = require('../../utils/apiError');
const { formatPhoneNumber, sendWhatsAppOtp } = require('../../utils/whatsapp.service');
const { JWT_SECRET, JWT_EXPIRES_IN, OTP_EXPIRY, TEST_PHONE, TEST_OTP } = require('../../config/env.config');

const isTestAccount = (phone) => {
  const target = (TEST_PHONE || '918949056321').replace(/\D/g, '');
  const cleaned = String(phone || '').replace(/\D/g, '');
  return cleaned === target || cleaned.endsWith('8949056321');
};

class VendorServiceClass {
  // Backwards-compatibility getters
  get login() {
    return this;
  }
  get signup() {
    return this;
  }
  get register() {
    return this;
  }
  get unregistered() {
    return unregisteredVendorService;
  }

  // ==========================================
  // 1. HELPERS & FORMATTERS
  // ==========================================

  generateVendorToken(vendor) {
    return jwt.sign(
      {
        id: vendor._id,
        vendorId: vendor.vendorId,
        phone: vendor.phone,
        role: 'vendor',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN || '30d' }
    );
  }

  formatVendorProfile(vendor, services = null) {
    if (!vendor) return null;

    const formatted = {
      _id: vendor._id,
      vendorId: vendor.vendorId,
      name: vendor.name,
      phone: vendor.phone,
      businessName: vendor.businessName || '',
      address: {
        street: vendor.address?.street || '',
        city: vendor.address?.city || '',
        state: vendor.address?.state || '',
        pincode: vendor.address?.pincode || '',
      },
      location: vendor.location || null,
      status: vendor.status || 'ACTIVE',
      isVerified: Boolean(vendor.isVerified),
      verifiedAt: vendor.verifiedAt || null,
      rating: vendor.rating || 0,
      totalOrdersHandled: vendor.totalOrdersHandled || 0,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };

    if (services !== null) {
      formatted.services = services;
    }

    return formatted;
  }

  resolveLocation(location, fallback = {}) {
    if (!location && !fallback.latitude && !fallback.lat && !fallback.coordinates) {
      return undefined;
    }

    if (Array.isArray(location?.coordinates) && location.coordinates.length === 2) {
      const [lng, lat] = location.coordinates.map(Number);
      if (!isNaN(lng) && !isNaN(lat)) {
        return { type: 'Point', coordinates: [lng, lat] };
      }
    }

    const lat = location?.latitude ?? location?.lat ?? fallback.latitude ?? fallback.lat;
    const lng = location?.longitude ?? location?.lng ?? fallback.longitude ?? fallback.lng;
    if (lat !== undefined && lng !== undefined) {
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (!isNaN(numLat) && !isNaN(numLng)) {
        return { type: 'Point', coordinates: [numLng, numLat] };
      }
    }

    return undefined;
  }

  resolveAddress(address, fallback = {}) {
    if (!address && !fallback.address) {
      return {
        street: '',
        city: '',
        state: '',
        pincode: '',
      };
    }

    const src = address || fallback.address || {};
    return {
      street: src.street !== undefined ? String(src.street).trim() : '',
      city: src.city !== undefined ? String(src.city).trim() : '',
      state: src.state !== undefined ? String(src.state).trim() : '',
      pincode: src.pincode !== undefined ? String(src.pincode).trim() : '',
    };
  }

  async generateUniqueVendorId() {
    let attempts = 0;
    while (attempts < 10) {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const candidateId = `VND-${randomSuffix}`;
      const exists = await Vendor.findOne({ vendorId: candidateId });
      if (!exists) {
        return candidateId;
      }
      attempts++;
    }
    return `VND-${Date.now().toString().slice(-6)}`;
  }

  async findVendorByIdOrCode(identifier) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      const vendor = await Vendor.findById(trimmed);
      if (vendor) return vendor;
    }

    return Vendor.findOne({
      $or: [{ vendorId: trimmed }, { phone: trimmed }],
    });
  }

  // ==========================================
  // 2. AUTHENTICATION (OTP FLOW)
  // ==========================================

  async sendOtp(phone) {
    if (!phone) {
      throw new ApiError(400, 'Vendor phone number is required');
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    const existingVendor = await Vendor.findOne({ phone: formattedPhone });
    if (existingVendor && (existingVendor.status === 'INACTIVE' || existingVendor.status === 'SUSPENDED')) {
      throw new ApiError(403, 'Your vendor account is inactive or suspended. Please contact support.');
    }

    const isExistingVendor = !!(existingVendor && existingVendor.status === 'ACTIVE');
    const isTest = isTestAccount(formattedPhone);

    const otp = isTest ? (TEST_OTP || '1234') : Math.floor(1000 + Math.random() * 9000).toString();
    const expiryMins = parseInt(OTP_EXPIRY, 10) || 5;
    const expiresAt = isTest
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + expiryMins * 60 * 1000);

    await Otp.deleteMany({ phone: formattedPhone });
    await Otp.create({ phone: formattedPhone, otp, expiresAt });

    if (isTest) {
      try {
        await sendWhatsAppOtp(formattedPhone, otp);
      } catch (err) {
        console.warn(`[Vendor OTP Test]: WhatsApp send skipped for ${formattedPhone}:`, err.message);
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

  async verifyOtp(phone, otp, signupData = {}) {
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

    let vendor = await Vendor.findOne({ phone: formattedPhone });

    // Existing active vendor login
    if (vendor && vendor.status === 'ACTIVE') {
      if (!isTest) await Otp.deleteMany({ phone: formattedPhone });
      const token = this.generateVendorToken(vendor);
      const services = await vendorServiceService.getServicesByVendor(vendor._id);
      return {
        token,
        isNewVendor: false,
        vendor: this.formatVendorProfile(vendor, services),
      };
    }

    if (vendor && (vendor.status === 'INACTIVE' || vendor.status === 'SUSPENDED')) {
      throw new ApiError(403, 'Your vendor account is inactive or suspended. Please contact support.');
    }

    // New vendor signup completion
    const { name, businessName, address, location, services } = signupData;
    const vendorLocation = this.resolveLocation(location, signupData);

    let vendorName = name ? String(name).trim() : '';
    if (!vendorName && vendor && vendor.name) vendorName = vendor.name;

    if (!vendorName) {
      const unreg = await UnregisteredVendor.findOne({ phone: formattedPhone });
      if (unreg && unreg.name) vendorName = unreg.name;
    }

    if (!vendorName) {
      throw new ApiError(400, 'Vendor name is required to complete signup');
    }

    if (!vendor) {
      const vendorId = await this.generateUniqueVendorId();
      vendor = new Vendor({
        vendorId,
        name: vendorName,
        phone: formattedPhone,
        businessName: businessName ? String(businessName).trim() : '',
        address: this.resolveAddress(address),
        location: vendorLocation,
        status: 'ACTIVE',
        isVerified: false,
        rating: 0,
        totalOrdersHandled: 0,
      });
    } else {
      vendor.name = vendorName;
      if (businessName !== undefined) vendor.businessName = String(businessName).trim();
      if (address !== undefined) vendor.address = this.resolveAddress(address);
      if (vendorLocation) vendor.location = vendorLocation;
      vendor.status = 'ACTIVE';
    }

    await vendor.save();

    // Assign any services provided during signup
    let assignedServices = [];
    if (Array.isArray(services) && services.length > 0) {
      try {
        assignedServices = await vendorServiceService.bulkAssignServices(vendor._id, services);
      } catch (srvErr) {
        console.warn('[Vendor Signup Services Notice]:', srvErr.message);
      }
    }

    // Auto-convert any matching unregistered vendor entry and link orders
    try {
      const unreg = await UnregisteredVendor.findOne({ phone: formattedPhone });
      if (unreg) {
        unreg.isConvertedToRegistered = true;
        unreg.convertedVendorId = vendor._id;
        unreg.convertedAt = new Date();
        await unreg.save();

        await Order.updateMany(
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
    } catch (err) {
      console.warn('[Vendor Signup Sync Warning]:', err.message);
    }

    if (!isTest) await Otp.deleteMany({ phone: formattedPhone });

    const token = this.generateVendorToken(vendor);
    return {
      token,
      isNewVendor: true,
      vendor: this.formatVendorProfile(vendor, assignedServices),
    };
  }

  // ==========================================
  // 3. PROFILE MANAGEMENT (SELF)
  // ==========================================

  async getProfile(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    const services = await vendorServiceService.getServicesByVendor(vendorId);
    return this.formatVendorProfile(vendor, services);
  }

  async updateProfile(vendorId, updateData = {}) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    const { name, businessName, address, location } = updateData;

    if (name && String(name).trim()) {
      vendor.name = String(name).trim();
    }

    if (businessName !== undefined) {
      vendor.businessName = String(businessName).trim();
    }

    if (address && typeof address === 'object') {
      vendor.address = {
        street: address.street !== undefined ? String(address.street).trim() : vendor.address?.street || '',
        city: address.city !== undefined ? String(address.city).trim() : vendor.address?.city || '',
        state: address.state !== undefined ? String(address.state).trim() : vendor.address?.state || '',
        pincode: address.pincode !== undefined ? String(address.pincode).trim() : vendor.address?.pincode || '',
      };
    }

    const resolvedLocation = this.resolveLocation(location, updateData);
    if (resolvedLocation) {
      vendor.location = resolvedLocation;
    }

    await vendor.save();

    const services = await vendorServiceService.getServicesByVendor(vendorId);
    return this.formatVendorProfile(vendor, services);
  }

  // ==========================================
  // 4. VENDOR CRUD & MANAGEMENT (BASED ON MODEL)
  // ==========================================

  async createVendor(data = {}) {
    const {
      name,
      phone,
      businessName,
      address,
      location,
      status = 'ACTIVE',
      isVerified = false,
      rating = 0,
      totalOrdersHandled = 0,
    } = data;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new ApiError(400, 'Vendor name is required');
    }

    if (!phone) {
      throw new ApiError(400, 'Vendor phone number is required');
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
    }

    const existingVendor = await Vendor.findOne({ phone: formattedPhone });
    if (existingVendor) {
      throw new ApiError(409, `A vendor with phone number ${formattedPhone} already exists`);
    }

    const vendorId = data.vendorId || (await this.generateUniqueVendorId());
    const existingId = await Vendor.findOne({ vendorId });
    if (existingId) {
      throw new ApiError(409, `Vendor with ID ${vendorId} already exists`);
    }

    const vendorLocation = this.resolveLocation(location, data);
    const vendorAddress = this.resolveAddress(address);

    const vendor = new Vendor({
      vendorId,
      name: name.trim(),
      phone: formattedPhone,
      businessName: businessName ? String(businessName).trim() : '',
      address: vendorAddress,
      location: vendorLocation,
      status: ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status) ? status : 'ACTIVE',
      isVerified: Boolean(isVerified),
      verifiedAt: isVerified ? new Date() : null,
      rating: Math.max(0, Math.min(5, Number(rating) || 0)),
      totalOrdersHandled: Math.max(0, Number(totalOrdersHandled) || 0),
    });

    await vendor.save();
    return this.formatVendorProfile(vendor);
  }

  async getAllVendors(query = {}) {
    const {
      status,
      isVerified,
      search,
      city,
      state,
      pincode,
      minRating,
      maxRating,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = query;

    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (isVerified !== undefined && isVerified !== '' && isVerified !== 'ALL') {
      filter.isVerified = isVerified === 'true' || isVerified === true;
    }

    if (city && String(city).trim()) {
      filter['address.city'] = new RegExp(String(city).trim(), 'i');
    }

    if (state && String(state).trim()) {
      filter['address.state'] = new RegExp(String(state).trim(), 'i');
    }

    if (pincode && String(pincode).trim()) {
      filter['address.pincode'] = String(pincode).trim();
    }

    if (minRating !== undefined || maxRating !== undefined) {
      filter.rating = {};
      if (minRating !== undefined) filter.rating.$gte = Number(minRating);
      if (maxRating !== undefined) filter.rating.$lte = Number(maxRating);
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { businessName: searchRegex },
        { vendorId: searchRegex },
        { 'address.city': searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    const allowedSortFields = ['createdAt', 'rating', 'totalOrdersHandled', 'name', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortObj[sortField] = sortOrder === 'asc' ? 1 : -1;

    const [vendors, total] = await Promise.all([
      Vendor.find(filter).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Vendor.countDocuments(filter),
    ]);

    return {
      vendors: vendors.map((v) => this.formatVendorProfile(v)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getVendorById(id) {
    const vendor = await this.findVendorByIdOrCode(id);
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    const services = await vendorServiceService.getServicesByVendor(vendor._id);
    return this.formatVendorProfile(vendor, services);
  }

  async updateVendor(id, data = {}) {
    const vendor = await this.findVendorByIdOrCode(id);
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    const {
      name,
      phone,
      businessName,
      address,
      location,
      status,
      isVerified,
      rating,
      totalOrdersHandled,
    } = data;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new ApiError(400, 'Vendor name cannot be empty');
      }
      vendor.name = name.trim();
    }

    if (phone !== undefined) {
      const formattedPhone = formatPhoneNumber(phone);
      if (!formattedPhone || formattedPhone.length < 10) {
        throw new ApiError(400, 'Please provide a valid 10-digit mobile number');
      }
      if (formattedPhone !== vendor.phone) {
        const phoneExists = await Vendor.findOne({ phone: formattedPhone, _id: { $ne: vendor._id } });
        if (phoneExists) {
          throw new ApiError(409, `Phone number ${formattedPhone} is already in use by another vendor`);
        }
        vendor.phone = formattedPhone;
      }
    }

    if (businessName !== undefined) {
      vendor.businessName = String(businessName).trim();
    }

    if (address && typeof address === 'object') {
      vendor.address = {
        street: address.street !== undefined ? String(address.street).trim() : vendor.address?.street || '',
        city: address.city !== undefined ? String(address.city).trim() : vendor.address?.city || '',
        state: address.state !== undefined ? String(address.state).trim() : vendor.address?.state || '',
        pincode: address.pincode !== undefined ? String(address.pincode).trim() : vendor.address?.pincode || '',
      };
    }

    const resolvedLocation = this.resolveLocation(location, data);
    if (resolvedLocation) {
      vendor.location = resolvedLocation;
    }

    if (status !== undefined) {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, `Invalid vendor status. Allowed values: ${validStatuses.join(', ')}`);
      }
      vendor.status = status;
    }

    if (isVerified !== undefined) {
      const boolVerified = Boolean(isVerified);
      if (vendor.isVerified !== boolVerified) {
        vendor.isVerified = boolVerified;
        vendor.verifiedAt = boolVerified ? new Date() : null;
      }
    }

    if (rating !== undefined) {
      vendor.rating = Math.max(0, Math.min(5, Number(rating) || 0));
    }

    if (totalOrdersHandled !== undefined) {
      vendor.totalOrdersHandled = Math.max(0, Number(totalOrdersHandled) || 0);
    }

    await vendor.save();
    const services = await vendorServiceService.getServicesByVendor(vendor._id);
    return this.formatVendorProfile(vendor, services);
  }

  async deleteVendor(id, hard = false) {
    const vendor = await this.findVendorByIdOrCode(id);
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    const isHard = hard === true || hard === 'true';

    if (isHard) {
      await Vendor.findByIdAndDelete(vendor._id);
      await VendorService.deleteMany({ vendorId: vendor._id });
      return {
        id: vendor._id,
        vendorId: vendor.vendorId,
        message: 'Vendor and associated services permanently deleted',
      };
    }

    vendor.status = 'INACTIVE';
    await vendor.save();
    return {
      id: vendor._id,
      vendorId: vendor.vendorId,
      status: vendor.status,
      message: 'Vendor marked as INACTIVE (soft deleted)',
    };
  }

  async updateVendorStatus(id, status) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!status || !validStatuses.includes(status)) {
      throw new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    const vendor = await this.findVendorByIdOrCode(id);
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    vendor.status = status;
    await vendor.save();
    return this.formatVendorProfile(vendor);
  }

  async verifyVendor(id, isVerified = true) {
    const vendor = await this.findVendorByIdOrCode(id);
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    const verified = Boolean(isVerified);
    vendor.isVerified = verified;
    vendor.verifiedAt = verified ? new Date() : null;

    await vendor.save();
    return this.formatVendorProfile(vendor);
  }

  // ==========================================
  // 5. GEOSPATIAL QUERIES (2DSPHERE INDEX)
  // ==========================================

  async getNearbyVendors({ latitude, longitude, radius = 20, status = 'ACTIVE', isVerified, limit = 50 } = {}) {
    if (latitude === undefined || longitude === undefined) {
      throw new ApiError(400, 'Both latitude and longitude are required for nearby vendor search');
    }

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new ApiError(400, 'Latitude must be between -90 and 90');
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new ApiError(400, 'Longitude must be between -180 and 180');
    }

    const maxDistanceInMeters = (Number(radius) || 20) * 1000;
    const filter = {
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistanceInMeters,
        },
      },
    };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (isVerified !== undefined && isVerified !== '' && isVerified !== 'ALL') {
      filter.isVerified = isVerified === 'true' || isVerified === true;
    }

    const vendors = await Vendor.find(filter)
      .limit(Math.min(100, Math.max(1, Number(limit) || 50)))
      .lean();

    return vendors.map((v) => this.formatVendorProfile(v));
  }

  async getEligibleVendors({ category, requiredServices = [], latitude, longitude, radius } = {}) {
    let eligibleVendorIds = null;

    if (category || (Array.isArray(requiredServices) && requiredServices.length > 0) || requiredServices) {
      let catServiceIds = [];

      if (category) {
        const catQuery = mongoose.Types.ObjectId.isValid(category)
          ? { _id: category }
          : { name: new RegExp(`^${String(category).trim()}$`, 'i') };
        const foundCategory = await Category.findOne(catQuery);
        if (foundCategory) {
          const catServices = await CategoryService.find({ categoryId: foundCategory._id, isActive: true }).select('_id');
          catServiceIds = catServices.map((s) => s._id);
        }
      }

      const reqList = Array.isArray(requiredServices)
        ? requiredServices.map((s) => String(s).trim()).filter(Boolean)
        : String(requiredServices || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

      let targetServiceIds = catServiceIds;

      if (reqList.length > 0) {
        const matchedCategoryServices = await CategoryService.find({
          $or: [
            { name: { $in: reqList.map((s) => new RegExp(`^${s}$`, 'i')) } },
            ...reqList.filter((s) => mongoose.Types.ObjectId.isValid(s)).map((id) => ({ _id: id })),
          ],
          isActive: true,
        }).select('_id');

        const matchedIds = matchedCategoryServices.map((cs) => cs._id.toString());
        if (catServiceIds.length > 0) {
          targetServiceIds = catServiceIds.filter((id) => matchedIds.includes(id.toString()));
        } else {
          targetServiceIds = matchedCategoryServices.map((cs) => cs._id);
        }
      }

      if (targetServiceIds.length > 0) {
        const vsDocs = await VendorService.find({
          serviceId: { $in: targetServiceIds },
          status: 'ACTIVE',
          isAvailable: true,
        }).select('vendorId');

        eligibleVendorIds = [...new Set(vsDocs.map((doc) => doc.vendorId.toString()))];
      } else {
        eligibleVendorIds = [];
      }
    }

    const filter = {
      status: 'ACTIVE',
    };

    if (eligibleVendorIds !== null) {
      filter._id = { $in: eligibleVendorIds };
    }

    if (
      latitude !== undefined &&
      longitude !== undefined &&
      !isNaN(Number(latitude)) &&
      !isNaN(Number(longitude))
    ) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      const maxDistanceInMeters = (Number(radius) || 20) * 1000;
      filter.location = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistanceInMeters,
        },
      };
    }

    const vendors = await Vendor.find(filter)
      .select('name phone vendorId businessName rating totalOrdersHandled isVerified address location status createdAt updatedAt')
      .lean();

    if (vendors.length > 0) {
      const vIds = vendors.map((v) => v._id);
      const allServices = await VendorService.find({
        vendorId: { $in: vIds },
        status: 'ACTIVE',
        isAvailable: true,
      })
        .populate('serviceId', 'name icon imageUrl unit basePrice')
        .lean();

      const serviceMap = {};
      allServices.forEach((vs) => {
        const vid = vs.vendorId.toString();
        if (!serviceMap[vid]) serviceMap[vid] = [];
        serviceMap[vid].push(vs);
      });

      vendors.forEach((v) => {
        v.services = serviceMap[v._id.toString()] || [];
      });
    }

    return vendors;
  }

  // ==========================================
  // 6. SERVICES DISCOVERY & MANAGEMENT
  // ==========================================

  async getServices(vendorId) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new ApiError(404, 'Vendor not found');

    const services = await vendorServiceService.getServicesByVendor(vendorId);
    return {
      vendorId: vendor._id,
      services,
    };
  }

  async updateServices(vendorId, { services = [] } = {}) {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    if (!Array.isArray(services)) throw new ApiError(400, 'Services must be provided as an array');

    const assignedServices = await vendorServiceService.bulkAssignServices(vendorId, services);
    return this.formatVendorProfile(vendor, assignedServices);
  }

  async getVendorServices(vendorId) {
    const vendor = await this.findVendorByIdOrCode(vendorId);
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    const services = await vendorServiceService.getServicesByVendor(vendor._id, {
      isAvailable: true,
      status: 'ACTIVE',
    });

    return {
      vendorId: vendor._id,
      vendorCode: vendor.vendorId,
      vendorName: vendor.name,
      businessName: vendor.businessName || '',
      rating: vendor.rating || 0,
      isVerified: vendor.isVerified,
      services,
    };
  }

  async getCategories() {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    return categories.map((c) => ({
      id: c._id,
      name: c.name,
      code: c.code,
      icon: c.icon,
      imageUrl: c.imageUrl,
      description: c.description,
    }));
  }

  async getCategoryServices(categoryIdentifier) {
    let catId = categoryIdentifier;
    const cat = await Category.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${categoryIdentifier}$`, 'i') } },
        ...(Category.base.Types.ObjectId.isValid(categoryIdentifier) ? [{ _id: categoryIdentifier }] : []),
      ],
    });

    if (cat) catId = cat._id;
    return CategoryService.find({ categoryId: catId, isActive: true }).sort({ sortOrder: 1, name: 1 });
  }

  // ==========================================
  // 7. WORK ORDERS FOR AUTHENTICATED VENDOR
  // ==========================================

  async getVendorOrders(vendor, query = {}) {
    if (!vendor) {
      throw new ApiError(401, 'Vendor authentication required');
    }

    const { status, page = 1, limit = 20, search, category, orderCategory } = query;
    const formattedPhone = formatPhoneNumber(vendor.phone);

    const filter = {
      $or: [{ vendorId: vendor._id }, { vendorPhone: formattedPhone }],
    };

    const targetCategory = category || orderCategory;
    if (targetCategory && targetCategory !== 'ALL') {
      filter.orderCategory = targetCategory;
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search && String(search).trim()) {
      const searchRegex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$and = [
        {
          $or: [{ orderNumber: searchRegex }, { userName: searchRegex }, { userPhone: searchRegex }],
        },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate('userId', 'name phone email profileImage')
        .populate('items.wardrobeItemId')
        .lean(),
      Order.countDocuments(filter),
    ]);

    return {
      orders,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    };
  }

  async getVendorOrderById(vendor, orderId) {
    if (!vendor) {
      throw new ApiError(401, 'Vendor authentication required');
    }
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'Valid Order ID is required');
    }

    const formattedPhone = formatPhoneNumber(vendor.phone);
    const order = await Order.findOne({
      _id: orderId,
      $or: [{ vendorId: vendor._id }, { vendorPhone: formattedPhone }],
    })
      .populate('userId', 'name phone email profileImage address')
      .populate('items.wardrobeItemId');

    if (!order) {
      throw new ApiError(404, 'Work order not found or you are not authorized to view it');
    }

    return order;
  }

  async updateVendorOrderStatus(vendor, orderId, { status, note, cancelReason } = {}) {
    if (!vendor) {
      throw new ApiError(401, 'Vendor authentication required');
    }
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'Valid Order ID is required');
    }

    const formattedPhone = formatPhoneNumber(vendor.phone);
    const order = await Order.findOne({
      _id: orderId,
      $or: [{ vendorId: vendor._id }, { vendorPhone: formattedPhone }],
    });

    if (!order) {
      throw new ApiError(404, 'Order not found or unauthorized');
    }

    const VALID_STATUSES = [
      'PENDING_PICKUP',
      'PICKED_UP',
      'IN_PROCESS',
      'READY_FOR_DELIVERY',
      'DELIVERED',
      'REJECTED',
      'CANCELLED',
    ];

    if (!status || !VALID_STATUSES.includes(status)) {
      throw new ApiError(400, `Invalid order status. Allowed values: ${VALID_STATUSES.join(', ')}`);
    }

    order.status = status;

    if (!Array.isArray(order.timeline)) {
      order.timeline = [];
    }

    order.timeline.push({
      status,
      timestamp: new Date(),
      note: note || `Order status updated to ${status} by Vendor ${vendor.name}`,
      actor: 'VENDOR',
    });

    if (status === 'REJECTED' || status === 'CANCELLED') {
      order.cancelReason = cancelReason || note || 'Cancelled by vendor';
    }

    await order.save();

    // Sync transaction status
    try {
      const Transaction = require('../order/transaction.model');
      let targetTxnStatus = null;
      if (status === 'DELIVERED') targetTxnStatus = 'COMPLETED';
      else if (status === 'REJECTED' || status === 'CANCELLED') targetTxnStatus = 'CANCELLED';

      if (targetTxnStatus) {
        await Transaction.updateMany(
          { orderId: order._id },
          { $set: { status: targetTxnStatus, updatedAt: new Date() } }
        );
      }
    } catch (txnErr) {
      console.warn('[Transaction Sync Notice]:', txnErr.message);
    }

    // Sync wardrobe items status
    if (Array.isArray(order.items) && order.items.length > 0) {
      if (order.status === 'DELIVERED' || order.status === 'REJECTED') {
        const allItemIds = order.items.map((it) => it.wardrobeItemId).filter(Boolean);
        if (allItemIds.length > 0) {
          await WardrobeItem.updateMany({ _id: { $in: allItemIds } }, { $set: { status: 'ACTIVE' } });
        }
      } else if (['PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY'].includes(order.status)) {
        const allItemIds = order.items.map((it) => it.wardrobeItemId).filter(Boolean);
        if (allItemIds.length > 0) {
          await WardrobeItem.updateMany({ _id: { $in: allItemIds } }, { $set: { status: 'INACTIVE' } });
        }
      }
    }

    return order;
  }

  // ==========================================
  // 8. UNREGISTERED VENDOR DELEGATIONS
  // ==========================================

  async lookupVendor(phone, userId) {
    return unregisteredVendorService.lookupVendor(phone, userId);
  }

  async recordOrderVendor(params) {
    return unregisteredVendorService.recordOrderVendor(params);
  }

  async syncUnregisteredToRegistered(user) {
    return unregisteredVendorService.syncUnregisteredToRegistered(user);
  }
}

module.exports = new VendorServiceClass();
