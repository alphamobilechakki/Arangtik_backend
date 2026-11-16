const mongoose = require('mongoose');
const Cluster = require('../../../frequentConnect/cluster/cluster.model');
const ApiError = require('../../../../utils/apiError');

class AdminFCClusterService {
  /**
   * Paginated list of clusters with filters
   */
  async getClusters(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (query.type) {
      filter.type = query.type.toUpperCase();
    }

    if (query.search) {
      filter.name = { $regex: query.search.trim(), $options: 'i' };
    }

    if (query.creatorId) {
      filter.creatorId = query.creatorId;
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [clusters, total] = await Promise.all([
      Cluster.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('creatorId', 'name phone profileImage status')
        .lean(),
      Cluster.countDocuments(filter),
    ]);

    return {
      clusters,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get cluster details with embedded member list
   */
  async getClusterDetails(clusterId) {
    const cluster = await Cluster.findById(clusterId)
      .populate('creatorId', 'name phone profileImage status')
      .populate('members.userId', 'name phone profileImage status')
      .lean();

    if (!cluster) {
      throw new ApiError(404, 'Cluster not found');
    }

    const members = (cluster.members || []).map((m) => ({
      _id: m._id,
      userId: m.userId,
      phone: m.phone,
      displayName: m.displayName || m.userId?.name || '',
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      createdAt: m.createdAt,
    }));

    return {
      cluster,
      members,
    };
  }

  /**
   * Query members across all clusters via embedded members array
   */
  async getMembers(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const matchStage = {};
    if (query.status) matchStage['members.status'] = query.status.toUpperCase();
    if (query.role) matchStage['members.role'] = query.role.toUpperCase();
    if (query.clusterId) matchStage['_id'] = new mongoose.Types.ObjectId(query.clusterId);
    if (query.phone) matchStage['members.phone'] = { $regex: query.phone.replace(/\D/g, ''), $options: 'i' };

    const [results, totalAgg] = await Promise.all([
      Cluster.aggregate([
        { $unwind: '$members' },
        { $match: matchStage },
        {
          $lookup: {
            from: 'users',
            localField: 'members.userId',
            foreignField: '_id',
            as: 'memberUser',
          },
        },
        {
          $project: {
            _id: '$members._id',
            clusterId: { _id: '$_id', name: '$name', icon: '$icon', color: '$color', type: '$type' },
            userId: { $arrayElemAt: ['$memberUser', 0] },
            phone: '$members.phone',
            displayName: '$members.displayName',
            role: '$members.role',
            status: '$members.status',
            createdAt: '$members.createdAt',
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      Cluster.aggregate([
        { $unwind: '$members' },
        { $match: matchStage },
        { $count: 'total' },
      ]),
    ]);

    const total = totalAgg[0]?.total || 0;

    return {
      members: results,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

module.exports = new AdminFCClusterService();
