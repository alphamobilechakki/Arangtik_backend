const mongoose = require('mongoose');
const Order = require('../order.model');
const vendorService = require('../../vendor/vendor.service');
const laundryPdfService = require('./laundryPdf.service');
const laundryWhatsappService = require('./laundryWhatsapp.service');
const WardrobeItem = require('../../wardrobe/wardrobeItem.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');
const { formatPhoneNumber } = require('../../../utils/whatsapp.service');

class LaundryOrderService {
  /**
   * Create a new Laundry Work Order
   */
  async createWorkOrder(userId, payload) {
    const {
      vendorPhone,
      vendorName,
      pickupDate,
      expectedDeliveryDate,
      items,
      itemIds,
      specialInstructions,
    } = payload;

    // 1. Validate User
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User account not found');
    }

    // 2. Validate Vendor Details
    if (!vendorPhone) {
      throw new ApiError(400, 'Vendor phone number is required');
    }
    const formattedVendorPhone = formatPhoneNumber(vendorPhone);
    if (!formattedVendorPhone || formattedVendorPhone.length < 10) {
      throw new ApiError(400, 'Invalid vendor phone number');
    }

    // 3. Validate Dates
    if (!pickupDate) {
      throw new ApiError(400, 'Pickup date is required');
    }
    if (!expectedDeliveryDate) {
      throw new ApiError(400, 'Expected delivery date is required');
    }

    const pDate = new Date(pickupDate);
    const dDate = new Date(expectedDeliveryDate);

    if (isNaN(pDate.getTime()) || isNaN(dDate.getTime())) {
      throw new ApiError(400, 'Invalid date format provided');
    }

    if (dDate < pDate) {
      throw new ApiError(400, 'Expected delivery date cannot be before pickup date');
    }

    // 4. Validate and Snapshot Garments
    let itemsToProcess = [];
    if (Array.isArray(items) && items.length > 0) {
      itemsToProcess = items;
    } else if (Array.isArray(itemIds) && itemIds.length > 0) {
      itemsToProcess = itemIds.map((id) => ({ wardrobeItemId: id }));
    } else {
      throw new ApiError(400, 'At least one dress must be selected for laundry');
    }

    const processedItems = [];
    for (const rawItem of itemsToProcess) {
      const wId = rawItem.wardrobeItemId || rawItem.id || rawItem._id;
      if (!wId || !mongoose.Types.ObjectId.isValid(wId)) {
        throw new ApiError(400, `Invalid wardrobe item ID: ${wId}`);
      }

      // Fetch wardrobe item to ensure ownership and get verified metadata
      const wardrobeItem = await WardrobeItem.findOne({
        _id: wId,
        userId: user._id,
      });

      if (!wardrobeItem) {
        throw new ApiError(
          404,
          `Wardrobe garment not found or does not belong to user (ID: ${wId})`
        );
      }

      // Garment already in laundry check: Cannot send inactive dresses to laundry again
      if (wardrobeItem.status === 'INACTIVE') {
        throw new ApiError(
          400,
          `Garment "${wardrobeItem.name}" is already in laundry (status: Inactive) and cannot be sent again until returned.`
        );
      }

      // Pick best primary image
      let primaryImg = wardrobeItem.sourcePhotoUrl || '';
      if (Array.isArray(wardrobeItem.images) && wardrobeItem.images.length > 0) {
        const found =
          wardrobeItem.images.find((img) => img.isPrimary) || wardrobeItem.images[0];
        if (found && (found.thumbnailUrl || found.url)) {
          primaryImg = found.thumbnailUrl || found.url;
        }
      }

      // Resolve color strictly from WardrobeItem in database
      let resolvedColor = wardrobeItem.color || '';
      if (!resolvedColor && wardrobeItem.attributes) {
        resolvedColor = (typeof wardrobeItem.attributes.get === 'function'
          ? wardrobeItem.attributes.get('primaryColor') || wardrobeItem.attributes.get('color')
          : wardrobeItem.attributes.primaryColor || wardrobeItem.attributes.color) || '';
      }

      // Resolve fabric strictly from WardrobeItem in database
      let resolvedFabric = wardrobeItem.fabric || '';
      if (!resolvedFabric && wardrobeItem.attributes) {
        resolvedFabric = (typeof wardrobeItem.attributes.get === 'function'
          ? wardrobeItem.attributes.get('fabric')
          : wardrobeItem.attributes.fabric) || '';
      }

      processedItems.push({
        wardrobeItemId: wardrobeItem._id,
        name: wardrobeItem.name, // Strictly from database
        category: wardrobeItem.category || '', // Strictly from database
        subCategory: wardrobeItem.subCategory || '', // Strictly from database
        color: resolvedColor, // Strictly from database
        fabric: resolvedFabric, // Strictly from database
        brand: wardrobeItem.brand || '', // Strictly from database
        imageUrl: primaryImg, // Strictly from database
        serviceType: rawItem.serviceType || 'WASH_AND_IRON',
        specialInstructions: rawItem.specialInstructions || rawItem.notes || '',
      });
    }

