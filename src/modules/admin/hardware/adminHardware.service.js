const mongoose = require('mongoose');
const Hub = require('../../hardware/hub/hub.model');
const KitchenBox = require('../../hardware/kitchenBox/kitchenBox.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');

class AdminHardwareService {
  /**
   * Aggregate high-level hardware stats for Admin Dashboard
   */
  async getHardwareStats() {
    const [
      totalHubs,
      activeHubs,
      configuredHubs,
      notConfiguredHubs,
      deactivatedHubs,
      totalBoxes,
      activatedBoxes,
      provisionedBoxes,
      maintenanceBoxes,
      deactivatedBoxes,
      boxesWithTof,
    ] = await Promise.all([
      Hub.countDocuments(),
      Hub.countDocuments({ status: 'active' }),
      Hub.countDocuments({ status: 'configured' }),
      Hub.countDocuments({ status: 'not configured' }),
      Hub.countDocuments({ status: 'deactivated' }),
      KitchenBox.countDocuments(),
      KitchenBox.countDocuments({ status: 'activated' }),
      KitchenBox.countDocuments({ status: 'provisioned' }),
      KitchenBox.countDocuments({ status: 'maintenance' }),
      KitchenBox.countDocuments({ status: 'deactivated' }),
      KitchenBox.countDocuments({ tof: { $ne: null } }),
    ]);

    return {
      hubs: {
        total: totalHubs,
        active: activeHubs,
        configured: configuredHubs,
        notConfigured: notConfiguredHubs,
        deactivated: deactivatedHubs,
      },
      boxes: {
        total: totalBoxes,
        activated: activatedBoxes,
        provisioned: provisionedBoxes,
        maintenance: maintenanceBoxes,
        deactivated: deactivatedBoxes,
        withLiveTof: boxesWithTof,
      },
    };
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

      // Also search if search matches a User's phone or name
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
   * Admin update Hub details
   */
  async updateHub(id, updateData = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Hub ID format');
    }

    const hub = await Hub.findById(id);
    if (!hub) {
      throw new ApiError(404, 'Hub not found');
    }

    const { name, status, wifi } = updateData;

    if (name !== undefined) {
      if (!String(name).trim()) throw new ApiError(400, 'Hub name cannot be empty');
      hub.name = String(name).trim();
    }

    if (status !== undefined) {
      const allowed = ['not configured', 'configured', 'active', 'deactivated'];
      if (!allowed.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${allowed.join(', ')}`);
      }
      hub.status = status;
    }

    if (wifi && typeof wifi === 'object') {
      if (wifi.ssid !== undefined) hub.wifi.ssid = wifi.ssid ? String(wifi.ssid).trim() : null;
      if (wifi.password !== undefined) hub.wifi.password = wifi.password ? String(wifi.password).trim() : null;
    }

    await hub.save();
    return hub.populate('userId', 'name phone role accountType');
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
      query.hub_mac_id = hub_mac_id.trim().toUpperCase();
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
      .select('name mac_id status')
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
   * Admin update KitchenBox details
   */
  async updateKitchenBox(id, updateData = {}) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid KitchenBox ID format');
    }

    const box = await KitchenBox.findById(id);
    if (!box) {
      throw new ApiError(404, 'KitchenBox not found');
    }

    const { name, item_name, dimensions, tof, status, image } = updateData;

    if (name !== undefined) {
      if (!String(name).trim()) throw new ApiError(400, 'Name cannot be empty');
      box.name = String(name).trim();
    }

    if (item_name !== undefined) box.item_name = item_name ? String(item_name).trim() : null;
    if (dimensions !== undefined) box.dimensions = dimensions ? String(dimensions).trim() : null;
    if (image !== undefined) box.image = image || null;

    if (tof !== undefined) {
      const val = tof === null ? null : parseFloat(tof);
      if (val !== null && isNaN(val)) throw new ApiError(400, 'tof must be a valid number or null');
      box.tof = val;
    }

    if (status !== undefined) {
      const allowed = ['provisioned', 'activated', 'maintenance', 'deactivated'];
      if (!allowed.includes(status)) {
        throw new ApiError(400, `Invalid status. Must be one of: ${allowed.join(', ')}`);
      }
      box.status = status;
    }

    await box.save();
    return box.populate('userId', 'name phone role accountType');
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

module.exports = new AdminHardwareService();

