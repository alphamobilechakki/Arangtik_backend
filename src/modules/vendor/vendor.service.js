const mongoose = require('mongoose');
const RegisteredVendor = require('./registeredVendor.model');
const Vendor = RegisteredVendor;
const UnregisteredVendor = require('./unregisteredVendor.model');
const Order = require('../order/order.model');
const LaundryOrder = Order;
const { formatPhoneNumber } = require('../../utils/whatsapp.service');
const ApiError = require('../../utils/apiError');

class VendorService {
  /**
   * Lookup vendor by phone number (Mobile App contact selection / manual typing)
   * Returns registered status, vendor identification, and name if available.
   */
  async lookupVendor(rawPhone, currentUserId = null) {
    if (!rawPhone) {
      throw new ApiError(400, 'Vendor phone number is required');
    }

    const formattedPhone = formatPhoneNumber(rawPhone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Invalid phone number format');
    }

    // 1. Check in Unified Vendor Table
    const existingVendor = await Vendor.findOne({
      phone: formattedPhone,
      status: 'ACTIVE',
    }).select('vendorId name phone category categoryCode isRegistered businessName rating totalOrdersHandled isVerified addedByUsers services offeredServices');

    if (existingVendor) {
      let preferredName = existingVendor.name || '';
      if (!existingVendor.isRegistered && currentUserId && Array.isArray(existingVendor.addedByUsers)) {
        const userEntry = existingVendor.addedByUsers.find(
          (u) => u.userId && u.userId.toString() === currentUserId.toString()
        );
        if (userEntry && userEntry.nameGiven) {
          preferredName = userEntry.nameGiven;
        }
      }

      return {
        isRegistered: existingVendor.isRegistered === true,
        vendor: {
          id: existingVendor._id,
          vendorId: existingVendor.vendorId,
          name: preferredName,
          phone: existingVendor.phone,
          category: existingVendor.category || existingVendor.primaryCategory || 'General',
          categoryCode: existingVendor.categoryCode || (existingVendor.category ? existingVendor.category.toUpperCase().replace(/[^A-Z0-9]+/g, '_') : 'GENERAL'),
          businessName: existingVendor.businessName || '',
          rating: existingVendor.rating,
          totalOrdersHandled: existingVendor.totalOrdersHandled,
          isVerified: existingVendor.isVerified,
          services: existingVendor.services || [],
          offeredServices: existingVendor.offeredServices || [],
        },
      };
    }

    // 2. Check in Unregistered Vendors database (fallback)
    const unregVendor = await UnregisteredVendor.findOne({
      phone: formattedPhone,
    });

    if (unregVendor) {
      let preferredName = unregVendor.name || '';
      if (currentUserId && Array.isArray(unregVendor.addedByUsers)) {
        const userEntry = unregVendor.addedByUsers.find(
          (u) => u.userId && u.userId.toString() === currentUserId.toString()
        );
        if (userEntry && userEntry.nameGiven) {
          preferredName = userEntry.nameGiven;
        }
      }

      return {
        isRegistered: false,
        vendor: {
          id: unregVendor._id,
          vendorId: null,
          name: preferredName,
          phone: unregVendor.phone,
          category: 'General',
          businessName: '',
          isVerified: false,
        },
      };
    }

    // 3. New / Untracked number
    return {
      isRegistered: false,
      vendor: {
        id: null,
        vendorId: null,
        name: '',
        phone: formattedPhone,
        category: 'General',
        businessName: '',
        isVerified: false,
      },
    };
  }

  /**
   * Record or update vendor when creating a laundry order
   * Uses separate collections:
   * - Registered vendors updated in 'Vendor' collection
   * - Unregistered contact-based vendors stored in 'UnregisteredVendor' collection
   */
  async recordOrderVendor({ phone, name, userId }) {
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Invalid phone number format');
    }

    const trimmedName = name ? String(name).trim() : '';

