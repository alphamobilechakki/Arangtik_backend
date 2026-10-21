const mongoose = require('mongoose');
const RegisteredVendor = require('../../vendor/registeredVendor.model');
const UnregisteredVendor = require('../../vendor/unregisteredVendor.model');
const Order = require('../../order/order.model');
const LaundryOrder = Order;
require('../../auth/user.model');
const { formatPhoneNumber } = require('../../../utils/whatsapp.service');
const ApiError = require('../../../utils/apiError');
const VendorCategory = require('../vendorCategory/vendorCategory.model');

class AdminVendorService {
  /**
   * 1. Get Aggregated Vendor Statistics (KPI Cards for Admin)
   */
  async getVendorStats() {
    const [
      totalRegistered,
      activeRegistered,
      inactiveRegistered,
      suspendedRegistered,
      verifiedRegistered,
      totalUnregistered,
      convertedUnregistered,
      pendingUnregistered,
      categoryAgg,
      registeredOrdersAgg,
      unregisteredOrdersAgg,
    ] = await Promise.all([
      RegisteredVendor.countDocuments(),
      RegisteredVendor.countDocuments({ status: 'ACTIVE' }),
      RegisteredVendor.countDocuments({ status: 'INACTIVE' }),
      RegisteredVendor.countDocuments({ status: 'SUSPENDED' }),
      RegisteredVendor.countDocuments({ isVerified: true }),
      UnregisteredVendor.countDocuments(),
      UnregisteredVendor.countDocuments({ isConvertedToRegistered: true }),
      UnregisteredVendor.countDocuments({ isConvertedToRegistered: false }),
      RegisteredVendor.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      RegisteredVendor.aggregate([
        { $group: { _id: null, total: { $sum: '$totalOrdersHandled' } } },
      ]),
      UnregisteredVendor.aggregate([
        { $match: { isConvertedToRegistered: false } },
        { $group: { _id: null, total: { $sum: '$totalOrders' } } },
      ]),
    ]);

    const totalOrdersProcessed =
      (registeredOrdersAgg[0]?.total || 0) + (unregisteredOrdersAgg[0]?.total || 0);

    const categoryDistribution = categoryAgg.map((item) => ({
      category: item._id || 'Unassigned',
      count: item.count,
    }));

    return {
      registered: {
        total: totalRegistered,
        active: activeRegistered,
        inactive: inactiveRegistered,
        suspended: suspendedRegistered,
        verified: verifiedRegistered,
      },
      unregistered: {
        total: totalUnregistered,
        converted: convertedUnregistered,
        pending: pendingUnregistered,
      },
      totalVendors: totalRegistered + totalUnregistered,
      totalOrdersProcessed,
      categoryDistribution,
    };
  }

  /**
   * 2. Get Paginated & Filtered List of Registered Vendors
   */
  async getRegisteredVendors({
    page = 1,
    limit = 10,
    search = '',
    status = 'ALL',
    category = 'ALL',
    isVerified,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const conditions = [];

    if (status && status !== 'ALL') {
      conditions.push({ status });
    }

    if (category && category !== 'ALL') {
      const catRegex = new RegExp(`^${category.trim()}$`, 'i');
      conditions.push({
        $or: [
          { category: catRegex },
          { primaryCategory: catRegex },
          { categories: catRegex },
        ],
      });
    }

    if (isVerified !== undefined && isVerified !== '' && isVerified !== 'ALL') {
      conditions.push({ isVerified: isVerified === 'true' || isVerified === true });
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      conditions.push({
        $or: [
          { name: regex },
          { phone: regex },
          { vendorId: regex },
          { businessName: regex },
          { 'address.city': regex },
          { 'address.state': regex },
        ],
      });
    }

    const filter = conditions.length > 0 ? { $and: conditions } : {};

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy || 'createdAt']: sortDirection };

