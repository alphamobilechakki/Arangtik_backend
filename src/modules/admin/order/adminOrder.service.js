const mongoose = require('mongoose');
const Order = require('../../order/order.model');
const LaundryOrder = Order;
const RegisteredVendor = require('../../vendor/registeredVendor.model');
const WardrobeItem = require('../../wardrobe/wardrobeItem.model');
require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');

class AdminOrderService {
  /**
   * 1. Get Aggregated Order Statistics (KPIs across all categories)
   */
  async getOrderStats() {
    const [
      totalOrders,
      pendingPickup,
      pickedUp,
      inProcess,
      readyForDelivery,
      delivered,
      cancelled,
      rejected,
      garmentsAgg,
      categoryAgg,
      serviceTypeAgg,
    ] = await Promise.all([
      LaundryOrder.countDocuments(),
      LaundryOrder.countDocuments({ status: 'PENDING_PICKUP' }),
      LaundryOrder.countDocuments({ status: 'PICKED_UP' }),
      LaundryOrder.countDocuments({ status: 'IN_PROCESS' }),
      LaundryOrder.countDocuments({ status: 'READY_FOR_DELIVERY' }),
      LaundryOrder.countDocuments({ status: 'DELIVERED' }),
      LaundryOrder.countDocuments({ status: 'CANCELLED' }),
      LaundryOrder.countDocuments({ status: 'REJECTED' }),
      LaundryOrder.aggregate([
        { $group: { _id: null, totalGarments: { $sum: '$totalItems' } } },
      ]),
      LaundryOrder.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$orderCategory', 'Dhobi'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      LaundryOrder.aggregate([
        { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: { $ifNull: ['$items.serviceType', 'WASH_AND_IRON'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const activeProcessing = pickedUp + inProcess + readyForDelivery;
    const totalGarments = garmentsAgg[0]?.totalGarments || 0;

    const categoryDistribution = categoryAgg.map((c) => ({
      category: c._id,
      count: c.count,
    }));

    const serviceTypeDistribution = serviceTypeAgg.map((s) => ({
      serviceType: s._id,
      count: s.count,
    }));

    return {
      totalOrders,
      pendingPickup,
      pickedUp,
      inProcess,
      readyForDelivery,
      delivered,
      cancelled,
      rejected,
      activeProcessing,
      totalGarments,
      categoryDistribution,
      serviceTypeDistribution,
    };
  }

  /**
   * 2. Get Paginated & Filtered List of All Orders
   */
  async getAllOrders({
    page = 1,
    limit = 10,
    search = '',
    status = 'ALL',
    category = 'ALL',
    serviceType = 'ALL',
    isRegisteredVendor = 'ALL',
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const andConditions = [];

    // Status filter
    if (status && status !== 'ALL') {
      andConditions.push({ status });
    }

    // Dynamic Category filter (Automatically filters by whatever category admin creates or vendor has)
    if (category && category !== 'ALL') {
      const catTrim = category.trim();
      const catUpper = catTrim.toUpperCase();

      // Find all registered vendors with this category
      const matchingVendors = await RegisteredVendor.find({
        $or: [
          { category: new RegExp(`^${catTrim}$`, 'i') },
          { primaryCategory: new RegExp(`^${catTrim}$`, 'i') },
          { categories: new RegExp(`^${catTrim}$`, 'i') },
        ],
      })
        .select('_id phone')
        .lean();

      const vendorIds = matchingVendors.map((v) => v._id);
      const vendorPhones = matchingVendors.map((v) => v.phone).filter(Boolean);

      const orMatches = [
        { orderCategory: new RegExp(`^${catTrim}$`, 'i') },
        { vendorName: new RegExp(catTrim, 'i') },
      ];

      if (vendorIds.length > 0) {
        orMatches.push({ vendorId: { $in: vendorIds } });
      }
      if (vendorPhones.length > 0) {
        orMatches.push({ vendorPhone: { $in: vendorPhones } });
      }

      // Backward compatibility for Dhobi / Laundry
      if (catUpper === 'DHOBI' || catUpper === 'LAUNDRY') {
        orMatches.push(
          { orderCategory: /^(DHOBI|LAUNDRY)$/i },
          { orderCategory: { $exists: false } },
          { orderCategory: null },
          { orderCategory: '' },
          { vendorName: /dhobi|laundry|washerman|cleanwash/i }
        );
      }

      andConditions.push({ $or: orMatches });
    }

    // Service Type filter within order items
    if (serviceType && serviceType !== 'ALL') {
      andConditions.push({ 'items.serviceType': serviceType });
    }

    // Registered Vendor filter
    if (isRegisteredVendor !== undefined && isRegisteredVendor !== '' && isRegisteredVendor !== 'ALL') {
      andConditions.push({
        isRegisteredVendor: isRegisteredVendor === 'true' || isRegisteredVendor === true,
      });
    }

    // Date range filter
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      andConditions.push({ createdAt: dateFilter });
    }

    // Search query: orderNumber, user details, vendor details, item names
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      andConditions.push({
        $or: [
          { orderNumber: regex },
          { userPhone: regex },
          { userName: regex },
          { vendorPhone: regex },
          { vendorName: regex },
          { 'items.name': regex },
        ],
      });
    }

    const filter = andConditions.length > 0 ? { $and: andConditions } : {};

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy || 'createdAt']: sortDirection };

    const [orders, totalRecords] = await Promise.all([
      LaundryOrder.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name phone email profileImage')
        .populate('vendorId', 'vendorId name phone category businessName status')
        .lean(),
      LaundryOrder.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    return {
      orders,
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
   * 3. Get Single Order Details by ID or Order Number
   */
  async getOrderById(id) {
    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id };
    } else {
      query = { orderNumber: id };
    }

    const order = await LaundryOrder.findOne(query)
      .populate('userId', 'name phone email profileImage address')
      .populate('vendorId', 'vendorId name phone category businessName status address rating')
      .lean();

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    return order;
  }

  /**
   * 4. Admin Update Order Status (Override / Advance workflow)
   */
  async updateOrderStatus(id, { status, note = '' }) {
    const validStatuses = [
      'PENDING_PICKUP',
      'PICKED_UP',
      'IN_PROCESS',
      'READY_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'REJECTED',
    ];

    if (!status || !validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    let order;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await LaundryOrder.findById(id);
    } else {
      order = await LaundryOrder.findOne({ orderNumber: id });
    }

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const previousStatus = order.status;
    order.status = status;

    order.statusHistory.push({
      status,
      changedBy: 'ADMIN',
      changedAt: new Date(),
      note: note ? String(note).trim() : `Admin status update from ${previousStatus} to ${status}`,
    });

    await order.save();

    // 1. Sync Wardrobe Items Status
    const itemIds = (order.items || []).map((it) => it.wardrobeItemId).filter(Boolean);
    if (itemIds.length > 0) {
      if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(status)) {
        await WardrobeItem.updateMany(
          { _id: { $in: itemIds } },
          { $set: { status: 'ACTIVE' } }
        );
      } else {
        await WardrobeItem.updateMany(
          { _id: { $in: itemIds } },
          { $set: { status: 'INACTIVE' } }
        );
      }
    }

    // 2. Increment vendor's totalOrdersHandled if newly DELIVERED
    if (status === 'DELIVERED' && previousStatus !== 'DELIVERED' && order.vendorId) {
      await RegisteredVendor.findByIdAndUpdate(order.vendorId, {
        $inc: { totalOrdersHandled: 1 },
      });
    }

    // 3. Dispatch FCM Push Notification to Customer
    try {
      const notificationService = require('../../notification/notification.service');
      const statusLabels = {
        PENDING_PICKUP: 'Awaiting Pickup',
        PICKED_UP: 'Clothes Picked Up by Vendor',
        IN_PROCESS: 'Processing (Washing / Dry Cleaning)',
        READY_FOR_DELIVERY: 'Ready for Delivery',
        DELIVERED: 'Delivered Successfully',
        CANCELLED: 'Cancelled by Admin',
        REJECTED: 'Rejected by Vendor/Admin',
      };
      const label = statusLabels[status] || status;

      await notificationService
        .sendToUser(order.userId, {
          title: `Order Update #${order.orderNumber}`,
          body: `Your order status is now: ${label}.`,
          data: {
            type: 'LAUNDRY_ORDER_STATUS',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            status,
          },
          type: 'LAUNDRY_ORDER_STATUS',
        })
        .catch((err) => console.warn('[FCM Order Notification Warning]:', err.message));
    } catch (fcmErr) {
      console.warn('[FCM Notification Error]:', fcmErr.message);
    }

    return order;
  }

  /**
   * 5. Resend Order WhatsApp PDF Slip to Vendor
   */
  async resendWhatsapp(id) {
    let order;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await LaundryOrder.findById(id);
    } else {
      order = await LaundryOrder.findOne({ orderNumber: id });
    }

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // Ensure PDF exists
    if (!order.pdfUrl) {
      const laundryPdfService = require('../../order/laundry/laundryPdf.service');
      const pdfResult = await laundryPdfService.generateWorkOrderPdf(order);
      order.pdfUrl = pdfResult.url;
      order.pdfPath = pdfResult.filePath;
      await order.save();
    }

    const laundryWhatsappService = require('../../order/laundry/laundryWhatsapp.service');
    const waResult = await laundryWhatsappService.sendWorkOrderToVendor(order, order.pdfUrl);

    order.whatsappNotification = {
      sent: waResult.sent,
      sentAt: waResult.sent ? new Date() : null,
      messageId: waResult.messageId || null,
      templateUsed: waResult.templateUsed || null,
      status: waResult.sent ? 'DELIVERED_TO_GATEWAY' : 'FAILED',
      error: waResult.error || null,
    };
    await order.save();

    return {
      success: waResult.sent,
      message: waResult.sent ? 'WhatsApp PDF slip re-sent successfully' : 'Failed to send WhatsApp slip',
      notification: order.whatsappNotification,
    };
  }
}

module.exports = new AdminOrderService();
