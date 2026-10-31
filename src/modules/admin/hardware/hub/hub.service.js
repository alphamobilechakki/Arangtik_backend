const mongoose = require('mongoose');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const Hub = require('../../../hardware/hub/hub.model');
const KitchenBox = require('../../../hardware/kitchenBox/kitchenBox.model');
const User = require('../../../auth/user.model');
const ApiError = require('../../../../utils/apiError');
const { getImageUrl, UPLOAD_DIR } = require('../../../../middlewares/upload.middleware');

const MAC_REGEX = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i;
const isValidMac = (mac) => MAC_REGEX.test(String(mac || '').trim());
const formatMac = (mac) => String(mac || '').trim().toUpperCase();

class HubService {
  /**
   * Generate QR Code for a Hub MAC ID
   * Creates static PNG file in /uploads/qr_<cleanMac>.png and generates data URI
   * @param {string} macId 
   * @param {object} req Optional Express request
   * @returns {Promise<{ mac_id: string, qrCode: string, qrCodeUrl: string }>}
   */
  async generateQrCodeForMac(macId, req = null) {
    if (!macId || !isValidMac(macId)) {
      throw new ApiError(400, 'A valid MAC ID is required to generate a QR Code');
    }

    const cleanMac = formatMac(macId);
    const safeFilename = `qr_${cleanMac.replace(/[^A-Z0-9]/g, '')}.png`;

    const targetDir = UPLOAD_DIR;
    const localSrcDir = path.resolve(__dirname, '../../../../../uploads');

    [targetDir, localSrcDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const filePath1 = path.join(targetDir, safeFilename);
    const filePath2 = path.join(localSrcDir, safeFilename);

    // Generate PNG buffer and Data URL with high clarity and contrast
    const [buffer, dataUrl] = await Promise.all([
      QRCode.toBuffer(cleanMac, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }),
      QRCode.toDataURL(cleanMac, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }),
    ]);

    const writePromises = [fs.promises.writeFile(filePath1, buffer)];
    if (filePath1 !== filePath2) {
      writePromises.push(fs.promises.writeFile(filePath2, buffer));
    }
    await Promise.all(writePromises);

    const fileUrl = getImageUrl(safeFilename, req);

