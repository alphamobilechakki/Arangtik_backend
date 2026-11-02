const Hub = require('./hub.model');
const ApiError = require('../../../utils/apiError');

class HubService {
  async activateHub(data, userId) {
    const { mac_id, name, wifi, status = 'activated' } = data;

    if (!mac_id) throw new ApiError(400, 'Device MAC ID is required');
    if (!userId) throw new ApiError(400, 'User must be authenticated');

    let formattedMac = String(mac_id).trim().toUpperCase();
    if (/^[0-9A-F]{12}$/.test(formattedMac)) {
      formattedMac = formattedMac.match(/.{1,2}/g).join(':');
    }

    // 1. Find existing Hub in DB
    const hub = await Hub.findOne({ mac_id: formattedMac });
    if (!hub) {
      throw new ApiError(404, 'Hub not found with this MAC ID');
    }

    // 2. Associate with logged-in user & update details
    if (name) hub.name = String(name).trim();
    hub.userId = userId;
    if (wifi) {
      hub.wifi = {
        ssid: wifi.ssid ? String(wifi.ssid).trim() : null,
        password: wifi.password ? String(wifi.password).trim() : null,
      };
    }
    hub.status = status;

    await hub.save();
    return hub;
  }

  async deactivateHub(data, userId) {
    const { mac_id } = data;
    if (!mac_id) {
      throw new ApiError(400, 'Device MAC ID is required');
    }

    let formattedMac = String(mac_id).trim().toUpperCase();
    if (/^[0-9A-F]{12}$/.test(formattedMac)) {
      formattedMac = formattedMac.match(/.{1,2}/g).join(':');
    }

    const hub = await Hub.findOne({ mac_id: formattedMac, userId });
    if (!hub) {
      throw new ApiError(404, 'Hub not found or not assigned to this user');
    }

    hub.status = 'deactivated';
    await hub.save();
    return hub;
  }

  async getMyHubs(userId) {
    return await Hub.find({ userId }).sort({ createdAt: -1 });
  }
}

module.exports = new HubService();




