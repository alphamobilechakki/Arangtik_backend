const mongoose = require('mongoose');
const Hub = require('../../hardware/hub/hub.model');
const KitchenBox = require('../../hardware/kitchenBox/kitchenBox.model');
const ApiError = require('../../../utils/apiError');

/**
 * Fetch list of hubs with pagination, search, and status filtering
 */
const getAllHubs = async ({
  page = 1,
  limit = 20,
  search = '',
  status,
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

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    filter.userId = userId;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: searchRegex },
      { mac_id: searchRegex },
      { 'wifi.ssid': searchRegex },
    ];
  }

  const sortOrder = order === 'asc' ? 1 : -1;
  const sortOptions = { [sortBy]: sortOrder };

  const [hubs, totalHubs] = await Promise.all([
    Hub.find(filter)
      .populate('userId', '_id name phone role accountType')
      .sort(sortOptions)
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Hub.countDocuments(filter),
  ]);

  // Attach paired boxes count for each hub
  const hubMacs = hubs.map((h) => h.mac_id);
  const boxCounts = await KitchenBox.aggregate([
    { $match: { hub_mac_id: { $in: hubMacs } } },
    { $group: { _id: '$hub_mac_id', count: { $sum: 1 } } },
  ]);
  const boxCountMap = {};
  boxCounts.forEach((b) => {
    boxCountMap[b._id] = b.count;
  });

  const enrichedHubs = hubs.map((hub) => ({
    ...hub,
    pairedBoxesCount: boxCountMap[hub.mac_id] || 0,
  }));

  return {
    hubs: enrichedHubs,
    pagination: {
      total: totalHubs,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(totalHubs / parsedLimit),
    },
  };
};

/**
 * Fetch single hub details by MongoDB _id or MAC ID
 */
const getHubById = async (identifier) => {
  if (!identifier || !String(identifier).trim()) {
    throw new ApiError(400, 'Hub ID or MAC address is required');
  }

  const trimmed = String(identifier).trim();
  const query = {};

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    query._id = trimmed;
  } else {
    query.mac_id = trimmed.toUpperCase();
  }

  const hub = await Hub.findOne(query)
    .populate('userId', '_id name phone role accountType country')
    .lean();

  if (!hub) {
    throw new ApiError(404, 'Hub not found with given ID or MAC address');
  }

  // Fetch all paired kitchen boxes for this hub
  const pairedBoxes = await KitchenBox.find({ hub_mac_id: hub.mac_id }).lean();

  return {
    ...hub,
    pairedBoxes,
    pairedBoxesCount: pairedBoxes.length,
  };
};

module.exports = {
  getAllHubs,
  getHubById,
};

