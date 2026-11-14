const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['DIRECT', 'CLUSTER'],
      required: true,
      uppercase: true,
      index: true,
    },
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCCluster',
      default: null,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FCMessage',
      },
      content: {
        type: String,
        default: '',
      },
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      type: {
        type: String,
        enum: ['TEXT', 'VOICE', 'WALKIE_TALKIE'],
        default: 'TEXT',
      },
      sentAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('FCConversation', conversationSchema);
