const mongoose = require('mongoose');

const walkieTalkieSessionSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCConversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    speakerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Speaker ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ENDED'],
      default: 'ACTIVE',
      uppercase: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    recordingUrl: {
      type: String,
      trim: true,
      default: '',
    },
    endReason: {
      type: String,
      enum: ['NORMAL', 'TIMEOUT', 'DISCONNECTED', 'INTERRUPTED'],
      default: 'NORMAL',
    },
  },
  { timestamps: true }
);

// Indexes
walkieTalkieSessionSchema.index({ conversationId: 1, status: 1 });

module.exports = mongoose.model('FCWalkieTalkieSession', walkieTalkieSessionSchema);
