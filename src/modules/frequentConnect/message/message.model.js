const mongoose = require('mongoose');

const recipientStatusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['SENT', 'DELIVERED', 'SEEN', 'PLAYED'],
      default: 'SENT',
      uppercase: true,
    },
    statusAt: {
      type: Date,
      default: Date.now,
    },
    seenAt: {
      type: Date,
      default: null,
    },
    playedAt: {
      type: Date,
      default: null,
    },
    isAutoDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSaved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCConversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['TEXT', 'VOICE', 'WALKIE_TALKIE'],
      default: 'TEXT',
      uppercase: true,
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    voiceUrl: {
      type: String,
      trim: true,
      default: '',
    },
    voiceDuration: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['SENT', 'DELIVERED', 'SEEN', 'PLAYED'],
      default: 'SENT',
      uppercase: true,
    },
    recipientStatuses: [recipientStatusSchema],
    isAutoDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    autoDeleteAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ 'recipientStatuses.userId': 1, 'recipientStatuses.isAutoDeleted': 1 });
messageSchema.index({ content: 'text' });

module.exports = mongoose.model('FCMessage', messageSchema);
