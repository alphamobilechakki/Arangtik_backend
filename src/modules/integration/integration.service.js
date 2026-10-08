const User = require('../auth/user.model');
const WardrobeItem = require('../wardrobe/wardrobeItem.model');

// Fields safe to export to authorized partner/admin (excludes face embeddings and raw secrets)
const SAFE_USER_FIELDS =
  '_id name phone role status gender accountType country currency preferredLanguage profileImage createdAt updatedAt';

/**
 * Fetch list of users with pagination, search, and filtering
 */
const getAllUsers = async ({
  page = 1,
  limit = 20,
  search = '',
  status,
  gender,
  accountType,
  sortBy = 'createdAt',
  order = 'desc',
}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (gender) {
    filter.gender = gender.toUpperCase();
  }

  if (accountType) {
    filter.accountType = accountType.toUpperCase();
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: searchRegex }, { phone: searchRegex }];
  }

  const sortOrder = order === 'asc' ? 1 : -1;
  const sortOptions = { [sortBy]: sortOrder };

  const [users, totalUsers] = await Promise.all([
    User.find(filter)
      .select(SAFE_USER_FIELDS)
      .sort(sortOptions)
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      currentPage: parsedPage,
      perPage: parsedLimit,
      totalRecords: totalUsers,
      totalPages: Math.ceil(totalUsers / parsedLimit) || 1,
      hasNextPage: skip + users.length < totalUsers,
      hasPrevPage: parsedPage > 1,
    },
  };
};

/**
 * Get single user by ID or Phone
 */
const getUserByIdOrPhone = async (identifier) => {
  let user = null;

  if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
    user = await User.findById(identifier).select(SAFE_USER_FIELDS).lean();
  }

  if (!user) {
    user = await User.findOne({ phone: identifier }).select(SAFE_USER_FIELDS).lean();
  }

  if (!user) return null;

  // Optional: include wardrobe item count
  const wardrobeItemCount = await WardrobeItem.countDocuments({
    userId: user._id,
    isArchived: { $ne: true },
  });

  return {
    ...user,
    wardrobeItemCount,
  };
};

/**
 * Get aggregated statistics for admin/integration
 */
const getUsersStats = async () => {
  const [totalUsers, activeUsers, genderStats, accountTypeStats] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.aggregate([
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $group: { _id: '$accountType', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalUsers,
    activeUsers,
    genderBreakdown: genderStats.reduce((acc, curr) => {
      acc[curr._id || 'UNSPECIFIED'] = curr.count;
      return acc;
    }, {}),
    accountTypeBreakdown: accountTypeStats.reduce((acc, curr) => {
      acc[curr._id || 'INDIVIDUAL'] = curr.count;
      return acc;
    }, {}),
  };
};

module.exports = {
  getAllUsers,
  getUserByIdOrPhone,
  getUsersStats,
};
