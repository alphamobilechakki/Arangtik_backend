const mongoose = require("mongoose");
const { formatUploadUrl } = require("../../../utils/url.util");

const densityCategorySchema = new mongoose.Schema(
  {
    materialType: {
      type: String,
      required: true,
      trim: true
    },

    defaultDensity: {
      type: Number,
      required: true,
      min: 0
    },

    densityUnit: {
      type: String,
      default: "g/ml",
      enum: ["g/ml"]
    },

    image: {
      type: String,
      default: null,
      trim: true
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Partial unique index: only enforce uniqueness for active, non-deleted records
densityCategorySchema.index(
  { materialType: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Format image URL
densityCategorySchema.pre("save", function (next) {
  if (this.image) {
    this.image = formatUploadUrl(this.image);
  }
  if (typeof next === "function") next();
});

// Automatic query middleware to exclude soft-deleted documents by default
function excludeSoftDeleted(next) {
  if (this._withDeleted) {
    if (typeof next === "function") next();
    return;
  }
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  if (typeof next === "function") next();
}

densityCategorySchema.pre("find", excludeSoftDeleted);
densityCategorySchema.pre("findOne", excludeSoftDeleted);
densityCategorySchema.pre("findOneAndUpdate", excludeSoftDeleted);
densityCategorySchema.pre("countDocuments", excludeSoftDeleted);

// Query helper to explicitly include deleted documents
densityCategorySchema.query.withDeleted = function () {
  this._withDeleted = true;
  delete this.getQuery().isDeleted;
  return this;
};

// Instance method to soft delete
densityCategorySchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Instance method to restore
densityCategorySchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  return this.save();
};

module.exports = mongoose.model(
  "DensityCategory",
  densityCategorySchema
);
