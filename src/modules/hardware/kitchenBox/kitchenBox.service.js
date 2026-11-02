const KitchenBox = require('./kitchenBox.model');
const Hub = require('../hub/hub.model');
const ApiError = require('../../../utils/apiError');

class KitchenBoxService {
  // ─── 1. Activate KitchenBox ──────────────────────────────────────────────────
  async activateKitchenBox(data, userId) {
    const { mac_id, name, hub_mac_id, item_name, dimensions, status = 'activated' } = data;

    if (!mac_id) throw new ApiError(400, 'Device MAC ID is required');
    if (!userId) throw new ApiError(400, 'User must be authenticated');

    let formattedMac = String(mac_id).trim().toUpperCase();
    if (/^[0-9A-F]{12}$/.test(formattedMac)) {
      formattedMac = formattedMac.match(/.{1,2}/g).join(':');
    }

    // Find existing KitchenBox in DB
    const box = await KitchenBox.findOne({ mac_id: formattedMac });
    if (!box) {
      throw new ApiError(404, 'KitchenBox not found with this MAC ID');
    }

    // If hub_mac_id provided, verify that parent hub exists
    if (hub_mac_id) {
      let formattedHubMac = String(hub_mac_id).trim().toUpperCase();
      if (/^[0-9A-F]{12}$/.test(formattedHubMac)) {
        formattedHubMac = formattedHubMac.match(/.{1,2}/g).join(':');
      }
      const hub = await Hub.findOne({ mac_id: formattedHubMac });
      if (!hub) {
        throw new ApiError(404, `No hub found with MAC ID ${hub_mac_id}`);
      }
      box.hub_mac_id = formattedHubMac;
    }

    // Associate with logged-in user & update details
    if (name) box.name = String(name).trim();
    if (item_name) box.item_name = String(item_name).trim();
    if (dimensions) box.dimensions = String(dimensions).trim();
    box.userId = userId;
    box.status = status;

    await box.save();
    return box;
  }

  // ─── 2. Deactivate KitchenBox ────────────────────────────────────────────────
  async deactivateKitchenBox(data, userId) {
    const { mac_id } = data;
    if (!mac_id) throw new ApiError(400, 'Device MAC ID is required');

    let formattedMac = String(mac_id).trim().toUpperCase();
    if (/^[0-9A-F]{12}$/.test(formattedMac)) {
      formattedMac = formattedMac.match(/.{1,2}/g).join(':');
    }

    const box = await KitchenBox.findOne({ mac_id: formattedMac, userId });
    if (!box) {
      throw new ApiError(404, 'KitchenBox not found or not assigned to this user');
    }

    box.status = 'deactivated';
    await box.save();
    return box;
  }

  // ─── 3. Get User KitchenBoxes ────────────────────────────────────────────────
  async getMyBoxes(userId) {
    if (!userId) throw new ApiError(400, 'User ID is required');
    return await KitchenBox.find({ userId }).sort({ createdAt: -1 });
  }



}

module.exports = new KitchenBoxService();

