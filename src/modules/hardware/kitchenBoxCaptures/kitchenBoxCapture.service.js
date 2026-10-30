const mongoose = require('mongoose');
const KitchenBoxCapture = require('./kitchenBoxCapture.model');
const KitchenBox = require('../kitchenBox/kitchenBox.model');
const Hub = require('../hub/hub.model');
const ApiError = require('../../../utils/apiError');

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
   * Create a new KitchenBox Capture snapshot
   */
  async createCapture(data = {}) {
    const { kitchenBoxId, hubId, image, tof, dimensions } = data;

    if (!kitchenBoxId) {
      throw new ApiError(400, 'kitchenBoxId is required');
    }

    // 1. Resolve KitchenBox
    const box = await this.resolveKitchenBox(kitchenBoxId);

    // 2. Resolve Hub: from hubId or fallback to box's hub_mac_id
    let resolvedHub = null;
    if (hubId) {
      resolvedHub = await this.resolveHub(hubId);
    } else if (box.hub_mac_id) {
      resolvedHub = await Hub.findOne({ mac_id: box.hub_mac_id });
    }

    if (!resolvedHub) {
      throw new ApiError(400, 'A valid hubId is required or box must be paired with an existing Hub');
    }

    // 3. Parse ToF
    let parsedTof = null;
    if (tof !== undefined && tof !== null && tof !== '') {
      parsedTof = parseFloat(tof);
      if (isNaN(parsedTof)) {
        throw new ApiError(400, 'tof must be a valid number');
      }
    }

    // 4. Create Capture
    const capture = new KitchenBoxCapture({
      kitchenBoxId: box._id,
      hubId: resolvedHub._id,
      image: image ? String(image).trim() : null,
      tof: parsedTof,
      dimensions: dimensions ? String(dimensions).trim() : box.dimensions || null,
    });

    await capture.save();

    // 5. Update latest readings on the KitchenBox container
    const boxUpdates = {};
    if (parsedTof !== null) boxUpdates.tof = parsedTof;
    if (image) boxUpdates.image = String(image).trim();
    if (dimensions) boxUpdates.dimensions = String(dimensions).trim();

    if (Object.keys(boxUpdates).length > 0) {
      await KitchenBox.findByIdAndUpdate(box._id, { $set: boxUpdates });
    }

    return KitchenBoxCapture.findById(capture._id)
      .populate('kitchenBoxId', 'name mac_id item_name dimensions status')
      .populate('hubId', 'name mac_id status');
  }

  /**
   * Get all captures with filtering and pagination
   */
  async getCaptures(params = {}) {
    const {
      kitchenBoxId,
      hubId,
      startDate,
      endDate,
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
   * Get capture by ID
   */
  async getCaptureById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid capture ID format');
    }

    const capture = await KitchenBoxCapture.findById(id)
      .populate('kitchenBoxId', 'name mac_id item_name dimensions status')
      .populate('hubId', 'name mac_id status')
      .lean();

    if (!capture) {
      throw new ApiError(404, 'KitchenBox capture not found');
    }

    return capture;
  }

  /**
   * Get captures for a specific KitchenBox (Time series history)
   */
  async getCapturesByBoxId(kitchenBoxId, query = {}) {
    const box = await this.resolveKitchenBox(kitchenBoxId);
    return this.getCaptures({ ...query, kitchenBoxId: box._id });
  }

  /**
   * Get latest capture for a specific KitchenBox
   */
  async getLatestCaptureByBoxId(kitchenBoxId) {
    const box = await this.resolveKitchenBox(kitchenBoxId);
    const latest = await KitchenBoxCapture.findOne({ kitchenBoxId: box._id })
      .populate('kitchenBoxId', 'name mac_id item_name dimensions status')
      .populate('hubId', 'name mac_id status')
      .sort({ createdAt: -1 })
      .lean();

    if (!latest) {
      throw new ApiError(404, `No capture snapshots found for KitchenBox: ${box.name}`);
    }

    return latest;
  }

  /**
   * Get captures for a specific Hub
   */
  async getCapturesByHubId(hubId, query = {}) {
    const hub = await this.resolveHub(hubId);
    return this.getCaptures({ ...query, hubId: hub._id });
  }

  /**
   * Delete a capture
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
      message: 'KitchenBox capture deleted successfully',
    };
  }
}

module.exports = new KitchenBoxCaptureService();

