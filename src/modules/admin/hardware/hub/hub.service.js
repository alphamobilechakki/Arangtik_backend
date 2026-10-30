const mongoose = require('mongoose');
const Hub = require('../../../hardware/hub/hub.model');
const KitchenBox = require('../../../hardware/kitchenBox/kitchenBox.model');
const User = require('../../../auth/user.model');
const ApiError = require('../../../../utils/apiError');

const MAC_REGEX = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;
const isValidMac = (mac) => MAC_REGEX.test(String(mac || '').trim());
const formatMac = (mac) => String(mac || '').trim().toUpperCase();

class HubService {
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
   * Hub statistics
   */
  async getStats() {
    const [
      total,
      active,
      configured,
      notConfigured,
      deactivated,
    ] = await Promise.all([
      Hub.countDocuments(),
      Hub.countDocuments({ status: 'active' }),
      Hub.countDocuments({ status: 'configured' }),
      Hub.countDocuments({ status: 'not configured' }),
      Hub.countDocuments({ status: 'deactivated' }),
    ]);

    return {
      total,
      active,
      configured,
      notConfigured,
      deactivated,
    };
  }

  /**
   * Admin Create Hub with all details
   */
  async createHub(data = {}) {
    const { name, mac_id, userId, wifi, status } = data;

    if (!name || !String(name).trim()) {
      throw new ApiError(400, 'Hub name is required');
    }

    if (!mac_id || !isValidMac(mac_id)) {
      throw new ApiError(400, 'A valid MAC ID is required (e.g. AA:BB:CC:DD:EE:FF)');
    }

    const formattedMac = formatMac(mac_id);
    const existing = await Hub.findOne({ mac_id: formattedMac });
    if (existing) {
      throw new ApiError(409, `Hub with MAC ID ${formattedMac} already exists`);
    }

    let resolvedUserId = null;
    if (userId) {
      resolvedUserId = await this.resolveUser(userId);
    }

    const allowedStatuses = ['not configured', 'configured', 'active', 'deactivated'];
    let hubStatus = 'not configured';
    if (status && allowedStatuses.includes(status)) {
      hubStatus = status;
    } else if (wifi && (wifi.ssid || wifi.password)) {
      hubStatus = 'configured';
    }

    const hub = new Hub({
      name: String(name).trim(),
      mac_id: formattedMac,
      userId: resolvedUserId,
      status: hubStatus,
      wifi: {
        ssid: wifi?.ssid ? String(wifi.ssid).trim() : null,
        password: wifi?.password ? String(wifi.password).trim() : null,
      },
    });

    await hub.save();
    return Hub.findById(hub._id).populate('userId', 'name phone role accountType');
  }

  /**
   * List all Hubs with pagination, search, status filter, and populated user
   */
  async getHubs(params = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
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
        { 'wifi.ssid': searchRegex },
        { userId: { $in: matchedUserIds } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [hubs, total] = await Promise.all([
      Hub.find(query)
        .populate('userId', 'name phone role accountType')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Hub.countDocuments(query),
    ]);

    // Attach count of paired kitchen boxes for each hub
    const hubMacs = hubs.map((h) => h.mac_id);
    const boxCounts = await KitchenBox.aggregate([
      { $match: { hub_mac_id: { $in: hubMacs } } },
      { $group: { _id: '$hub_mac_id', count: { $sum: 1 } } },
    ]);
    const boxCountMap = {};
    boxCounts.forEach((b) => {
      boxCountMap[b._id] = b.count;
    });

    const enrichedHubs = hubs.map((h) => ({
      ...h,
      pairedBoxesCount: boxCountMap[h.mac_id] || 0,
    }));

    return {
      hubs: enrichedHubs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get single Hub details by ID, including paired boxes
   */
  async getHubById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Hub ID format');
    }

    const hub = await Hub.findById(id)
      .populate('userId', 'name phone role accountType country')
      .lean();

    if (!hub) {
      throw new ApiError(404, 'Hub not found');
    }

    const pairedBoxes = await KitchenBox.find({ hub_mac_id: hub.mac_id }).lean();

    return {
      ...hub,
      pairedBoxes,
      pairedBoxesCount: pairedBoxes.length,
    };
  }

  /**
   * Admin update Hub details (Supports name, mac_id, userId, status, wifi)
   * If mac_id changes, automatically cascades update to all paired KitchenBoxes
   */
  async updateHub(id, updateData = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Hub ID format');
    }

    const hub = await Hub.findById(id);
    if (!hub) {
      throw new ApiError(404, 'Hub not found');
    }

    const { name, mac_id, userId, status, wifi } = updateData;

    // 1. MAC ID Change with uniqueness & cascade check
    if (mac_id !== undefined) {
      if (!isValidMac(mac_id)) {
        throw new ApiError(400, 'Invalid MAC ID format (e.g. AA:BB:CC:DD:EE:FF)');
      }
      const newMac = formatMac(mac_id);
      const oldMac = hub.mac_id;

      if (newMac !== oldMac) {
        const existing = await Hub.findOne({ mac_id: newMac, _id: { $ne: hub._id } });
        if (existing) {
          throw new ApiError(409, `Another Hub already exists with MAC ID: ${newMac}`);
        }

        hub.mac_id = newMac;

        // Cascade update to all paired KitchenBoxes
        await KitchenBox.updateMany(
          { hub_mac_id: oldMac },
          { $set: { hub_mac_id: newMac } }
        );
      }
    }

    // 2. Name update
    if (name !== undefined) {
      if (!String(name).trim()) throw new ApiError(400, 'Hub name cannot be empty');
      hub.name = String(name).trim();
    }

    // 3. User update
    if (userId !== undefined) {
      hub.userId = userId ? await this.resolveUser(userId) : null;
    }

    // 4. Status update
    if (status !== undefined) {
      const allowed = ['not configured', 'configured', 'active', 'deactivated'];
      if (!allowed.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${allowed.join(', ')}`);
      }
      hub.status = status;
    }

    // 5. WiFi update
    if (wifi && typeof wifi === 'object') {
      if (wifi.ssid !== undefined) hub.wifi.ssid = wifi.ssid ? String(wifi.ssid).trim() : null;
      if (wifi.password !== undefined) hub.wifi.password = wifi.password ? String(wifi.password).trim() : null;
    }

    await hub.save();
    return Hub.findById(hub._id).populate('userId', 'name phone role accountType');
  }

  /**
   * Update Hub status specifically
   */
  async updateHubStatus(id, status) {
    return this.updateHub(id, { status });
  }

  /**
   * Delete Hub
   */
  async deleteHub(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Hub ID format');
    }

    const hub = await Hub.findByIdAndDelete(id);
    if (!hub) {
      throw new ApiError(404, 'Hub not found');
    }

    return {
      id: hub._id,
      mac_id: hub.mac_id,
      message: 'Hub deleted successfully by Admin',
    };
  }
}

module.exports = new HubService();

