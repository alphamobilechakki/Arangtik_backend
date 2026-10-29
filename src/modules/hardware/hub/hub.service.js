const Hub = require('./hub.model');
const ApiError = require('../../../utils/apiError');

class HubService {
  // ─── Create ────────────────────────────────────────────────────────────────

  async createHub(data) {
    const { name, mac_id, userId } = data;

    if (!name || !String(name).trim()) throw new ApiError(400, 'Hub name is required');
    if (!mac_id || !String(mac_id).trim()) throw new ApiError(400, 'MAC ID is required');

    const exists = await Hub.findOne({ mac_id: mac_id.trim().toUpperCase() });
    if (exists) throw new ApiError(409, `Hub with MAC ID ${mac_id} already exists`);

    const hub = await Hub.create({
      name: String(name).trim(),
      mac_id: mac_id.trim().toUpperCase(),
      userId: userId || null,
    });

    return hub;
  }

  // ─── Get all (for a user) ──────────────────────────────────────────────────

  async getHubs(query = {}) {
    const { userId, status, page = 1, limit = 20 } = query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [hubs, total] = await Promise.all([
      Hub.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Hub.countDocuments(filter),
    ]);

    return {
      hubs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  // ─── Get by ID ─────────────────────────────────────────────────────────────

  async getHubById(id) {
    const hub = await Hub.findById(id).lean();
    if (!hub) throw new ApiError(404, 'Hub not found');
    return hub;
  }

  // ─── Get by MAC ID ─────────────────────────────────────────────────────────

  async getHubByMac(mac_id) {
    const hub = await Hub.findOne({ mac_id: mac_id.trim().toUpperCase() }).lean();
    if (!hub) throw new ApiError(404, 'Hub not found');
    return hub;
  }

  // ─── Configure Wi-Fi ──────────────────────────────────────────────────────

  async configureWifi(id, { ssid, password }) {
    if (!ssid || !String(ssid).trim()) throw new ApiError(400, 'Wi-Fi SSID is required');
    if (!password || !String(password).trim()) throw new ApiError(400, 'Wi-Fi password is required');

    const hub = await Hub.findById(id);
    if (!hub) throw new ApiError(404, 'Hub not found');

    hub.wifi.ssid = String(ssid).trim();
    hub.wifi.password = String(password).trim();

    // Auto-advance status to configured
    if (hub.status === 'not configured') {
      hub.status = 'configured';
    }

    await hub.save();

    // Return hub without password
    const result = hub.toObject();
    delete result.wifi?.password;
    return result;
  }

  // ─── Update status ─────────────────────────────────────────────────────────

  async updateStatus(id, status) {
    const allowed = ['not configured', 'configured', 'active', 'deactivated'];
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Status must be one of: ${allowed.join(', ')}`);
    }

    const hub = await Hub.findById(id);
    if (!hub) throw new ApiError(404, 'Hub not found');

    hub.status = status;
    await hub.save();
    return hub;
  }

  // ─── Update (name / userId) ────────────────────────────────────────────────

  async updateHub(id, data) {
    const hub = await Hub.findById(id);
    if (!hub) throw new ApiError(404, 'Hub not found');

    if (data.name !== undefined) {
      if (!String(data.name).trim()) throw new ApiError(400, 'Hub name cannot be empty');
      hub.name = String(data.name).trim();
    }

    if (data.userId !== undefined) hub.userId = data.userId || null;

    await hub.save();
    return hub;
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async deleteHub(id) {
    const hub = await Hub.findByIdAndDelete(id);
    if (!hub) throw new ApiError(404, 'Hub not found');
    return { message: 'Hub deleted successfully' };
  }
}

module.exports = new HubService();