    return {
      mac_id: cleanMac,
      qrCode: dataUrl,
      qrCodeUrl: fileUrl,
    };
  }

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
  async createHub(data = {}, req = null) {
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

    // Generate QR code for the Hub MAC ID
    let qrData = null;
    try {
      qrData = await this.generateQrCodeForMac(formattedMac, req);
    } catch (qrErr) {
      console.error('Failed to generate initial QR code for hub:', qrErr);
    }

    const hub = new Hub({
      name: String(name).trim(),
      mac_id: formattedMac,
      userId: resolvedUserId,
      status: hubStatus,
      qr_code: qrData ? qrData.qrCodeUrl || qrData.qrCode : null,
      wifi: {
        ssid: wifi?.ssid ? String(wifi.ssid).trim() : null,
        password: wifi?.password ? String(wifi.password).trim() : null,
      },
    });

    await hub.save();
    return Hub.findById(hub._id).populate('userId', 'name phone role accountType');
  }

  /**
   * Bulk create multiple hubs using just mac_ids (or objects with optional custom name)
   * Automatically validates format, deduplicates, generates QR codes, and inserts.
   *
   * @param {Array|Object} payload 
   *   - Array of strings: ['AA:BB:CC:DD:EE:01', 'AA:BB:CC:DD:EE:02']
   *   - Object with mac_ids: { mac_ids: ['...', '...'], namePrefix: 'Godown' }
   *   - Object with hubs: { hubs: [{ mac_id: '...', name: '...' }] }
   *   - Multiline string: { mac_ids: "AA:BB:CC:DD:EE:01\nAA:BB:CC:DD:EE:02" }
   * @param {object} req Optional Express request
   * @returns {Promise<object>} Summary with created, skipped, and failed lists
   */
  async createMultipleHubs(payload, req = null) {
    // 1. Extract MAC IDs
    let macIds = [];

    if (Array.isArray(payload)) {
      macIds = payload;
    } else if (Array.isArray(payload?.mac_ids)) {
      macIds = payload.mac_ids;
    } else if (typeof payload?.mac_ids === 'string') {
      macIds = payload.mac_ids.split(/[\r\n,;]+/);
    } else if (typeof payload?.mac_id === 'string') {
      macIds = [payload.mac_id];
    }

    if (!macIds.length) {
      throw new ApiError(400, 'Please provide at least one MAC ID');
    }

    const created = [];
    const skipped = [];
    const failed = [];

    // 2. Validate and normalize MAC IDs
    const uniqueMacs = new Set();
    const validMacs = [];

    for (const item of macIds) {
      const mac = String(item).trim();

      if (!mac) continue;

      if (!isValidMac(mac)) {
        failed.push({
          mac_id: mac,
          error: 'Invalid MAC address format',
        });
        continue;
      }

      const formattedMac = formatMac(mac);

      if (uniqueMacs.has(formattedMac)) {
        skipped.push({
          mac_id: formattedMac,
          reason: 'Duplicate MAC ID in request',
        });
        continue;
      }

      uniqueMacs.add(formattedMac);
      validMacs.push(formattedMac);
    }

    // 3. Check existing MAC IDs
    const existingHubs = await Hub.find({
      mac_id: { $in: validMacs },
    }).select('mac_id');

    const existingMacs = new Set(
      existingHubs.map((hub) => hub.mac_id)
    );

    const newMacs = [];

    for (const mac of validMacs) {
      if (existingMacs.has(mac)) {
        skipped.push({
          mac_id: mac,
          reason: 'Hub already registered',
        });
      } else {
        newMacs.push(mac);
      }
    }

    // 4. Create new hubs
    for (const mac of newMacs) {
      try {
        let qrCodeUrl = null;

        try {
          const qr = await this.generateQrCodeForMac(mac, req);
          qrCodeUrl = qr.qrCodeUrl || qr.qrCode;
        } catch (error) {
          console.error(`QR generation failed for ${mac}:`, error.message);
        }

        const hub = await Hub.create({
          mac_id: mac,
          status: 'not configured',
          qr_code: qrCodeUrl,
          wifi: {
            ssid: null,
            password: null,
          },
        });

        created.push({
          _id: hub._id,
          mac_id: hub.mac_id,
          status: hub.status,
          qr_code: hub.qr_code,
          createdAt: hub.createdAt,
        });
      } catch (error) {
        failed.push({
          mac_id: mac,
          error: error.message,
        });
      }
    }

    // 5. Return summary
    return {
      totalRequested: macIds.length,
      totalCreated: created.length,
      totalSkipped: skipped.length,
      totalFailed: failed.length,
      created,
      skipped,
      failed,
    };
  }

  /**
   * List all Hubs with pagination, search, status filter, and populated user
   */
  async getHubs(params = {}, req = null) {
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
      qr_code: h.qr_code || getImageUrl(`qr_${h.mac_id.replace(/[^A-Z0-9]/g, '')}.png`, req),
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
   * Get single Hub details by ID, including paired boxes and QR code
   */
  async getHubById(id, req = null) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid Hub ID format');
    }

    const hub = await Hub.findById(id)
      .populate('userId', 'name phone role accountType country');

    if (!hub) {
      throw new ApiError(404, 'Hub not found');
    }

    // Auto-generate QR code if not already saved
    if (!hub.qr_code && hub.mac_id) {
      try {
        const qrData = await this.generateQrCodeForMac(hub.mac_id, req);
        hub.qr_code = qrData.qrCodeUrl || qrData.qrCode;
        await Hub.findByIdAndUpdate(hub._id, { $set: { qr_code: hub.qr_code } });
      } catch (err) {
        console.error('Error auto-generating qr_code for hub:', err);
      }
    }

    const pairedBoxes = await KitchenBox.find({ hub_mac_id: hub.mac_id }).lean();

    return {
      ...hub.toObject(),
      pairedBoxes,
      pairedBoxesCount: pairedBoxes.length,
    };
  }

  /**
   * Get / generate QR code details for a specific Hub
   */
  async getHubQrCode(hubId, req = null) {
    if (!mongoose.Types.ObjectId.isValid(hubId)) {
      throw new ApiError(400, 'Invalid Hub ID format');
    }

    const hub = await Hub.findById(hubId);
    if (!hub) {
      throw new ApiError(404, 'Hub not found');
    }

    const qrData = await this.generateQrCodeForMac(hub.mac_id, req);

    if (!hub.qr_code) {
      await Hub.findByIdAndUpdate(hub._id, { $set: { qr_code: qrData.qrCodeUrl || qrData.qrCode } });
    }

    return {
      hubId: hub._id,
      name: hub.name,
      mac_id: hub.mac_id,
      status: hub.status,
      qrCode: qrData.qrCode,
      qrCodeUrl: qrData.qrCodeUrl,
    };
  }

  /**
   * Admin update Hub details (Supports name, mac_id, userId, status, wifi)
   * If mac_id changes, automatically cascades update to all paired KitchenBoxes
   */
  async updateHub(id, updateData = {}, req = null) {
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

        // Re-generate QR code for new MAC
        try {
          const qrData = await this.generateQrCodeForMac(newMac, req);
          hub.qr_code = qrData.qrCodeUrl || qrData.qrCode;
        } catch (err) {
          console.error('Failed to regenerate QR code for new MAC:', err);
        }

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