    const [vendors, totalRecords] = await Promise.all([
      RegisteredVendor.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name phone email profileImage')
        .populate('addedByUsers.userId', 'name phone')
        .lean(),
      RegisteredVendor.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    return {
      vendors,
      pagination: {
        currentPage: pageNum,
        perPage: limitNum,
        totalRecords,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  /**
   * 3. Get Paginated & Filtered List of Unregistered Vendors
   */
  async getUnregisteredVendors({
    page = 1,
    limit = 10,
    search = '',
    isConverted = 'ALL',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (isConverted !== undefined && isConverted !== '' && isConverted !== 'ALL') {
      filter.isConvertedToRegistered = isConverted === 'true' || isConverted === true;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { name: regex },
        { phone: regex },
        { 'addedByUsers.nameGiven': regex },
      ];
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy || 'createdAt']: sortDirection };

    const [vendors, totalRecords] = await Promise.all([
      UnregisteredVendor.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('addedByUsers.userId', 'name phone profileImage')
        .populate('convertedVendorId', 'vendorId name phone category businessName status')
        .lean(),
      UnregisteredVendor.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    return {
      vendors,
      pagination: {
        currentPage: pageNum,
        perPage: limitNum,
        totalRecords,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  /**
   * 4. Get Registered Vendor Details by ID with Recent Orders
   */
  async getRegisteredVendorById(id) {
    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id };
    } else {
      query = { vendorId: id };
    }

    const vendor = await RegisteredVendor.findOne(query)
      .populate('userId', 'name phone email profileImage')
      .populate('addedByUsers.userId', 'name phone')
      .lean();

    if (!vendor) {
      throw new ApiError(404, 'Registered vendor not found');
    }

    // Fetch up to 10 recent laundry orders handled by this vendor
    const recentOrders = await LaundryOrder.find({
      $or: [{ vendorId: vendor._id }, { vendorPhone: vendor.phone }],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber status pickupDate expectedDeliveryDate totalItems userPhone userName createdAt')
      .lean();

    return {
      ...vendor,
      recentOrders: recentOrders || [],
    };
  }

  /**
   * 5. Get Unregistered Vendor Details by ID with Linked Customers & Orders
   */
  async getUnregisteredVendorById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid unregistered vendor ID');
    }

    const vendor = await UnregisteredVendor.findById(id)
      .populate('addedByUsers.userId', 'name phone profileImage')
      .populate('convertedVendorId', 'vendorId name phone category businessName status')
      .lean();

    if (!vendor) {
      throw new ApiError(404, 'Unregistered vendor not found');
    }

    // Fetch recent laundry orders placed with this vendor's phone number
    const recentOrders = await LaundryOrder.find({
      vendorPhone: vendor.phone,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber status pickupDate expectedDeliveryDate totalItems userPhone userName isRegisteredVendor createdAt')
      .lean();

    return {
      ...vendor,
      recentOrders: recentOrders || [],
    };
  }

  /**
   * 6. Create a New Registered Vendor Directly by Admin
   */
  async createRegisteredVendor(data) {
    let {
      name,
      phone,
      category,
      categories,
      primaryCategory,
      businessName = '',
      status = 'ACTIVE',
      address = {},
      rating = 5.0,
      isVerified = true,
      password,
    } = data;

    if (!category || category === 'Dhobi') {
      const firstCat = await VendorCategory.findOne({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
      category = firstCat?.name || 'General';
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Invalid phone number format');
    }

    // Check if vendor already exists in RegisteredVendor
    const existing = await RegisteredVendor.findOne({ phone: formattedPhone });
    if (existing) {
      throw new ApiError(409, `Vendor already registered with phone number ${formattedPhone}`);
    }

    const initialCategories =
      Array.isArray(categories) && categories.length > 0
        ? categories.map((c) => String(c).trim()).filter(Boolean)
        : category ? [String(category).trim()] : [];
    const initialPrimaryCat = primaryCategory || initialCategories[0] || (category ? String(category).trim() : '');

    if (!initialPrimaryCat) {
      throw new ApiError(400, 'Vendor service category is required');
    }

    const vendor = await RegisteredVendor.create({
      name: String(name).trim(),
      phone: formattedPhone,
      category: initialPrimaryCat,
      primaryCategory: initialPrimaryCat,
      categories: initialCategories,
      businessName: String(businessName || '').trim(),
      status,
      address: {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        pincode: address.pincode || '',
      },
      rating: typeof rating === 'number' ? rating : 5.0,
      isVerified: isVerified !== undefined ? isVerified : true,
      password: password || undefined,
    });

    // If an unregistered lead exists with this phone, auto-convert it
    const unreg = await UnregisteredVendor.findOne({ phone: formattedPhone });
    if (unreg) {
      unreg.isConvertedToRegistered = true;
      unreg.convertedVendorId = vendor._id;
      unreg.convertedAt = new Date();
      await unreg.save();

      // Copy over addedByUsers if any
      if (Array.isArray(unreg.addedByUsers) && unreg.addedByUsers.length > 0) {
        vendor.addedByUsers = unreg.addedByUsers;
        vendor.totalOrdersHandled = Math.max(vendor.totalOrdersHandled, unreg.totalOrders || 0);
        await vendor.save();
      }

      // Link existing laundry orders
      await LaundryOrder.updateMany(
        { vendorPhone: formattedPhone },
        {
          $set: {
            vendorId: vendor._id,
            vendorName: vendor.name,
            isRegisteredVendor: true,
          },
        }
      );
    }

    return vendor;
  }

  /**
   * 7. Update Registered Vendor Profile (PATCH)
   */
  async updateRegisteredVendor(id, updateData) {
    let vendor;
    if (mongoose.Types.ObjectId.isValid(id)) {
      vendor = await RegisteredVendor.findById(id);
    } else {
      vendor = await RegisteredVendor.findOne({ vendorId: id });
    }

    if (!vendor) {
      throw new ApiError(404, 'Registered vendor not found');
    }

    const allowedFields = [
      'name',
      'businessName',
      'category',
      'primaryCategory',
      'categories',
      'status',
      'rating',
      'isVerified',
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        vendor[field] = updateData[field];
      }
    });

    if (updateData.address && typeof updateData.address === 'object') {
      vendor.address = {
        street: updateData.address.street !== undefined ? updateData.address.street : vendor.address?.street,
        city: updateData.address.city !== undefined ? updateData.address.city : vendor.address?.city,
        state: updateData.address.state !== undefined ? updateData.address.state : vendor.address?.state,
        pincode: updateData.address.pincode !== undefined ? updateData.address.pincode : vendor.address?.pincode,
      };
    }

    await vendor.save();
    return vendor;
  }

  /**
   * 8. Update Registered Vendor Status (ACTIVE, INACTIVE, SUSPENDED)
   */
  async updateRegisteredVendorStatus(id, status) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    let vendor;
    if (mongoose.Types.ObjectId.isValid(id)) {
      vendor = await RegisteredVendor.findById(id);
    } else {
      vendor = await RegisteredVendor.findOne({ vendorId: id });
    }

    if (!vendor) {
      throw new ApiError(404, 'Registered vendor not found');
    }

    vendor.status = status;
    await vendor.save();
    return vendor;
  }

  /**
   * 9. Convert Unregistered Vendor into Official Registered Vendor
   */
  async convertUnregisteredVendor(id, convertData = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid unregistered vendor ID');
    }

    const unreg = await UnregisteredVendor.findById(id);
    if (!unreg) {
      throw new ApiError(404, 'Unregistered vendor record not found');
    }

    const formattedPhone = formatPhoneNumber(unreg.phone);

    // Check if vendor already exists in RegisteredVendor
    let vendor = await RegisteredVendor.findOne({ phone: formattedPhone });

    if (!vendor) {
      const vendorName = convertData.name || unreg.name || 'Vendor';
      const category = convertData.category ? String(convertData.category).trim() : 'General';
      const businessName = convertData.businessName || '';

      vendor = await RegisteredVendor.create({
        name: vendorName.trim(),
        phone: formattedPhone,
        category: category,
        primaryCategory: category,
        categories: [category],
        businessName: businessName.trim(),
        status: 'ACTIVE',
        isRegistered: true,
        isVerified: true,
        totalOrdersHandled: unreg.totalOrders || 0,
        addedByUsers: unreg.addedByUsers || [],
        address: convertData.address || {},
      });
    } else {
      // Existing vendor record: ensure isRegistered is true
      vendor.isRegistered = true;
      if (convertData.name) vendor.name = convertData.name.trim();
      if (convertData.category) {
        const cat = String(convertData.category).trim();
        vendor.category = cat;
        vendor.primaryCategory = cat;
        if (!vendor.categories || !vendor.categories.includes(cat)) {
          vendor.categories = [...(vendor.categories || []), cat];
        }
      }
      if (convertData.businessName) vendor.businessName = convertData.businessName.trim();
      vendor.totalOrdersHandled = Math.max(vendor.totalOrdersHandled || 0, unreg.totalOrders || 0);
      await vendor.save();
    }

    // Mark unregistered record as converted
    unreg.isConvertedToRegistered = true;
    unreg.convertedVendorId = vendor._id;
    unreg.convertedAt = new Date();
    await unreg.save();

    // Re-link past laundry orders to official registered vendor
    await LaundryOrder.updateMany(
      { vendorPhone: formattedPhone },
      {
        $set: {
          vendorId: vendor._id,
          vendorName: vendor.name,
          isRegisteredVendor: true,
        },
      }
    );

    return {
      vendor,
      unregisteredVendor: unreg,
    };
  }

  /**
   * 10. Delete / Deactivate Registered Vendor
   */
  async deleteRegisteredVendor(id, hard = false) {
    let vendor;
    if (mongoose.Types.ObjectId.isValid(id)) {
      vendor = await RegisteredVendor.findById(id);
    } else {
      vendor = await RegisteredVendor.findOne({ vendorId: id });
    }

    if (!vendor) {
      throw new ApiError(404, 'Registered vendor not found');
    }

    if (hard === true || hard === 'true') {
      await RegisteredVendor.deleteOne({ _id: vendor._id });
      return { success: true, message: 'Vendor record permanently removed' };
    }

    vendor.status = 'INACTIVE';
    await vendor.save();
    return { success: true, message: 'Vendor status set to INACTIVE', vendor };
  }
}

module.exports = new AdminVendorService();
