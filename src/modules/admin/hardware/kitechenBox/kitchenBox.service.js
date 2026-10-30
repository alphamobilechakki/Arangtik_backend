const mongoose = require('mongoose');
const Hub = require('../../../hardware/hub/hub.model');
const KitchenBox = require('../../../hardware/kitchenBox/kitchenBox.model');
const User = require('../../../auth/user.model');
const ApiError = require('../../../../utils/apiError');

const MAC_REGEX = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;
const isValidMac = (mac) => MAC_REGEX.test(String(mac || '').trim());
const formatMac = (mac) => String(mac || '').trim().toUpperCase();

class KitchenBoxService {
  /**
   * Helper: Resolve user by ObjectId or Phone Number
   */
  async resolveUser(userIdentifier) {
    if (!userIdentifier) return null;
    const trimmed = String(userIdentifier).trim();

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      const user = await User.findById(trimmed);
      if (user) return user._id;
    }

    const userByPhone = await User.findOne({ phone: trimmed });
    if (userByPhone) return userByPhone._id;

    throw new ApiError(400, `No user found with identifier or phone: ${userIdentifier}`);
  }

  /**
   * KitchenBox statistics
   */
  async getStats() {
    const [
      total,
      activated,
      provisioned,
      maintenance,
      deactivated,
      withLiveTof,
    ] = await Promise.all([
      KitchenBox.countDocuments(),
      KitchenBox.countDocuments({ status: 'activated' }),
      KitchenBox.countDocuments({ status: 'provisioned' }),
      KitchenBox.countDocuments({ status: 'maintenance' }),
      KitchenBox.countDocuments({ status: 'deactivated' }),
      KitchenBox.countDocuments({ tof: { $ne: null } }),
    ]);

    return {
      total,
      activated,
      provisioned,
      maintenance,
      deactivated,
      withLiveTof,
    };
  }

  /**
   * Admin Create KitchenBox with all details
   */
  async createKitchenBox(data = {}) {
    const { name, mac_id, hub_mac_id, userId, item_name, dimensions, tof, image, status } = data;

    if (!name || !String(name).trim()) {
      throw new ApiError(400, 'KitchenBox name is required');
    }

    if (!mac_id || !isValidMac(mac_id)) {
      throw new ApiError(400, 'A valid MAC ID is required (e.g. 24:0A:C4:11:00:55)');
    }

    if (!hub_mac_id || !isValidMac(hub_mac_id)) {
      throw new ApiError(400, 'A valid parent hub_mac_id is required');
    }

    const formattedMac = formatMac(mac_id);
    const formattedHubMac = formatMac(hub_mac_id);

    // Verify parent hub exists
    const hub = await Hub.findOne({ mac_id: formattedHubMac });
    if (!hub) {
      throw new ApiError(404, `No parent Hub found with MAC ID: ${formattedHubMac}`);
    }

    // Verify box MAC uniqueness
    const existing = await KitchenBox.findOne({ mac_id: formattedMac });
    if (existing) {
      throw new ApiError(409, `KitchenBox with MAC ID ${formattedMac} already exists`);
    }

    // Resolve userId: either explicitly provided or inherit from parent Hub
    let resolvedUserId = null;
    if (userId) {
      resolvedUserId = await this.resolveUser(userId);
    } else if (hub.userId) {
      resolvedUserId = hub.userId;
    } else {
      throw new ApiError(400, 'userId is required (or parent Hub must have an assigned user)');
    }

    const allowedStatuses = ['provisioned', 'activated', 'maintenance', 'deactivated'];
    let boxStatus = 'provisioned';
    if (status && allowedStatuses.includes(status)) {
      boxStatus = status;
    }

    let parsedTof = null;
    if (tof !== undefined && tof !== null && tof !== '') {
      parsedTof = parseFloat(tof);
      if (isNaN(parsedTof)) throw new ApiError(400, 'tof must be a valid number or null');
    }

    const box = new KitchenBox({
      name: String(name).trim(),
      mac_id: formattedMac,
      hub_mac_id: formattedHubMac,
      userId: resolvedUserId,
      item_name: item_name ? String(item_name).trim() : null,
      dimensions: dimensions ? String(dimensions).trim() : null,
      tof: parsedTof,
      image: image ? String(image).trim() : null,
      status: boxStatus,
    });

    await box.save();
    return this.getKitchenBoxById(box._id);
  }

  /**
   * List all KitchenBoxes with pagination, search, status filter, and populated user/hub info
   */
  async getKitchenBoxes(params = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      hub_mac_id,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (hub_mac_id && hub_mac_id !== 'ALL') {
      query.hub_mac_id = formatMac(hub_mac_id);
    }

    if (search && search.trim()) {
      const term = search.trim();
      const searchRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      const matchedUsers = await User.find({
        $or: [{ phone: searchRegex }, { name: searchRegex }],
      }).select('_id');
      const matchedUserIds = matchedUsers.map((u) => u._id);

      query.$or = [
        { name: searchRegex },
        { mac_id: searchRegex },
        { hub_mac_id: searchRegex },
        { item_name: searchRegex },
        { userId: { $in: matchedUserIds } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [boxes, total] = await Promise.all([
      KitchenBox.find(query)
        .populate('userId', 'name phone role accountType')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      KitchenBox.countDocuments(query),
    ]);

    // Attach matching Hub names for display convenience
    const uniqueHubMacs = [...new Set(boxes.map((b) => b.hub_mac_id))];
    const hubs = await Hub.find({ mac_id: { $in: uniqueHubMacs } })
      .select('name mac_id status wifi.ssid')
      .lean();
    const hubMap = {};
    hubs.forEach((h) => {
      hubMap[h.mac_id] = h;
    });

    const enrichedBoxes = boxes.map((box) => ({
      ...box,
      hub: hubMap[box.hub_mac_id] || null,
    }));

    return {
      boxes: enrichedBoxes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get single KitchenBox by ID
   */
  async getKitchenBoxById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid KitchenBox ID format');
    }

    const box = await KitchenBox.findById(id)
      .populate('userId', 'name phone role accountType country')
      .lean();

    if (!box) {
      throw new ApiError(404, 'KitchenBox not found');
    }

    const hub = await Hub.findOne({ mac_id: box.hub_mac_id })
      .select('name mac_id status wifi.ssid')
      .lean();

    return {
      ...box,
      hub: hub || null,
    };
  }

  /**
   * Admin update KitchenBox details (Supports name, mac_id, hub_mac_id, userId, item_name, dimensions, tof, status, image)
   */
  async updateKitchenBox(id, updateData = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid KitchenBox ID format');
    }

    const box = await KitchenBox.findById(id);
    if (!box) {
      throw new ApiError(404, 'KitchenBox not found');
    }

    const { name, mac_id, hub_mac_id, userId, item_name, dimensions, tof, status, image } = updateData;

    // 1. MAC ID Change with format & uniqueness check
    if (mac_id !== undefined) {
      if (!isValidMac(mac_id)) {
        throw new ApiError(400, 'Invalid MAC ID format (e.g. 24:0A:C4:11:00:55)');
      }
      const newMac = formatMac(mac_id);
      if (newMac !== box.mac_id) {
        const existing = await KitchenBox.findOne({ mac_id: newMac, _id: { $ne: box._id } });
        if (existing) {
          throw new ApiError(409, `Another KitchenBox already exists with MAC ID: ${newMac}`);
        }
        box.mac_id = newMac;
      }
    }

    // 2. Hub MAC Re-pairing check
    if (hub_mac_id !== undefined) {
      if (!isValidMac(hub_mac_id)) {
        throw new ApiError(400, 'Invalid parent Hub MAC ID format');
      }
      const newHubMac = formatMac(hub_mac_id);
      const hub = await Hub.findOne({ mac_id: newHubMac });
      if (!hub) {
        throw new ApiError(404, `No parent Hub found with MAC ID: ${newHubMac}`);
      }
      box.hub_mac_id = newHubMac;
    }

    // 3. User update
    if (userId !== undefined) {
      box.userId = userId ? await this.resolveUser(userId) : box.userId;
    }

    // 4. Name update
    if (name !== undefined) {
      if (!String(name).trim()) throw new ApiError(400, 'Name cannot be empty');
      box.name = String(name).trim();
    }

    // 5. Item & Dimensions
    if (item_name !== undefined) box.item_name = item_name ? String(item_name).trim() : null;
    if (dimensions !== undefined) box.dimensions = dimensions ? String(dimensions).trim() : null;
    if (image !== undefined) box.image = image ? String(image).trim() : null;

    // 6. ToF Sensor Reading
    if (tof !== undefined) {
      const val = tof === null || tof === '' ? null : parseFloat(tof);
      if (val !== null && isNaN(val)) throw new ApiError(400, 'tof must be a valid number or null');
      box.tof = val;
    }

    // 7. Status update
    if (status !== undefined) {
      const allowed = ['provisioned', 'activated', 'maintenance', 'deactivated'];
      if (!allowed.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${allowed.join(', ')}`);
      }
      box.status = status;
    }

    await box.save();
    return this.getKitchenBoxById(box._id);
  }

  /**
   * Update KitchenBox status specifically
   */
  async updateKitchenBoxStatus(id, status) {
    return this.updateKitchenBox(id, { status });
  }

  /**
   * Delete KitchenBox
   */
  async deleteKitchenBox(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid KitchenBox ID format');
    }

    const box = await KitchenBox.findByIdAndDelete(id);
    if (!box) {
      throw new ApiError(404, 'KitchenBox not found');
    }

    return {
      id: box._id,
      mac_id: box.mac_id,
      message: 'KitchenBox deleted successfully by Admin',
    };
  }
}

module.exports = new KitchenBoxService();

