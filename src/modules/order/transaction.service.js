const mongoose = require('mongoose');
const Transaction = require('./transaction.model');
const Order = require('./order.model');
const ApiError = require('../../utils/apiError');
const { formatPhoneNumber } = require('../../utils/whatsapp.service');

class TransactionService {
  /**
   * Synchronize or create a Transaction record for an Order
   * @param {Object} order - Mongoose Order document or plain object
   * @param {Object} options - { status, updatedBy, note }
   */
  async syncOrderTransaction(order, options = {}) {
    if (!order || !order._id) {
      throw new ApiError(400, 'Valid order is required to synchronize transaction');
    }

    const targetStatus = options.status || order.payment?.status || 'UNPAID';
    const totalAmount = Number(order.totalAmount || order.subtotal || 0);
    const isPartial = ['PARTIALLY_DELIVERED', 'PARTIALLY_DONE'].includes(order.status);
    const totalItems = Number(order.totalItems || order.items?.length || 0);

    let deliveredItemsCount = Number(order.deliveredItemsCount || 0);
    if (!deliveredItemsCount && Array.isArray(order.items)) {
      deliveredItemsCount = order.items.filter((it) => it.status === 'DELIVERED').length;
      if (order.status === 'DELIVERED') deliveredItemsCount = order.items.length;
    }

    let deliveredAmount = Number(order.deliveredAmount || 0);
    if (!deliveredAmount && Array.isArray(order.items)) {
      deliveredAmount = order.items
        .filter((it) => it.status === 'DELIVERED')
        .reduce((sum, it) => sum + (it.price || 0), 0);
      if (order.status === 'DELIVERED') deliveredAmount = totalAmount;
    }

    // For partially delivered orders, amount reflects delivered amount (or total if none calculated)
    const amount = isPartial && deliveredAmount > 0 ? deliveredAmount : totalAmount;
    const updatedBy = options.updatedBy || order.payment?.updatedBy || 'SYSTEM';
    const note = options.note !== undefined ? options.note : (order.payment?.note || '');

    let transaction = await Transaction.findOne({ orderId: order._id });

    if (transaction) {
      transaction.amount = amount;
      transaction.totalAmount = totalAmount;
      transaction.deliveredAmount = deliveredAmount;
      transaction.deliveredItemsCount = deliveredItemsCount;
      transaction.totalItems = totalItems;
      transaction.orderStatus = order.status;
      transaction.status = targetStatus;
      transaction.updatedBy = updatedBy;
      if (note) transaction.note = note;
      if (targetStatus === 'PAID') {
        transaction.paidAt = transaction.paidAt || new Date();
      } else if (targetStatus === 'UNPAID') {
        transaction.paidAt = null;
      }
      if (order.vendorPhone) transaction.vendorPhone = order.vendorPhone;
      if (order.vendorName) transaction.vendorName = order.vendorName;
      if (order.vendorId) transaction.vendorId = order.vendorId;

      await transaction.save();
    } else {
      transaction = await Transaction.create({
        orderId: order._id,
        orderNumber: order.orderNumber,
        vendorId: order.vendorId || null,
        vendorPhone: order.vendorPhone,
        vendorName: order.vendorName || '',
        userId: order.userId,
        userName: order.userName || '',
        userPhone: order.userPhone || '',
        orderCategory: order.orderCategory || 'General',
        amount,
        totalAmount,
        deliveredAmount,
        deliveredItemsCount,
        totalItems,
        orderStatus: order.status,
        status: targetStatus,
        updatedBy,
        note,
        paidAt: targetStatus === 'PAID' ? new Date() : null,
      });
    }

    return transaction;
  }

