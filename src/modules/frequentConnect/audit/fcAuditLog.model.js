const mongoose = require('mongoose');

const fcAuditLogSchema = new mongoose.Schema(
  {
    eventCategory: {
      type: String,
      enum: [
        'CLUSTER',
        'MEMBER',
        'MESSAGE',
        'VOICE',
        'WALKIE_TALKIE',
        'AUTO_DELETE',
        'INVITE',
        'WIDGET',
        'WARDROBE',
        'OUTFIT',
        'LAUNDRY',
        'SYSTEM',
      ],
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'CLUSTER_CREATED',
        'CLUSTER_UPDATED',
        'CLUSTER_DELETED',
        'CLUSTER_REORDERED',
        'MEMBER_ADDED',
        'MEMBER_REMOVED',
        'MEMBER_LEFT',
        'INVITE_SENT',
        'INVITE_ACCEPTED',
        'MESSAGE_SENT',
        'MESSAGE_STATUS_UPDATED',
        'MESSAGE_SAVED',
        'MESSAGE_UNSAVED',
        'VOICE_UPLOADED',
        'VOICE_PLAYED',
        'WALKIE_FLOOR_ACQUIRED',
        'WALKIE_FLOOR_RELEASED',
        'WALKIE_TIMEOUT',
        'WALKIE_BUSY_BLOCKED',
        'AUTO_DELETE_SCHEDULED',
        'AUTO_DELETE_SCRUBBED',
        'WIDGET_ACCESSED',
        'WARDROBE_ITEM_UPDATED',
        'OUTFIT_STYLED',
        'OUTFIT_STATUS_UPDATED',
        'LAUNDRY_ORDER_DISPATCHED',
      ],
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorPhone: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ['USER', 'ADMIN', 'SYSTEM'],
      default: 'USER',
    },
    targetType: {
      type: String,
      enum: [
        'CLUSTER',
        'CONVERSATION',
        'MESSAGE',
        'USER',
        'INVITE',
        'SESSION',
        'WIDGET',
        'WARDROBE',
        'WARDROBE_ITEM',
        'OUTFIT',
        'ORDER',
      ],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCConversation',
      default: null,
      index: true,
    },
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCCluster',
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound performance indexes for admin filtering
fcAuditLogSchema.index({ createdAt: -1 });
fcAuditLogSchema.index({ eventCategory: 1, createdAt: -1 });
fcAuditLogSchema.index({ action: 1, createdAt: -1 });
fcAuditLogSchema.index({ actorId: 1, createdAt: -1 });
fcAuditLogSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('FCAuditLog', fcAuditLogSchema);
