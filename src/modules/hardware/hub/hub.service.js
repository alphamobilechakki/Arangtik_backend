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


}

module.exports = new HubService();

