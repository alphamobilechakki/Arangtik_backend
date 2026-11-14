const ApiError = require('../../../utils/apiError');

/**
 * Validate create-cluster request body
 */
const validateCreateCluster = (body) => {
  const { name, type } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ApiError(400, 'Cluster name is required');
  }

  if (name.trim().length > 50) {
    throw new ApiError(400, 'Cluster name cannot exceed 50 characters');
  }

  const validTypes = ['FAMILY', 'FRIENDS', 'OFFICE', 'CUSTOM'];
  if (type && !validTypes.includes(String(type).toUpperCase())) {
    throw new ApiError(400, `Invalid cluster type. Must be one of: ${validTypes.join(', ')}`);
  }

  if (body.color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(body.color)) {
    throw new ApiError(400, 'Invalid hex color format (e.g. #FF5733)');
  }
};

/**
 * Validate update-cluster request body
 */
const validateUpdateCluster = (body) => {
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new ApiError(400, 'Cluster name cannot be empty');
    }
    if (body.name.trim().length > 50) {
      throw new ApiError(400, 'Cluster name cannot exceed 50 characters');
    }
  }

  if (body.color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(body.color)) {
    throw new ApiError(400, 'Invalid hex color format');
  }
};

/**
 * Validate reorder request body
 */
const validateReorder = (body) => {
  const { order } = body;

  if (!Array.isArray(order) || order.length === 0) {
    throw new ApiError(400, 'Order must be a non-empty array of { clusterId, priority }');
  }

  for (const item of order) {
    if (!item.clusterId) {
      throw new ApiError(400, 'Each order item must have a clusterId');
    }
    if (typeof item.priority !== 'number' || item.priority < 0) {
      throw new ApiError(400, 'Each order item must have a non-negative priority number');
    }
  }
};

module.exports = {
  validateCreateCluster,
  validateUpdateCluster,
  validateReorder,
};