    // 5. Check & Record Vendor
    const vendorRecord = await vendorService.recordOrderVendor({
      phone: formattedVendorPhone,
      name: vendorName || '',
      userId: user._id,
    });

    const resolvedVendorName =
      (vendorRecord.isRegistered
        ? vendorRecord.vendor.name
        : vendorName || vendorRecord.vendor.name) || 'Laundry Vendor';

    // Explicit orderCategory: Laundry work orders are explicitly 'Dhobi'
    const orderCategory =
      (payload.orderCategory && String(payload.orderCategory).trim()) ||
      (payload.category && String(payload.category).trim()) ||
      'Dhobi';

    // 6. Create Initial Work Order directly in universal 'orders' collection
    const order = new Order({
      userId: user._id,
      userName: user.name || 'Arangtik User',
      userPhone: user.phone,
      orderCategory,
      orderType: 'LAUNDRY_WORK_ORDER',
      vendorId: vendorRecord.isRegistered ? vendorRecord.vendor._id : null,
      vendorPhone: formattedVendorPhone,
      vendorName: resolvedVendorName,
      isRegisteredVendor: vendorRecord.isRegistered,
      pickupDate: pDate,
      expectedDeliveryDate: dDate,
      specialInstructions: specialInstructions ? String(specialInstructions).trim() : '',
      items: processedItems,
      totalItems: processedItems.length,
      status: 'PENDING_PICKUP',
      statusHistory: [
        {
          status: 'PENDING_PICKUP',
          changedBy: 'USER',
          changedAt: new Date(),
          note: 'Work Order created',
        },
      ],
    });

    await order.save();

    // 6.1. Mark wardrobe garments as INACTIVE (sent to laundry)
    const wardrobeItemIds = processedItems.map((it) => it.wardrobeItemId);
    if (wardrobeItemIds.length > 0) {
      await WardrobeItem.updateMany(
        { _id: { $in: wardrobeItemIds }, userId: user._id },
        { $set: { status: 'INACTIVE' } }
      );
    }

    // 7. Generate PDF Work Order
    try {
      const pdfResult = await laundryPdfService.generateWorkOrderPdf(order);
      order.pdfUrl = pdfResult.fileUrl;
      order.pdfPath = pdfResult.filePath;
      await order.save();
    } catch (pdfErr) {
      console.error('[Laundry PDF Generation Error]:', pdfErr);
      // Non-fatal, order is created
    }

    // 8. Dispatch WhatsApp Template with PDF to Vendor via API24
    if (order.pdfUrl) {
      try {
        const waResult = await laundryWhatsappService.sendWorkOrderToVendor(
          order,
          order.pdfUrl
        );

        order.whatsappNotification = {
          sent: waResult.sent,
          sentAt: waResult.sent ? new Date() : null,
          messageId: waResult.messageId || null,
          templateUsed: waResult.templateUsed || null,
          status: waResult.sent ? 'DELIVERED_TO_GATEWAY' : 'FAILED',
          error: waResult.error || null,
        };
        await order.save();
      } catch (waErr) {
        console.error('[Laundry WhatsApp Dispatch Error]:', waErr);
        order.whatsappNotification = {
          sent: false,
          sentAt: null,
          status: 'FAILED',
          error: waErr.message,
        };
        await order.save();
      }
    }

