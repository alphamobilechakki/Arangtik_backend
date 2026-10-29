const KitchenBox = require('./kitchenBox.model');
const Hub = require('../hub/hub.model');
const ApiError = require('../../../utils/apiError');

class KitchenBoxService {
  // ─── Create / Register ─────────────────────────────────────────────────────

  async createKitchenBox(data) {
    const { name, mac_id, hub_mac_id, userId } = data;

    if (!name || !String(name).trim()) throw new ApiError(400, 'KitchenBox name is required');
    if (!mac_id || !String(mac_id).trim()) throw new ApiError(400, 'MAC ID is required');
    if (!hub_mac_id || !String(hub_mac_id).trim()) throw new ApiError(400, 'hub_mac_id is required');
    if (!userId) throw new ApiError(400, 'userId is required');

    // Verify hub exists
    const hub = await Hub.findOne({ mac_id: hub_mac_id.trim().toUpperCase() });
    if (!hub) throw new ApiError(404, `No hub found with MAC ID ${hub_mac_id}`);

    const exists = await KitchenBox.findOne({ mac_id: mac_id.trim().toUpperCase() });
    if (exists) throw new ApiError(409, `KitchenBox with MAC ID ${mac_id} already exists`);

    const box = await KitchenBox.create({
      name: String(name).trim(),
      mac_id: mac_id.trim().toUpperCase(),
      hub_mac_id: hub_mac_id.trim().toUpperCase(),
      userId,
      item_name: data.item_name ? String(data.item_name).trim() : null,
      dimensions: data.dimensions ? String(data.dimensions).trim() : null,
    });

    return box;
  }

  // ─── Get all (for a user or hub) ──────────────────────────────────────────

  async getKitchenBoxes(query = {}) {
    const { userId, hub_mac_id, status, page = 1, limit = 20 } = query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (hub_mac_id) filter.hub_mac_id = hub_mac_id.trim().toUpperCase();
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [boxes, total] = await Promise.all([
      KitchenBox.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      KitchenBox.countDocuments(filter),
    ]);

    return {
      boxes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  // ─── Get by ID ─────────────────────────────────────────────────────────────

  async getKitchenBoxById(id) {
    const box = await KitchenBox.findById(id).lean();
    if (!box) throw new ApiError(404, 'KitchenBox not found');
    return box;
  }

  // ─── Get by MAC ID ─────────────────────────────────────────────────────────

  async getKitchenBoxByMac(mac_id) {
    const box = await KitchenBox.findOne({ mac_id: mac_id.trim().toUpperCase() }).lean();
    if (!box) throw new ApiError(404, 'KitchenBox not found');
    return box;
  }

  // ─── Update general info ───────────────────────────────────────────────────

  async updateKitchenBox(id, data) {
    const box = await KitchenBox.findById(id);
    if (!box) throw new ApiError(404, 'KitchenBox not found');

    if (data.name !== undefined) {
      if (!String(data.name).trim()) throw new ApiError(400, 'Name cannot be empty');
      box.name = String(data.name).trim();
    }
    if (data.item_name !== undefined) box.item_name = data.item_name ? String(data.item_name).trim() : null;
    if (data.dimensions !== undefined) box.dimensions = data.dimensions ? String(data.dimensions).trim() : null;
    if (data.image !== undefined) box.image = data.image || null;

    await box.save();
    return box;
  }

  // ─── Update ToF reading (called by hub device) ─────────────────────────────

  async updateTof(id, tof) {
    const value = parseFloat(tof);
    if (isNaN(value)) throw new ApiError(400, 'tof must be a valid number (distance in mm)');

    const box = await KitchenBox.findById(id);
    if (!box) throw new ApiError(404, 'KitchenBox not found');

    box.tof = value;
    await box.save();
    return box;
  }

  // ─── Update status ─────────────────────────────────────────────────────────

  async updateStatus(id, status) {
    const allowed = ['provisioned', 'activated', 'maintenance', 'deactivated'];
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Status must be one of: ${allowed.join(', ')}`);
    }

    const box = await KitchenBox.findById(id);
    if (!box) throw new ApiError(404, 'KitchenBox not found');

    box.status = status;
    await box.save();
    return box;
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async deleteKitchenBox(id) {
    const box = await KitchenBox.findByIdAndDelete(id);
    if (!box) throw new ApiError(404, 'KitchenBox not found');
    return { message: 'KitchenBox deleted successfully' };
  }
}

module.exports = new KitchenBoxService();