    // 1. Check if vendor is already registered in Vendor collection
    let regVendor = await Vendor.findOne({ phone: formattedPhone });
    if (regVendor) {
      regVendor.totalOrdersHandled = (regVendor.totalOrdersHandled || 0) + 1;
      await regVendor.save();
      return {
        isRegistered: true,
        vendor: regVendor,
      };
    }

    // 2. Unregistered vendor stored in UnregisteredVendor collection
    let unreg = await UnregisteredVendor.findOne({ phone: formattedPhone });
    if (!unreg) {
      unreg = await UnregisteredVendor.create({
        phone: formattedPhone,
        name: trimmedName,
        totalOrders: 1,
        isConvertedToRegistered: false,
        addedByUsers: userId
          ? [
              {
                userId,
                nameGiven: trimmedName,
                addedAt: new Date(),
              },
            ]
          : [],
      });
    } else {
      unreg.totalOrders = (unreg.totalOrders || 0) + 1;
      if (!unreg.name && trimmedName) {
        unreg.name = trimmedName;
      }
      if (userId && Array.isArray(unreg.addedByUsers)) {
        const exists = unreg.addedByUsers.some(
          (u) => u.userId && u.userId.toString() === userId.toString()
        );
        if (!exists) {
          unreg.addedByUsers.push({
            userId,
            nameGiven: trimmedName,
            addedAt: new Date(),
          });
        }
      }
      await unreg.save();
    }

