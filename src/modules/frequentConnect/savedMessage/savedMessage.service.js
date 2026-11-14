const SavedMessage = require('./savedMessage.model');
const Message = require('../message/message.model');
const ApiError = require('../../../utils/apiError');

class SavedMessageService {
  /**
   * Save / bookmark a message to exempt it from individual auto-delete
   */
  async saveMessage(userId, messageId, note = '') {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    const userIdStr = userId.toString();
    const isSender = message.senderId.toString() === userIdStr;

    // Check if recipient is valid
    const recipientStatus = message.recipientStatuses.find(
      (rs) => rs.userId.toString() === userIdStr
    );

    if (!isSender && !recipientStatus) {
      throw new ApiError(403, 'You do not have access to save this message');
    }

    // Check if message is already auto-deleted for this user
    if (recipientStatus && recipientStatus.isAutoDeleted) {
      throw new ApiError(400, 'Cannot save a message that has already been deleted');
    }

    // Upsert saved message
    const savedRecord = await SavedMessage.findOneAndUpdate(
      { userId, messageId },
      {
        $set: {
          conversationId: message.conversationId,
          savedAt: new Date(),
          note: note ? note.trim() : '',
        },
      },
      { upsert: true, new: true }
    );

    // Mark isSaved in recipientStatuses
    if (recipientStatus) {
      recipientStatus.isSaved = true;
      await message.save();
    }

    return savedRecord;
  }

  /**
   * Unsave / remove bookmark for a message
   */
  async unsaveMessage(userId, messageId) {
    const result = await SavedMessage.findOneAndDelete({ userId, messageId });
    if (!result) {
      throw new ApiError(404, 'Saved message not found');
    }

    // Update message's recipientStatus
    const message = await Message.findById(messageId);
    if (message) {
      const recipientStatus = message.recipientStatuses.find(
        (rs) => rs.userId.toString() === userId.toString()
      );
      if (recipientStatus) {
        recipientStatus.isSaved = false;
        await message.save();
      }
    }

    return { unsaved: true, messageId };
  }

  /**
   * List saved messages for a user with pagination
   */
  async getSavedMessages(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (query.conversationId) {
      filter.conversationId = query.conversationId;
    }

    const [savedList, total] = await Promise.all([
      SavedMessage.find(filter)
        .sort({ savedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'messageId',
          populate: { path: 'senderId', select: 'name phone profileImage' },
        })
        .populate('conversationId', 'type clusterId')
        .lean(),
      SavedMessage.countDocuments(filter),
    ]);

    return {
      savedMessages: savedList,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

module.exports = new SavedMessageService();
