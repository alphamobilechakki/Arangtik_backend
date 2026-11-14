const mongoose = require('mongoose');

const savedMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCMessage',
      required: [true, 'Message ID is required'],
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCConversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

// Prevent duplicate saves per user per message
savedMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });
savedMessageSchema.index({ userId: 1, savedAt: -1 });

module.exports = mongoose.model('FCSavedMessage', savedMessageSchema);