    // 9. Dispatch FCM Push Notifications
    try {
      const notificationService = require('../../notification/notification.service');

      // A. Notify Customer
      await notificationService
        .sendToUser(user._id, {
          title: `Laundry Work Order Placed #${order.orderNumber}`,
          body: `Your work order for ${order.totalItems} garment(s) has been sent to ${order.vendorName}.`,
          data: {
            type: 'LAUNDRY_ORDER_NEW',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            vendorName: order.vendorName,
            totalItems: String(order.totalItems),
          },
          type: 'LAUNDRY_ORDER_NEW',
        })
        .catch((err) => console.warn('[FCM Customer Order Notification Warning]:', err.message));

      // B. If vendor has an active user account in Arangtik, notify the vendor
      const VendorModel = require('../../vendor/registeredVendor.model');
      let vendorUserTargetId = null;
      if (order.vendorId) {
        const vDoc = await VendorModel.findById(order.vendorId).select('userId');
        if (vDoc && vDoc.userId) vendorUserTargetId = vDoc.userId;
      }
      if (!vendorUserTargetId) {
        const vUser = await User.findOne({ phone: order.vendorPhone }).select('_id');
        if (vUser) vendorUserTargetId = vUser._id;
      }

      if (vendorUserTargetId && String(vendorUserTargetId) !== String(user._id)) {
        await notificationService
          .sendToUser(vendorUserTargetId, {
            title: `New Laundry Work Order #${order.orderNumber}`,
            body: `${order.userName} requested laundry service for ${order.totalItems} garment(s).`,
            data: {
              type: 'LAUNDRY_ORDER_NEW',
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              customerName: order.userName,
              totalItems: String(order.totalItems),
            },
            type: 'LAUNDRY_ORDER_NEW',
          })
          .catch((err) => console.warn('[FCM Vendor Order Notification Warning]:', err.message));
      }
    } catch (fcmErr) {
      console.warn('[FCM Dispatch Notice]:', fcmErr.message);
    }

