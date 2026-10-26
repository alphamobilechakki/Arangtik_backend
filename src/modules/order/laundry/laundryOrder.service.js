const mongoose = require('mongoose');
const Order = require('../order.model');
const vendorService = require('../../vendor/washerman/vendor.service');
const laundryPdfService = require('./laundryPdf.service');
const laundryWhatsappService = require('./laundryWhatsapp.service');
const WardrobeItem = require('../../wardrobe/wardrobeItem.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');
const { formatPhoneNumber } = require('../../../utils/whatsapp.service');
const VendorCategory = require('../../admin/vendorCategory/vendorCategory.model');

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

      const rawService = rawItem.serviceName || rawItem.service || rawItem.serviceType || 'WASH_AND_IRON';
      const resolvedServiceName = rawItem.serviceName || rawItem.service || String(rawService).replace(/_/g, ' ');

      const rawPrice =
        typeof rawItem.price === 'number' && !isNaN(rawItem.price)
          ? rawItem.price
          : !isNaN(parseFloat(rawItem.price))
          ? parseFloat(rawItem.price)
          : 0;

      processedItems.push({
        wardrobeItemId: wardrobeItem._id,
        serviceId: rawItem.serviceId || null,
        serviceName: resolvedServiceName,
        serviceType: rawItem.serviceType || resolvedServiceName,
        price: Math.max(0, rawPrice),
        name: wardrobeItem.name, // Strictly from database
        category: wardrobeItem.category || '', // Strictly from database
        subCategory: wardrobeItem.subCategory || '', // Strictly from database
        color: resolvedColor, // Strictly from database
        fabric: resolvedFabric, // Strictly from database
        brand: wardrobeItem.brand || '', // Strictly from database
        imageUrl: primaryImg, // Strictly from database
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

    // Collect requested services from all items
    const requestedServices = [
      ...new Set(
        processedItems
          .map((i) => i.serviceName || i.serviceType)
          .filter(Boolean)
          .map((s) => String(s).trim())
      ),
    ];

    // If assigned vendor is registered, verify they provide ALL requested services
    if (vendorRecord.isRegistered && vendorRecord.vendor) {
      const RegisteredVendor = require('../../vendor/washerman/registeredVendor.model');
      const vendorDoc = await RegisteredVendor.findById(vendorRecord.vendor._id).lean();
      if (vendorDoc && Array.isArray(vendorDoc.offeredServices) && vendorDoc.offeredServices.length > 0) {
        const vendorOfferedLower = vendorDoc.offeredServices.map((s) => String(s).trim().toLowerCase());
        const missingServices = requestedServices.filter(
          (reqService) => !vendorOfferedLower.includes(reqService.toLowerCase())
        );

        if (missingServices.length > 0) {
          throw new ApiError(
            400,
            `Vendor "${resolvedVendorName}" does not provide the requested service(s): ${missingServices.join(
              ', '
            )}. Please select a vendor eligible for all required services.`
          );
        }
      }
    }

    // Dynamic orderCategory: uses provided category, vendor's category, or first active category
    let orderCategory =
      (payload.orderCategory && String(payload.orderCategory).trim()) ||
      (payload.category && String(payload.category).trim());

    if (!orderCategory) {
      if (vendorRecord.isRegistered && vendorRecord.vendor?.category) {
        orderCategory = vendorRecord.vendor.category;
      } else {
        const firstCat = await VendorCategory.findOne({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
        orderCategory = firstCat?.name || 'General';
      }
    }

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
      requestedServices,
      subtotal: processedItems.reduce((acc, it) => acc + (it.price || 0), 0),
      totalAmount: processedItems.reduce((acc, it) => acc + (it.price || 0), 0),
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

    // 6.2. Initialize universal order transaction
    try {
      const transactionService = require('../transaction.service');
      await transactionService.syncOrderTransaction(order, {
        status: order.payment?.status || 'UNPAID',
        updatedBy: 'USER',
        note: 'Order placed',
      });
    } catch (txnErr) {
      console.warn('[Initial Transaction Sync Warning]:', txnErr.message);
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
      const VendorModel = require('../../vendor/washerman/registeredVendor.model');
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
    const { status, page = 1, limit = 20, vendorPhone, category, orderCategory } = query;

    const filter = { userId };
    const targetCat = category || orderCategory;
    if (targetCat && targetCat !== 'ALL') {
      filter.orderCategory = new RegExp(`^${targetCat.trim()}$`, 'i');
    }
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
  async updateOrderStatus(
    userId,
    orderId,
    { status, note, paymentStatus, deliveredItemIds, deliveredCount } = {}
  ) {
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
      'PARTIALLY_DELIVERED',
      'PARTIALLY_DONE',
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

    // Handle Item Delivery Statuses
    if (status === 'DELIVERED') {
      order.status = 'DELIVERED';
      if (!order.deliveredAt) order.deliveredAt = new Date();
      if (Array.isArray(order.items)) {
        order.items.forEach((it) => {
          it.status = 'DELIVERED';
          it.deliveredAt = it.deliveredAt || new Date();
        });
      }
      order.deliveredItemsCount = order.items?.length || 0;
      order.deliveredAmount = order.totalAmount || 0;
    } else if (status === 'PARTIALLY_DELIVERED' || status === 'PARTIALLY_DONE') {
      if (Array.isArray(order.items)) {
        if (Array.isArray(deliveredItemIds) && deliveredItemIds.length > 0) {
          const idStrs = deliveredItemIds.map(String);
          order.items.forEach((it) => {
            if (idStrs.includes(String(it._id)) || idStrs.includes(String(it.wardrobeItemId))) {
              it.status = 'DELIVERED';
              it.deliveredAt = it.deliveredAt || new Date();
            }
          });
        } else if (typeof deliveredCount === 'number' && deliveredCount > 0) {
          let count = 0;
          order.items.forEach((it) => {
            if (count < deliveredCount) {
              it.status = 'DELIVERED';
              it.deliveredAt = it.deliveredAt || new Date();
              count++;
            }
          });
        } else {
          const alreadyDone = order.items.filter((it) => it.status === 'DELIVERED').length;
          if (alreadyDone === 0 && order.items.length > 0) {
            order.items[0].status = 'DELIVERED';
            order.items[0].deliveredAt = new Date();
          }
        }

        const deliveredCountNow = order.items.filter((it) => it.status === 'DELIVERED').length;
        if (deliveredCountNow === order.items.length) {
          order.status = 'DELIVERED';
          if (!order.deliveredAt) order.deliveredAt = new Date();
        } else {
          order.status = 'PARTIALLY_DELIVERED';
        }

        order.deliveredItemsCount = deliveredCountNow;
        order.deliveredAmount = order.items
          .filter((it) => it.status === 'DELIVERED')
          .reduce((sum, it) => sum + (it.price || 0), 0);
      } else {
        order.status = 'PARTIALLY_DELIVERED';
      }
    } else {
      order.status = status;
    }

    if (paymentStatus) {
      const targetOrderStatus = order.status;
      const payableStatuses = ['DELIVERED', 'PARTIALLY_DELIVERED', 'PARTIALLY_DONE'];
      if (!payableStatuses.includes(targetOrderStatus)) {
        throw new ApiError(
          400,
          `Payment status cannot be updated because the order is not yet DELIVERED or PARTIALLY_DELIVERED (current status: ${targetOrderStatus})`
        );
      }

      if (order.payment?.status === 'PAID') {
        throw new ApiError(
          400,
          'Payment has already been marked as PAID and cannot be changed again'
        );
      }

      const upperPayment = String(paymentStatus).trim().toUpperCase();
      if (['PAID', 'UNPAID'].includes(upperPayment)) {
        if (!order.payment) order.payment = {};
        order.payment.status = upperPayment;
        order.payment.updatedBy = 'USER';
        if (upperPayment === 'PAID') {
          order.payment.paidAt = new Date();
        } else {
          order.payment.paidAt = null;
        }
      }
    }

    order.statusHistory.push({
      status: order.status,
      changedBy: 'USER',
      changedAt: new Date(),
      note: note
        ? String(note).trim()
        : status === 'CANCELLED'
        ? 'Order cancelled by customer'
        : `Status changed to ${order.status}`,
    });

    await order.save();

    // Synchronize transaction record
    try {
      const transactionService = require('../transaction.service');
      await transactionService.syncOrderTransaction(order, {
        status: order.payment?.status || 'UNPAID',
        updatedBy: 'USER',
        note: note || `Order updated to ${order.status}`,
      });
    } catch (txnErr) {
      console.warn('[Transaction Sync Notice]:', txnErr.message);
    }

    // Sync wardrobe items status:
    // DELIVERED / CANCELLED => ALL ACTIVE
    // PARTIALLY_DELIVERED => delivered items ACTIVE, pending items remain INACTIVE
    // In-progress => ALL INACTIVE
    if (Array.isArray(order.items) && order.items.length > 0) {
      if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
        const allItemIds = order.items.map((it) => it.wardrobeItemId).filter(Boolean);
        if (allItemIds.length > 0) {
          await WardrobeItem.updateMany(
            { _id: { $in: allItemIds } },
            { $set: { status: 'ACTIVE' } }
          );
        }
      } else if (order.status === 'PARTIALLY_DELIVERED') {
        const activeIds = order.items
          .filter((it) => it.status === 'DELIVERED')
          .map((it) => it.wardrobeItemId)
          .filter(Boolean);
        const inactiveIds = order.items
          .filter((it) => it.status !== 'DELIVERED')
          .map((it) => it.wardrobeItemId)
          .filter(Boolean);

        if (activeIds.length > 0) {
          await WardrobeItem.updateMany(
            { _id: { $in: activeIds } },
            { $set: { status: 'ACTIVE' } }
          );
        }
        if (inactiveIds.length > 0) {
          await WardrobeItem.updateMany(
            { _id: { $in: inactiveIds } },
            { $set: { status: 'INACTIVE' } }
          );
        }
      } else if (
        ['PENDING_PICKUP', 'PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY'].includes(order.status)
      ) {
        const allItemIds = order.items.map((it) => it.wardrobeItemId).filter(Boolean);
        if (allItemIds.length > 0) {
          await WardrobeItem.updateMany(
            { _id: { $in: allItemIds } },
            { $set: { status: 'INACTIVE' } }
          );
        }
      }
    }

    // Regenerate work order PDF with up-to-date partial delivery & payment details
    try {
      const laundryPdfService = require('./laundryPdf.service');
      const pdfResult = await laundryPdfService.generateWorkOrderPdf(order);
      order.pdfUrl = pdfResult.fileUrl;
      order.pdfPath = pdfResult.filePath;
      await order.save();
    } catch (pdfErr) {
      console.warn('[PDF Regeneration Notice]:', pdfErr.message);
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
        const VendorModel = require('../../vendor/washerman/registeredVendor.model');
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
