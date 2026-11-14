const ApiError = require('../../../utils/apiError');

/**
 * Validate add-members request body
 */
const validateAddMembers = (body) => {
  const { members } = body;

  if (!Array.isArray(members) || members.length === 0) {
    throw new ApiError(400, 'Members must be a non-empty array');
  }

  if (members.length > 50) {
    throw new ApiError(400, 'Cannot add more than 50 members at once');
  }

  for (const member of members) {
    if (!member.phone || typeof member.phone !== 'string') {
      throw new ApiError(400, 'Each member must have a valid phone number');
    }

    const cleaned = String(member.phone).replace(/\D/g, '');
    if (cleaned.length < 10) {
      throw new ApiError(400, `Invalid phone number: ${member.phone}`);
    }
  }
};

module.exports = {
  validateAddMembers,
};