  /**
   * Update payment status of an Order (from User, Vendor, or Admin)
   */
  async updateOrderPaymentStatus({ orderId, status, actorType, actorId, note }) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'Invalid Order ID format');
    }

    const upperStatus = String(status || '').trim().toUpperCase();
    if (!['PAID', 'UNPAID'].includes(upperStatus)) {
      throw new ApiError(400, "Invalid payment status. Allowed values are 'PAID' or 'UNPAID'");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // Role-based ownership check
    if (actorType === 'VENDOR') {
      const formattedPhone = formatPhoneNumber(actorId?.phone || actorId);
      const isVendorMatch =
        (order.vendorId && String(order.vendorId) === String(actorId?._id || actorId)) ||
        (order.vendorPhone && order.vendorPhone === formattedPhone);

      if (!isVendorMatch) {
        throw new ApiError(403, 'Unauthorized: This order is not assigned to your vendor account');
      }
    } else if (actorType === 'USER') {
      if (String(order.userId) !== String(actorId)) {
        throw new ApiError(403, 'Unauthorized: You can only update payment status for your own orders');
      }
    }

    // Business Rule 1: Order must be DELIVERED or PARTIALLY_DELIVERED before payment status can be changed
    const payableStatuses = ['DELIVERED', 'PARTIALLY_DELIVERED', 'PARTIALLY_DONE'];
    if (!payableStatuses.includes(order.status)) {
      throw new ApiError(
        400,
        `Payment status cannot be updated because the order is not yet DELIVERED or PARTIALLY_DELIVERED (current order status: ${order.status})`
      );
    }

    // Business Rule 2: Once payment status is marked as PAID, it is final and cannot be modified again
    if (order.payment?.status === 'PAID') {
      throw new ApiError(
        400,
        'Payment has already been marked as PAID and cannot be changed again'
      );
    }

    // Update order payment structure (strictly PAID or UNPAID)
    if (!order.payment) {
      order.payment = {};
    }

    order.payment.status = upperStatus;
    order.payment.updatedBy = actorType;

    if (upperStatus === 'PAID') {
      order.payment.paidAt = new Date();
    } else {
      order.payment.paidAt = null;
    }

    const statusNote = note
      ? String(note).trim()
      : `Payment status marked as ${upperStatus} by ${actorType.toLowerCase()}`;

    order.statusHistory.push({
      status: order.status,
      changedBy: actorType,
      changedAt: new Date(),
      note: statusNote,
    });

    await order.save();

    // Synchronize to transactions collection
    const transaction = await this.syncOrderTransaction(order, {
      status: upperStatus,
      updatedBy: actorType,
      note: statusNote,
    });

    // Asynchronously regenerate work order PDF with updated payment details
    try {
      const laundryPdfService = require('./laundry/laundryPdf.service');
      const pdfResult = await laundryPdfService.generateWorkOrderPdf(order);
      order.pdfUrl = pdfResult.fileUrl;
      order.pdfPath = pdfResult.filePath;
      await order.save();
    } catch (pdfErr) {
      console.warn('[PDF Regeneration Notice]:', pdfErr.message);
    }

    return {
      order,
      transaction,
    };
  }

  /**
   * Retrieve vendor transactions with metrics, filtering, and pagination
   */
  async getVendorTransactions(vendor, query = {}) {
    if (!vendor?.phone) {
      throw new ApiError(400, 'Vendor information is required');
    }

    const formattedPhone = formatPhoneNumber(vendor.phone);
    const vendorConditions = [{ vendorPhone: formattedPhone }];
    if (vendor._id) {
      vendorConditions.push({ vendorId: vendor._id });
    }

    const filter = {
      $or: vendorConditions,
    };

    const { status, search, startDate, endDate, page = 1, limit = 20 } = query;

    if (status && String(status).toUpperCase() !== 'ALL') {
      filter.status = String(status).toUpperCase();
    }

    if (search && String(search).trim()) {
      const searchRegex = new RegExp(
        String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { orderNumber: searchRegex },
          { transactionNumber: searchRegex },
          { userName: searchRegex },
          { userPhone: searchRegex },
        ],
      });
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = eDate;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Concurrently fetch transactions, totalCount, and financial aggregations
    const [transactions, totalCount, statsAgg] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('orderId', 'orderNumber status items pickupDate expectedDeliveryDate totalItems')
        .lean(),
      Transaction.countDocuments(filter),
      Transaction.aggregate([
        {
          $match: {
            $or: vendorConditions,
          },
        },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            paidCount: {
              $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, 1, 0] },
            },
            paidAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$amount', 0] },
            },
            unpaidCount: {
              $sum: { $cond: [{ $eq: ['$status', 'UNPAID'] }, 1, 0] },
            },
            unpaidAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'UNPAID'] }, '$amount', 0] },
            },
          },
        },
      ]),
    ]);

    const stats = statsAgg[0] || {
      totalCount: 0,
      totalAmount: 0,
      paidCount: 0,
      paidAmount: 0,
      unpaidCount: 0,
      unpaidAmount: 0,
    };

    return {
      transactions,
      stats: {
        totalTransactions: stats.totalCount,
        totalAmount: stats.totalAmount,
        paidCount: stats.paidCount,
        paidAmount: stats.paidAmount,
        unpaidCount: stats.unpaidCount,
        unpaidAmount: stats.unpaidAmount,
      },
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum),
      },
    };
  }

  /**
   * Retrieve customer order transactions
   */
  async getUserTransactions(userId, query = {}) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid User ID format');
    }

    const filter = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    const { status, page = 1, limit = 20 } = query;
    if (status && String(status).toUpperCase() !== 'ALL') {
      filter.status = String(status).toUpperCase();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, totalCount] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('orderId', 'orderNumber status items totalItems')
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    return {
      transactions,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalCount / limitNum),
      },
    };
  }
}

module.exports = new TransactionService();