    return {
      isRegistered: false,
      vendor: unreg,
    };
  }

  /**
   * Sync hook called on user login / signup:
   * Checks if an unregistered vendor exists with this user's phone.
   * If found, sets isRegistered: true and updates existing Work Orders.
   */
  async syncUnregisteredToRegistered(user) {
    if (!user || !user.phone) return null;

    const formattedPhone = formatPhoneNumber(user.phone);

    // Check in unified Vendor table
    let vendor = await Vendor.findOne({ phone: formattedPhone });

    // Check if there are unregistered records for this phone
    const unreg = await UnregisteredVendor.findOne({
      phone: formattedPhone,
      isConvertedToRegistered: false,
    });

    if (!unreg && vendor && vendor.isRegistered) {
      return { converted: false, vendor };
    }

    if (unreg || (vendor && !vendor.isRegistered)) {
      if (!vendor) {
        const vendorName = user.name || unreg?.name || 'Laundry Vendor';
        const VendorCategory = require('../admin/vendorCategory/vendorCategory.model');
        const defaultCat = await VendorCategory.findOne({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
        const catName = defaultCat?.name || 'General';
        const catCode = defaultCat?.code || 'GENERAL';
        vendor = await Vendor.create({
          name: vendorName,
          phone: formattedPhone,
          category: catName,
          categoryCode: catCode,
          isRegistered: true,
          userId: user._id || user.id,
          status: 'ACTIVE',
          totalOrdersHandled: unreg?.totalOrders || 0,
        });
      } else {
        vendor.isRegistered = true;
        vendor.userId = user._id || user.id;
        if (user.name) vendor.name = user.name;
        await vendor.save();
      }

      if (unreg) {
        unreg.isConvertedToRegistered = true;
        unreg.convertedVendorId = vendor._id;
        unreg.convertedAt = new Date();
        await unreg.save();
      }

      // Update past orders linked to this vendor phone
      const Order = require('../order/order.model');
      if (Order) {
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

      // Dispatch FCM Push Notification to newly activated vendor
      try {
        const notificationService = require('../notification/notification.service');
        notificationService
          .sendToUser(user._id || user.id, {
            title: 'Vendor Hub Activated 🧺',
            body: `Your phone number has been linked to your laundry vendor profile "${vendor.name}". Past work orders are now in your dashboard!`,
            data: {
              type: 'VENDOR_ACTIVATED',
              vendorId: vendor._id.toString(),
            },
            type: 'VENDOR_ACTIVATED',
          })
          .catch((err) => console.warn('[FCM Vendor Sync Warning]:', err.message));
      } catch (fcmErr) {
        console.warn('[FCM Vendor Sync Warning]:', fcmErr.message);
      }

      return { converted: true, vendor };
    }

    return null;
  }

  /**
   * Fetch all laundry work orders assigned to this vendor
   * (Matched by either vendorId OR vendorPhone)
   */
  async getVendorOrders(vendor, query = {}) {
    if (!vendor) {
      throw new ApiError(401, 'Vendor authentication required');
    }

    const { status, page = 1, limit = 20, search, category, orderCategory } = query;
    const Order = require('../order/order.model');
    const formattedPhone = formatPhoneNumber(vendor.phone);

    const filter = {
      $or: [
        { vendorId: vendor._id },
        { vendorPhone: formattedPhone },
      ],
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
          $or: [
            { orderNumber: searchRegex },
            { userName: searchRegex },
            { userPhone: searchRegex },
          ],
        },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalCount] = await Promise.all([
      LaundryOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      LaundryOrder.countDocuments(filter),
    ]);

    return {
      orders,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum),
      },
    };
  }

  /**
   * Get single work order details by ID for vendor
   */
  async getVendorOrderById(vendor, orderId) {
    if (!vendor) {
      throw new ApiError(401, 'Vendor authentication required');
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'Invalid Order ID format');
    }

    const Order = require('../order/order.model');
    const formattedPhone = formatPhoneNumber(vendor.phone);

    const order = await Order.findOne({
      _id: orderId,
      $or: [
        { vendorId: vendor._id },
        { vendorPhone: formattedPhone },
      ],
    }).populate('items.wardrobeItemId', 'name category images attributes');

    if (!order) {
      throw new ApiError(404, 'Work order not found or not assigned to this vendor');
    }

    return order;
  }

  /**
   * Update order status by vendor (self-service PATCH)
   */
  async updateVendorOrderStatus(vendor, orderId, { status, note }) {
    if (!vendor) {
      throw new ApiError(401, 'Vendor authentication required');
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'Invalid Order ID format');
    }

    // Strict Business Rule: Vendors can REJECT orders, but CANNOT CANCEL
    if (status === 'CANCELLED') {
      throw new ApiError(
        400,
        'Vendors cannot cancel orders. Please use REJECTED if you wish to decline this order.'
      );
    }

    const validStatuses = [
      'PENDING_PICKUP',
      'PICKED_UP',
      'IN_PROCESS',
      'READY_FOR_DELIVERY',
      'DELIVERED',
      'REJECTED',
    ];

    if (!status || !validStatuses.includes(status)) {
      throw new ApiError(
        400,
        `Invalid status. Allowed values are: ${validStatuses.join(', ')}`
      );
    }

    const Order = require('../order/order.model');
    const formattedPhone = formatPhoneNumber(vendor.phone);

    const order = await Order.findOne({
      _id: orderId,
      $or: [
        { vendorId: vendor._id },
        { vendorPhone: formattedPhone },
      ],
    });

    if (!order) {
      throw new ApiError(404, 'Work order not found or not assigned to this vendor');
    }

    // Validation for REJECTED: cannot reject already finalized orders
    if (status === 'REJECTED') {
      if (order.status === 'DELIVERED') {
        throw new ApiError(400, 'Cannot reject an order that has already been delivered');
      }
      if (order.status === 'CANCELLED') {
        throw new ApiError(400, 'Cannot reject an order that was cancelled by customer');
      }
      if (order.status === 'REJECTED') {
        throw new ApiError(400, 'Order is already marked as rejected');
      }
    }

    const previousStatus = order.status;
    order.status = status;
    order.statusHistory.push({
      status,
      changedBy: 'VENDOR',
      changedAt: new Date(),
      note: note
        ? String(note).trim()
        : status === 'REJECTED'
        ? `Order rejected by vendor ${vendor.name}`
        : `Status changed to ${status} by vendor ${vendor.name}`,
    });

    // If marked as DELIVERED and wasn't before, update vendor totalOrdersHandled
    if (status === 'DELIVERED' && previousStatus !== 'DELIVERED') {
      try {
        const VendorModel = require('./registeredVendor.model');
        await VendorModel.findByIdAndUpdate(vendor._id, {
          $inc: { totalOrdersHandled: 1 },
        });
      } catch (incErr) {
        console.warn('[Vendor Order Count Inc Warning]:', incErr.message);
      }
    }

    await order.save();

    // Sync wardrobe items status: DELIVERED/REJECTED => ACTIVE, in-progress => INACTIVE
    const WardrobeItem = require('../wardrobe/wardrobeItem.model');
    const itemIds = (order.items || []).map((it) => it.wardrobeItemId).filter(Boolean);
    if (itemIds.length > 0) {
      if (status === 'DELIVERED' || status === 'REJECTED') {
        await WardrobeItem.updateMany(
          { _id: { $in: itemIds } },
          { $set: { status: 'ACTIVE' } }
        );
      } else if (
        ['PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY'].includes(status)
      ) {
        await WardrobeItem.updateMany(
          { _id: { $in: itemIds } },
          { $set: { status: 'INACTIVE' } }
        );
      }
    }

    // Dispatch FCM status notification to the customer
    try {
      const notificationService = require('../notification/notification.service');
      const statusLabels = {
        PENDING_PICKUP: 'Awaiting Pickup',
        PICKED_UP: 'Clothes Picked Up by Vendor',
        IN_PROCESS: 'Processing (Washing / Dry Cleaning)',
        READY_FOR_DELIVERY: 'Ready for Delivery',
        DELIVERED: 'Delivered',
        REJECTED: 'Rejected by Vendor',
      };
      const label = statusLabels[status] || status;
      const title =
        status === 'REJECTED'
          ? `Order #${order.orderNumber} Rejected`
          : `Laundry Order Update #${order.orderNumber}`;
      const body =
        status === 'REJECTED'
          ? `Vendor ${vendor.name} has rejected your work order.${note ? ` Reason: ${note}` : ''}`
          : `Vendor ${vendor.name} updated your work order to: ${label}.`;

      await notificationService
        .sendToUser(order.userId, {
          title,
          body,
          data: {
            type: 'LAUNDRY_ORDER_STATUS',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            status,
          },
          type: 'LAUNDRY_ORDER_STATUS',
        })
        .catch((err) => console.warn('[FCM Status Notification Warning]:', err.message));
    } catch (fcmErr) {
      console.warn('[FCM Dispatch Notice]:', fcmErr.message);
    }

    return order;
  }

  /**
   * Find vendors in a category that offer ALL required services
   * @param {Object} query { category, requiredServices: string[] }
   */
  async getEligibleVendors({ category, requiredServices = [] } = {}) {
    if (!category) {
      throw new ApiError(400, 'Category is required to find eligible vendors');
    }

    const catRegex = new RegExp(`^${String(category).trim()}$`, 'i');
    const filter = {
      status: 'ACTIVE',
      isRegistered: true,
      $or: [
        { category: catRegex },
        { primaryCategory: catRegex },
        { categories: catRegex },
      ],
    };

    const reqList = Array.isArray(requiredServices)
      ? requiredServices.map((s) => String(s).trim()).filter(Boolean)
      : String(requiredServices)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    if (reqList.length > 0) {
      // Vendor must offer ALL required services
      filter.offeredServices = {
        $all: reqList.map((s) => new RegExp(`^${s}$`, 'i')),
      };
    }

    const vendors = await Vendor.find(filter)
      .select('name phone vendorId businessName category primaryCategory categories services offeredServices rating isVerified address')
      .lean();

    return vendors;
  }

  /**
   * Get offered services for a specific vendor
   */
  async getVendorServices(vendorId) {
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      throw new ApiError(400, 'Valid Vendor ID is required');
    }

    const vendor = await Vendor.findById(vendorId).select('name phone businessName category primaryCategory categories services offeredServices isRegistered');
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    return {
      vendorId: vendor._id,
      vendorName: vendor.name,
      businessName: vendor.businessName || '',
      category: vendor.primaryCategory || vendor.category,
      services: (vendor.services || []).filter((s) => s.isOffered !== false),
      offeredServices: vendor.offeredServices || [],
    };
  }
}

module.exports = new VendorService();
