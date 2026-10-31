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
   * Generate QR Code for a KitchenBox MAC ID
   * Creates static PNG file in /uploads/qr_box_<cleanMac>.png and generates data URI
   * @param {string} macId
   * @param {object} req Optional Express request
   * @returns {Promise<{ mac_id: string, qrCode: string, qrCodeUrl: string }>}
   */
  async generateQrCodeForMac(macId, req = null) {
    if (!macId || !isValidMac(macId)) {
      throw new ApiError(400, 'A valid MAC ID is required to generate a QR Code');
    }

    const cleanMac = formatMac(macId);
    const safeFilename = `qr_box_${cleanMac.replace(/[^A-Z0-9]/g, '')}.png`;

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
        errorCorrectionLevel: 'H',
      }),
      QRCode.toDataURL(cleanMac, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      }),
    ]);

    try {
      fs.writeFileSync(filePath1, buffer);
      if (filePath2 !== filePath1) {
        fs.writeFileSync(filePath2, buffer);
      }
    } catch (fsErr) {
      console.warn('[KitchenBox QR Code] Failed to write QR image file to disk:', fsErr.message);
    }

    const qrCodeUrl = getImageUrl(safeFilename, req);

    return {
      mac_id: cleanMac,
      qrCode: dataUrl,
      qrCodeUrl: qrCodeUrl || dataUrl,
    };
  }

  /**
   * Get QR Code for a specific KitchenBox by ID
   * @param {string} boxId
   * @param {object} req Optional Express request
   */
  async getKitchenBoxQrCode(boxId, req = null) {
    if (!mongoose.Types.ObjectId.isValid(boxId)) {
      throw new ApiError(400, 'Invalid KitchenBox ID format');
    }

    const box = await KitchenBox.findById(boxId);
    if (!box) {
      throw new ApiError(404, 'KitchenBox not found');
    }

    const qrData = await this.generateQrCodeForMac(box.mac_id, req);

    if (!box.qr_code) {
      await KitchenBox.findByIdAndUpdate(box._id, {
        $set: { qr_code: qrData.qrCodeUrl || qrData.qrCode },
      });
    }

    return {
      boxId: box._id,
      name: box.name,
      mac_id: box.mac_id,
      status: box.status,
      qrCode: qrData.qrCode,
      qrCodeUrl: qrData.qrCodeUrl,
    };
  }

  /**
   * Bulk create multiple KitchenBoxes by MAC IDs
   * Auto-generates names, QR codes, and skips duplicates
   * @param {object|Array} payload
   * @param {object} req
   */

  async createMultipleKitchenBoxes(payload, req = null) {
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
          reason: 'Invalid MAC address format',
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

    // 3. Check existing KitchenBoxes
    const existingBoxes = await KitchenBox.find({
      mac_id: { $in: validMacs },
    }).select('mac_id').lean();

    const existingMacs = new Set(
      existingBoxes.map((box) => box.mac_id)
    );

    const newMacs = [];

    for (const mac of validMacs) {
      if (existingMacs.has(mac)) {
        skipped.push({
          mac_id: mac,
          reason: 'KitchenBox already exists',
        });
      } else {
        newMacs.push(mac);
      }
    }

    // 4. Generate QR codes and prepare documents
    const boxesToInsert = [];

    for (const mac of newMacs) {
      let qrCode = null;

      try {
        const qr = await this.generateQrCodeForMac(mac, req);
        qrCode = qr.qrCodeUrl || qr.qrCode;
      } catch (error) {
        console.warn(`QR generation failed for ${mac}:`, error.message);
      }

      boxesToInsert.push({
        mac_id: mac,
        status: 'provisioned',
        qr_code: qrCode,
      });
    }

    // 5. Bulk insert
    if (boxesToInsert.length) {
      try {
        const inserted = await KitchenBox.insertMany(boxesToInsert, {
          ordered: false,
        });

        inserted.forEach((box) => {
          created.push({
            _id: box._id,
            mac_id: box.mac_id,
            status: box.status,
            qr_code: box.qr_code,
            createdAt: box.createdAt,
          });
        });
      } catch (error) {
        if (error.insertedDocs) {
          error.insertedDocs.forEach((box) => {
            created.push({
              _id: box._id,
              mac_id: box.mac_id,
              status: box.status,
              qr_code: box.qr_code,
              createdAt: box.createdAt,
            });
          });
        }

        if (error.writeErrors) {
          error.writeErrors.forEach((writeError) => {
            failed.push({
              mac_id: writeError.getOperation()?.mac_id,
              reason: writeError.errmsg || 'Database write error',
            });
          });
        } else {
          throw error;
        }
      }
    }

    // 6. Return summary
    return {
      totalProcessed: macIds.length,
      totalCreated: created.length,
      totalSkipped: skipped.length,
      totalFailed: failed.length,
      created,
      skipped,
      failed,
    };
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
  async createKitchenBox(data = {}, req = null) {
    const { name, mac_id, hub_mac_id, userId, item_name, dimensions, tof, image, status } = data;

    if (!mac_id || !isValidMac(mac_id)) {
      throw new ApiError(400, 'A valid MAC ID is required (e.g. 24:0A:C4:11:00:55)');
    }

    const formattedMac = formatMac(mac_id);

    // Verify box MAC uniqueness
    const existing = await KitchenBox.findOne({ mac_id: formattedMac });
    if (existing) {
      throw new ApiError(409, `KitchenBox with MAC ID ${formattedMac} already exists`);
    }

    let formattedHubMac = null;
    let hub = null;
    if (hub_mac_id) {
      if (!isValidMac(hub_mac_id)) {
        throw new ApiError(400, 'A valid parent hub_mac_id is required');
      }
      formattedHubMac = formatMac(hub_mac_id);
      hub = await Hub.findOne({ mac_id: formattedHubMac });
      if (!hub) {
        throw new ApiError(404, `No parent Hub found with MAC ID: ${formattedHubMac}`);
      }
    }

    // Resolve userId: either explicitly provided or inherit from parent Hub
    let resolvedUserId = null;
    if (userId) {
      resolvedUserId = await this.resolveUser(userId);
    } else if (hub && hub.userId) {
      resolvedUserId = hub.userId;
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

    // Auto-generate QR code for KitchenBox
    let qrCode = null;
    try {
      const qrData = await this.generateQrCodeForMac(formattedMac, req);
      qrCode = qrData.qrCodeUrl || qrData.qrCode;
    } catch (qrErr) {
      console.warn(`[KitchenBox Create] QR code generation warning for ${formattedMac}:`, qrErr.message);
    }

    const box = new KitchenBox({
      name: name && String(name).trim() ? String(name).trim() : `Box ${formattedMac}`,
      mac_id: formattedMac,
      hub_mac_id: formattedHubMac,
      userId: resolvedUserId,
      item_name: item_name ? String(item_name).trim() : null,
      dimensions: dimensions ? String(dimensions).trim() : null,
      tof: parsedTof,
      image: image ? String(image).trim() : null,
      qr_code: qrCode,
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
    const uniqueHubMacs = [...new Set(boxes.map((b) => b.hub_mac_id).filter(Boolean))];
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

    const hub = box.hub_mac_id
      ? await Hub.findOne({ mac_id: box.hub_mac_id }).select('name mac_id status wifi.ssid').lean()
      : null;

    return {
      ...box,
      hub: hub || null,
    };
  }

  /**
   * Admin update KitchenBox details (Supports name, mac_id, hub_mac_id, userId, item_name, dimensions, tof, status, image)
   */
  async updateKitchenBox(id, updateData = {}, req = null) {
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

        // Auto-regenerate QR code for the new MAC
        try {
          const qrData = await this.generateQrCodeForMac(newMac, req);
          box.qr_code = qrData.qrCodeUrl || qrData.qrCode;
        } catch (qrErr) {
          console.warn(`[KitchenBox Update] QR generation warning for ${newMac}:`, qrErr.message);
        }
      }
    }

    // Generate QR code if missing
    if (!box.qr_code) {
      try {
        const qrData = await this.generateQrCodeForMac(box.mac_id, req);
        box.qr_code = qrData.qrCodeUrl || qrData.qrCode;
      } catch (qrErr) {
        console.warn(`[KitchenBox Update] QR generation warning for ${box.mac_id}:`, qrErr.message);
      }
    }

    // 2. Hub MAC Re-pairing check
    if (hub_mac_id !== undefined) {
      if (hub_mac_id === null || hub_mac_id === '') {
        box.hub_mac_id = null;
      } else {
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
    }

    // 3. User update
    if (userId !== undefined) {
      box.userId = userId ? await this.resolveUser(userId) : null;
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
