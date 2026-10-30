const mongoose = require('mongoose');
const KitchenBoxCapture = require('../../../hardware/kitchenBoxCaptures/kitchenBoxCapture.model');
const KitchenBox = require('../../../hardware/kitchenBox/kitchenBox.model');
const Hub = require('../../../hardware/hub/hub.model');
const ApiError = require('../../../../utils/apiError');

class KitchenBoxCaptureService {
  /**
   * Helper: Resolve KitchenBox by ObjectId or MAC address
   */
  async resolveKitchenBox(identifier) {
    if (!identifier) return null;
    const str = String(identifier).trim();

    if (mongoose.Types.ObjectId.isValid(str)) {
      const box = await KitchenBox.findById(str);
      if (box) return box;
    }

    const boxByMac = await KitchenBox.findOne({ mac_id: str.toUpperCase() });
    if (boxByMac) return boxByMac;

    throw new ApiError(404, `KitchenBox not found for identifier: ${identifier}`);
  }

  /**
   * Helper: Resolve Hub by ObjectId or MAC address
   */
  async resolveHub(identifier) {
    if (!identifier) return null;
    const str = String(identifier).trim();

    if (mongoose.Types.ObjectId.isValid(str)) {
      const hub = await Hub.findById(str);
      if (hub) return hub;
    }

    const hubByMac = await Hub.findOne({ mac_id: str.toUpperCase() });
    if (hubByMac) return hubByMac;

    throw new ApiError(404, `Hub not found for identifier: ${identifier}`);
  }

  /**
   * Overview statistics for admin dashboard
   */
  async getStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalCaptures,
      last24hCaptures,
      withImage,
      withTof,
      activeBoxes,
    ] = await Promise.all([
      KitchenBoxCapture.countDocuments(),
      KitchenBoxCapture.countDocuments({ createdAt: { $gte: last24h } }),
      KitchenBoxCapture.countDocuments({ image: { $ne: null } }),
      KitchenBoxCapture.countDocuments({ tof: { $ne: null } }),
      KitchenBoxCapture.distinct('kitchenBoxId'),
    ]);

    return {
      total: totalCaptures,
      last24h: last24hCaptures,
      withImage,
      withTof,
      activeContainersCount: activeBoxes.length,
    };
  }

  /**
   * List all captures with logs, filtering & pagination
   */
  async getCaptures(params = {}) {
    const {
      kitchenBoxId,
      hubId,
      startDate,
      endDate,
      hasImage,
      hasTof,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const query = {};

    if (kitchenBoxId) {
      if (mongoose.Types.ObjectId.isValid(kitchenBoxId)) {
        query.kitchenBoxId = kitchenBoxId;
      } else {
        const box = await KitchenBox.findOne({ mac_id: String(kitchenBoxId).trim().toUpperCase() });
        if (box) query.kitchenBoxId = box._id;
      }
    }

    if (hubId) {
      if (mongoose.Types.ObjectId.isValid(hubId)) {
        query.hubId = hubId;
      } else {
        const hub = await Hub.findOne({ mac_id: String(hubId).trim().toUpperCase() });
        if (hub) query.hubId = hub._id;
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (hasImage === 'true' || hasImage === true) {
      query.image = { $ne: null };
    }

    if (hasTof === 'true' || hasTof === true) {
      query.tof = { $ne: null };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [captures, total] = await Promise.all([
      KitchenBoxCapture.find(query)
        .populate('kitchenBoxId', 'name mac_id item_name dimensions status')
        .populate('hubId', 'name mac_id status')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      KitchenBoxCapture.countDocuments(query),
    ]);

    return {
      captures,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get single capture by ID
   */
  async getCaptureById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid capture ID format');
    }

    const capture = await KitchenBoxCapture.findById(id)
      .populate('kitchenBoxId', 'name mac_id item_name dimensions status userId')
      .populate('hubId', 'name mac_id status wifi.ssid')
      .lean();

    if (!capture) {
      throw new ApiError(404, 'KitchenBox capture not found');
    }

    return capture;
  }

  /**
   * Get time-series log history for a specific KitchenBox
   */
  async getCapturesByBoxId(kitchenBoxId, query = {}) {
    const box = await this.resolveKitchenBox(kitchenBoxId);
    return this.getCaptures({ ...query, kitchenBoxId: box._id });
  }

  /**
   * Get latest snapshot for a specific KitchenBox
   */
  async getLatestCaptureByBoxId(kitchenBoxId) {
    const box = await this.resolveKitchenBox(kitchenBoxId);
    const latest = await KitchenBoxCapture.findOne({ kitchenBoxId: box._id })
      .populate('kitchenBoxId', 'name mac_id item_name dimensions status')
      .populate('hubId', 'name mac_id status')
      .sort({ createdAt: -1 })
      .lean();

    if (!latest) {
      throw new ApiError(404, `No capture snapshots found for container: ${box.name}`);
    }

    return latest;
  }

  /**
   * Get all captures under a specific Hub
   */
  async getCapturesByHubId(hubId, query = {}) {
    const hub = await this.resolveHub(hubId);
    return this.getCaptures({ ...query, hubId: hub._id });
  }

  /**
   * Delete a capture record
   */
  async deleteCapture(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid capture ID format');
    }

    const capture = await KitchenBoxCapture.findByIdAndDelete(id);
    if (!capture) {
      throw new ApiError(404, 'KitchenBox capture not found');
    }

    return {
      id: capture._id,
      message: 'KitchenBox capture deleted successfully by Admin',
    };
  }
}

module.exports = new KitchenBoxCaptureService();

