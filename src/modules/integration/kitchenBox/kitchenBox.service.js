const mongoose = require('mongoose');
const KitchenBox = require('../../hardware/kitchenBox/kitchenBox.model');
const Hub = require('../../hardware/hub/hub.model');
const ApiError = require('../../../utils/apiError');

/**
 * Fetch list of kitchen boxes with pagination, search, and filtering
 */
const getAllKitchenBoxes = async ({
  page = 1,
  limit = 20,
  search = '',
  status,
  hub_mac_id,
  userId,
  sortBy = 'createdAt',
  order = 'desc',
}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const filter = {};

  if (status && status !== 'ALL') {
    filter.status = status;
  }

  if (hub_mac_id && hub_mac_id !== 'ALL') {
    filter.hub_mac_id = hub_mac_id.trim().toUpperCase();
  }

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    filter.userId = userId;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: searchRegex },
      { mac_id: searchRegex },
      { hub_mac_id: searchRegex },
      { item_name: searchRegex },
    ];
  }

  const sortOrder = order === 'asc' ? 1 : -1;
  const sortOptions = { [sortBy]: sortOrder };

  const [boxes, totalBoxes] = await Promise.all([
    KitchenBox.find(filter)
      .populate('userId', '_id name phone role accountType')
      .sort(sortOptions)
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    KitchenBox.countDocuments(filter),
  ]);

  // Attach matching parent Hub information for each box
  const uniqueHubMacs = [...new Set(boxes.map((b) => b.hub_mac_id))];
  const hubs = await Hub.find({ mac_id: { $in: uniqueHubMacs } })
    .select('_id name mac_id status wifi.ssid')
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
      total: totalBoxes,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(totalBoxes / parsedLimit),
    },
  };
};

/**
 * Fetch single kitchen box details by MongoDB _id or MAC ID
 */
const getKitchenBoxById = async (identifier) => {
  if (!identifier || !String(identifier).trim()) {
    throw new ApiError(400, 'KitchenBox ID or MAC address is required');
  }

  const trimmed = String(identifier).trim();
  const query = {};

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    query._id = trimmed;
  } else {
    query.mac_id = trimmed.toUpperCase();
  }

  const box = await KitchenBox.findOne(query)
    .populate('userId', '_id name phone role accountType country')
    .lean();

  if (!box) {
    throw new ApiError(404, 'KitchenBox not found with given ID or MAC address');
  }

  // Fetch parent hub info
  const hub = await Hub.findOne({ mac_id: box.hub_mac_id })
    .select('_id name mac_id status wifi.ssid')
    .lean();

  return {
    ...box,
    hub: hub || null,
  };
};

/**
 * Fetch all kitchen boxes paired to a specific Hub (by Hub _id or Hub MAC ID)
 */
const getKitchenBoxesByHubId = async (hubIdentifier, query = {}) => {
  if (!hubIdentifier || !String(hubIdentifier).trim()) {
    throw new ApiError(400, 'Hub ID or Hub MAC address is required');
  }

  const trimmed = String(hubIdentifier).trim();
  let targetHubMac = trimmed.toUpperCase();
  let hubDoc = null;

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    hubDoc = await Hub.findById(trimmed).select('_id name mac_id status wifi.ssid').lean();
    if (!hubDoc) {
      throw new ApiError(404, `No hub found with ID: ${trimmed}`);
    }
    targetHubMac = hubDoc.mac_id;
  } else {
    hubDoc = await Hub.findOne({ mac_id: targetHubMac })
      .select('_id name mac_id status wifi.ssid')
      .lean();
  }

  const { status, sortBy = 'createdAt', order = 'desc' } = query;
  const filter = { hub_mac_id: targetHubMac };

  if (status && status !== 'ALL') {
    filter.status = status;
  }

  const sortOrder = order === 'asc' ? 1 : -1;
  const boxes = await KitchenBox.find(filter)
    .populate('userId', '_id name phone role accountType')
    .sort({ [sortBy]: sortOrder })
    .lean();

  const enrichedBoxes = boxes.map((box) => ({
    ...box,
    hub: hubDoc || null,
  }));

  return {
    hub: hubDoc || { mac_id: targetHubMac },
    boxes: enrichedBoxes,
    total: enrichedBoxes.length,
  };
};

module.exports = {
  getAllKitchenBoxes,
  getKitchenBoxById,
  getKitchenBoxesByHubId,
};

