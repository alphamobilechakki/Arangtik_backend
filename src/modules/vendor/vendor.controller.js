const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const vendorService = require('./vendor.service');

class VendorController {
  // ==========================================
  // 1. AUTHENTICATION & ONBOARDING (OTP FLOW)
  // ==========================================

  sendOtp = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const result = await vendorService.sendOtp(phone);
    return ApiResponse.success(res, result, 'OTP sent successfully to vendor mobile number');
  });

  verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    const result = await vendorService.verifyOtp(phone, otp, req.body);
    const message = result.isNewVendor
      ? 'Vendor registered successfully'
      : 'Vendor logged in successfully';
    return ApiResponse.success(res, result, message);
  });

  // ==========================================
  // 2. PROFILE MANAGEMENT (SELF)
  // ==========================================

  getProfile = asyncHandler(async (req, res) => {
    const vendorId = req.vendor?._id || req.user?.id;
    const vendor = await vendorService.getProfile(vendorId);
    return ApiResponse.success(res, vendor, 'Vendor profile fetched successfully');
  });

  updateProfile = asyncHandler(async (req, res) => {
    const vendorId = req.vendor?._id || req.user?.id;
    const vendor = await vendorService.updateProfile(vendorId, req.body);
    return ApiResponse.success(res, vendor, 'Vendor profile updated successfully');
  });

  // ==========================================
  // 3. VENDOR CRUD & MANAGEMENT (MODEL BASED)
  // ==========================================

  getAllVendors = asyncHandler(async (req, res) => {
    const result = await vendorService.getAllVendors(req.query);
    return ApiResponse.success(res, result, 'Vendors retrieved successfully');
  });

  getVendorById = asyncHandler(async (req, res) => {
    const vendor = await vendorService.getVendorById(req.params.id);
    return ApiResponse.success(res, vendor, 'Vendor retrieved successfully');
  });

  createVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.createVendor(req.body);
    return ApiResponse.created(res, vendor, 'Vendor created successfully');
  });

  updateVendor = asyncHandler(async (req, res) => {
    const vendor = await vendorService.updateVendor(req.params.id, req.body);
    return ApiResponse.success(res, vendor, 'Vendor updated successfully');
  });

  deleteVendor = asyncHandler(async (req, res) => {
    const result = await vendorService.deleteVendor(req.params.id, req.query.hard);
    return ApiResponse.success(res, result, result.message);
  });

  updateVendorStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const vendor = await vendorService.updateVendorStatus(req.params.id, status);
    return ApiResponse.success(res, vendor, `Vendor status updated to ${status}`);
  });

  verifyVendor = asyncHandler(async (req, res) => {
    const { isVerified } = req.body;
    const vendor = await vendorService.verifyVendor(
      req.params.id,
      isVerified !== undefined ? isVerified : true
    );
    const message = vendor.isVerified
      ? 'Vendor verified successfully'
      : 'Vendor verification revoked';
    return ApiResponse.success(res, vendor, message);
  });

  // ==========================================
  // 4. GEOSPATIAL & DISCOVERY
  // ==========================================

  getNearbyVendors = asyncHandler(async (req, res) => {
    const latitude = req.query?.latitude ?? req.query?.lat;
    const longitude = req.query?.longitude ?? req.query?.lng;
    const radius = req.query?.radius ?? req.query?.maxDistance;
    const status = req.query?.status;
    const isVerified = req.query?.isVerified;
    const limit = req.query?.limit;

    const vendors = await vendorService.getNearbyVendors({
      latitude,
      longitude,
      radius,
      status,
      isVerified,
      limit,
    });
    return ApiResponse.success(res, vendors, 'Nearby vendors retrieved successfully');
  });

  getEligibleVendors = asyncHandler(async (req, res) => {
    let category = req.query?.category || req.body?.category;
    if (!category) {
      const Category = require('../category/category.model');
      const firstCat = await Category.findOne({ isActive: true }).sort({ sortOrder: 1 });
      category = firstCat?.name || '';
    }

    const vendors = await vendorService.getEligibleVendors({
      category,
      requiredServices: req.query?.services || req.body?.requiredServices || req.body?.services,
      latitude: req.query?.latitude ?? req.query?.lat ?? req.body?.latitude ?? req.body?.lat,
      longitude: req.query?.longitude ?? req.query?.lng ?? req.body?.longitude ?? req.body?.lng,
      radius: req.query?.radius ?? req.query?.maxDistance ?? req.body?.radius ?? req.body?.maxDistance,
    });

    return ApiResponse.success(res, vendors, 'Eligible vendors retrieved successfully');
  });

  // ==========================================
  // 5. VENDOR SERVICES MANAGEMENT & CATALOG
  // ==========================================

  getServices = asyncHandler(async (req, res) => {
    const vendorId = req.vendor?._id || req.user?.id;
    const services = await vendorService.getServices(vendorId);
    return ApiResponse.success(res, services, 'Vendor services fetched successfully');
  });

  updateServices = asyncHandler(async (req, res) => {
    const vendorId = req.vendor?._id || req.user?.id;
    const vendor = await vendorService.updateServices(vendorId, req.body);
    return ApiResponse.success(res, vendor, 'Vendor services updated successfully');
  });

  getVendorServices = asyncHandler(async (req, res) => {
    const result = await vendorService.getVendorServices(req.params.id);
    return ApiResponse.success(res, result, 'Vendor offered services retrieved successfully');
  });

  getCategories = asyncHandler(async (req, res) => {
    const categories = await vendorService.getCategories();
    return ApiResponse.success(res, categories, 'Categories fetched successfully');
  });

  getCategoryServices = asyncHandler(async (req, res) => {
    const { category } = req.params;
    const services = await vendorService.getCategoryServices(category);
    return ApiResponse.success(res, services, 'Category services fetched successfully');
  });

  // ==========================================
  // 6. WORK ORDERS FOR AUTHENTICATED VENDOR
  // ==========================================

  getOrders = asyncHandler(async (req, res) => {
    const result = await vendorService.getVendorOrders(req.vendor, req.query);
    return ApiResponse.success(res, result, 'Vendor work orders retrieved successfully');
  });

  getOrderById = asyncHandler(async (req, res) => {
    const order = await vendorService.getVendorOrderById(req.vendor, req.params.id);
    return ApiResponse.success(res, order, 'Vendor work order details retrieved');
  });

  updateOrderStatus = asyncHandler(async (req, res) => {
    const order = await vendorService.updateVendorOrderStatus(req.vendor, req.params.id, req.body);
    return ApiResponse.success(res, order, 'Work order status updated successfully by vendor');
  });
}

module.exports = new VendorController();
