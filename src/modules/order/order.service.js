const mongoose = require('mongoose');
const Order = require('./order.model');
const WardrobeItem = require('../wardrobe/wardrobeItem.model');
const ApiError = require('../../utils/apiError');

class OrderService {
  /**
   * 1. Get All Orders for Authenticated User across ALL categories
   * (Dhobi, Kitchen, Tailor, Doodh Wala) with optional category filter
   */
  async getUserOrders(userId, query = {}) {
    const { category, orderCategory, status, page = 1, limit = 20, search } = query;

    const filter = {
      userId: new mongoose.Types.ObjectId(userId),
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
      filter.$or = [
        { orderNumber: searchRegex },
        { vendorName: searchRegex },
        { 'items.name': searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('items.wardrobeItemId', 'name category images attributes')
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
   * 2. Get Single Order Details by ID for Authenticated User
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
      throw new ApiError(404, 'Order not found');
    }

    return order;
  }

  /**
   * 3. Customer Cancel Order (Before order pickup / processing)
   */
  async cancelOrder(userId, orderId, { reason = '' } = {}) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'Invalid Order ID format');
    }

    const order = await Order.findOne({
      _id: orderId,
      userId,
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // Only allow cancellation in PENDING_PICKUP
    if (order.status !== 'PENDING_PICKUP') {
      throw new ApiError(
        400,
        `Order cannot be cancelled in '${order.status}' state. Please contact customer support.`
      );
    }

    order.status = 'CANCELLED';
    order.statusHistory.push({
      status: 'CANCELLED',
      changedBy: 'USER',
      changedAt: new Date(),
      note: reason ? `Cancelled by customer: ${reason}` : 'Cancelled by customer',
    });

    await order.save();

    // Re-activate wardrobe items if linked
    const itemIds = (order.items || []).map((it) => it.wardrobeItemId).filter(Boolean);
    if (itemIds.length > 0) {
      await WardrobeItem.updateMany(
        { _id: { $in: itemIds } },
        { $set: { status: 'ACTIVE' } }
      );
    }

    return order;
  }
}

module.exports = new OrderService();