    return order;
  }

  /**
   * Get user's laundry work orders with filtering & pagination
   */
  async getUserOrders(userId, query = {}) {
    const { status, page = 1, limit = 20, vendorPhone } = query;

    const filter = { userId, orderCategory: 'Dhobi' };
    if (status) {
      filter.status = status;
    }
    if (vendorPhone) {
      filter.vendorPhone = formatPhoneNumber(vendorPhone);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
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
   * Get single work order details by ID
   */
  async getOrderById(userId, orderId) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'Invalid Order ID format');
    }

    const order = await Order.findOne({
      _id: orderId,
      userId,
    }).populate('items.wardrobeItemId', 'name category images attributes');

    if (!order) {
      throw new ApiError(404, 'Laundry Work Order not found');
    }

    return order;
  }

  /**
   * Update Work Order Status (User self-service per Requirement 9 & 10)
   */
  async updateOrderStatus(userId, orderId, { status, note }) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'Invalid Order ID format');
    }

    // Strict Business Rule: Customers can CANCEL orders, but CANNOT REJECT
    if (status === 'REJECTED') {
      throw new ApiError(
        400,
        'Customers cannot reject orders. Please use CANCELLED if you wish to cancel this order.'
      );
    }

    const validStatuses = [
      'PENDING_PICKUP',
      'PICKED_UP',
      'IN_PROCESS',
      'READY_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ];

    if (!status || !validStatuses.includes(status)) {
      throw new ApiError(
        400,
        `Invalid status. Allowed values are: ${validStatuses.join(', ')}`
      );
    }

    const order = await Order.findOne({
      _id: orderId,
      userId,
    });

    if (!order) {
      throw new ApiError(404, 'Laundry Work Order not found');
    }

    // Validation for CANCELLED: cannot cancel already finalized or rejected orders
    if (status === 'CANCELLED') {
      if (order.status === 'DELIVERED') {
        throw new ApiError(400, 'Cannot cancel an order that has already been delivered');
      }
      if (order.status === 'REJECTED') {
        throw new ApiError(400, 'This order was already rejected by the vendor');
      }
      if (order.status === 'CANCELLED') {
        throw new ApiError(400, 'Order is already marked as cancelled');
      }
    }

    order.status = status;
    order.statusHistory.push({
      status,
      changedBy: 'USER',
      changedAt: new Date(),
      note: note
        ? String(note).trim()
        : status === 'CANCELLED'
        ? 'Order cancelled by customer'
        : `Status changed to ${status}`,
    });

    await order.save();

    // Sync wardrobe items status: DELIVERED/CANCELLED => ACTIVE, in-progress => INACTIVE
    const itemIds = (order.items || []).map((it) => it.wardrobeItemId).filter(Boolean);
    if (itemIds.length > 0) {
      if (status === 'DELIVERED' || status === 'CANCELLED') {
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

    // Dispatch FCM status update notification to customer
    try {
      const notificationService = require('../../notification/notification.service');
      const statusLabels = {
        PENDING_PICKUP: 'Awaiting Pickup',
        PICKED_UP: 'Clothes Picked Up by Vendor',
        IN_PROCESS: 'Processing (Washing / Dry Cleaning)',
        READY_FOR_DELIVERY: 'Ready for Delivery',
        DELIVERED: 'Delivered',
        CANCELLED: 'Cancelled',
      };
      const label = statusLabels[status] || status;

      await notificationService
        .sendToUser(order.userId, {
          title: `Laundry Order Update #${order.orderNumber}`,
          body: `Your work order is now: ${label}.`,
          data: {
            type: 'LAUNDRY_ORDER_STATUS',
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            status,
          },
          type: 'LAUNDRY_ORDER_STATUS',
        })
        .catch((err) => console.warn('[FCM Status Notification Warning]:', err.message));

      // If user cancelled, notify vendor if vendor has an active account
      if (status === 'CANCELLED') {
        const VendorModel = require('../../vendor/registeredVendor.model');
        let vendorUserTargetId = null;
        if (order.vendorId) {
          const vDoc = await VendorModel.findById(order.vendorId).select('userId');
          if (vDoc && vDoc.userId) vendorUserTargetId = vDoc.userId;
        }
        if (!vendorUserTargetId) {
          const vUser = await User.findOne({ phone: order.vendorPhone }).select('_id');
          if (vUser) vendorUserTargetId = vUser._id;
        }

        if (vendorUserTargetId) {
          await notificationService
            .sendToUser(vendorUserTargetId, {
              title: `Order #${order.orderNumber} Cancelled`,
              body: `Customer ${order.userName} has cancelled their work order.${note ? ` Reason: ${note}` : ''}`,
              data: {
                type: 'LAUNDRY_ORDER_STATUS',
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                status: 'CANCELLED',
              },
              type: 'LAUNDRY_ORDER_STATUS',
            })
            .catch((err) => console.warn('[FCM Vendor Cancel Notification Warning]:', err.message));
        }
      }
    } catch (fcmErr) {
      console.warn('[FCM Dispatch Notice]:', fcmErr.message);
    }

    return order;
  }

  /**
   * Re-send WhatsApp PDF to Vendor
   */
  async resendWhatsApp(userId, orderId) {
    const order = await this.getOrderById(userId, orderId);

    // If PDF is not yet generated, regenerate
    if (!order.pdfUrl) {
      const pdfResult = await laundryPdfService.generateWorkOrderPdf(order);
      order.pdfUrl = pdfResult.fileUrl;
      order.pdfPath = pdfResult.filePath;
      await order.save();
    }

    const waResult = await laundryWhatsappService.sendWorkOrderToVendor(
      order,
      order.pdfUrl
    );

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
      orderId: order._id,
      whatsappNotification: order.whatsappNotification,
    };
  }
}

module.exports = new LaundryOrderService();
