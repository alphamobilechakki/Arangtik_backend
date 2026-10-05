/**
 * ========================================================================================
 * ARANGTIK — OUTFIT OF THE DAY (OOTD) & WEAR HISTORY LOG MODEL (FUTURE PHASE FEATURE)
 * ========================================================================================
 * 
 * PURPOSE & USE CASE:
 * This model is reserved for the upcoming "Wear History / Outfit Calendar & Diary" feature.
 * 
 * Key Capabilities for Future Implementation:
 * 1. OOTD Logging: Record complete outfit combinations worn on specific dates.
 * 2. Event & Occasion Tagging: Tag wear events (e.g., Wedding, Office, Party, Travel).
 * 3. Repetition Prevention: Alert the user if an outfit was recently worn to a similar circle or event.
 * 4. Memory & Feedback: Store event location, real-world photos, user ratings, and styling notes.
 * 
 * NOTE:
 * Currently disabled / commented out to keep the active backend lightweight and focused
 * strictly on Almari containers & dress cataloging. The active models track `wearCount`
 * and `lastWornAt` directly on `WardrobeItem`.
 * 
 * To activate in the future:
 * - Uncomment the Mongoose Schema definition and export below.
 * - Wire into `wardrobe.service.js` for log endpoints (e.g., `POST /api/wardrobe/log-wear`).
 * ========================================================================================
 */

/*
const mongoose = require('mongoose');

const WearLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'WardrobeItem',
          required: true,
        },
        name: { type: String },
        category: { type: String },
        subCategory: { type: String },
        photoUrl: { type: String },
      },
    ],
    wornDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    occasion: {
      type: String,
      enum: [
        'CASUAL',
        'OFFICE',
        'FORMAL',
        'PARTY',
        'WEDDING',
        'FESTIVE',
        'TRAVEL',
        'DATE',
        'GYM',
        'OTHER',
      ],
      default: 'CASUAL',
      index: true,
    },
    sourcePhotoUrl: { type: String },
    location: { type: String },
    notes: { type: String },
    rating: { type: Number, min: 1, max: 5 },
  },
  {
    timestamps: true,
  }
);

WearLogSchema.index({ userId: 1, wornDate: -1 });

module.exports = mongoose.model('WearLog', WearLogSchema);
*/

module.exports = null;
