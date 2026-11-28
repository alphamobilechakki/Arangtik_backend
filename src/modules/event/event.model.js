const mongoose = require("mongoose");

// Event Attachments
const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      // required: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["IMAGE", "DOCUMENT"],
      required: true,
    },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    // Event Owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Event Title
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // Event Type
    eventTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventType",
      required: true,
      index: true,
    },

    // Event Type Snapshot
    eventTypeCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },

    // Event Date & Time
    eventDate: {
      type: Date,
      // required: true,
      index: true,
    },

    eventTime: {
      type: String,
      default: null,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    // Event Groups / Clusters
    clusterIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FCCluster",
      },
    ],

    // Event Venue / Address text description
    address: {
      type: String,
      trim: true,
      default: "",
    },

    // GeoJSON Point: [longitude, latitude]
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },

    // Primary Event Cover Image
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // Event Images, Invitations, Tickets, Documents
    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    // Dress Code
    dressCode: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    // Event Notes
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    // AI Outfit Suggestions
    aiSuggestionsEnabled: {
      type: Boolean,
      default: true,
    },

    // Event Status
    status: {
      type: String,
      enum: ["PLANNED", "COMPLETED", "CANCELLED"],
      default: "PLANNED",
      index: true,
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// User Event Timeline
eventSchema.index({
  userId: 1,
  isDeleted: 1,
  eventDate: 1,
});

// Cluster Event Timeline
eventSchema.index({
  clusterIds: 1,
  isDeleted: 1,
  eventDate: 1,
});

// GeoJSON Location Index
eventSchema.index({
  location: "2dsphere",
});

module.exports =
  mongoose.models.Event ||
  mongoose.model("Event", eventSchema);
