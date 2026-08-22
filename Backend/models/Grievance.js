const mongoose = require("mongoose");

const grievanceSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Citizen",
      required: [true, "Citizen reference is required"],
    },
    ticketId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    text: {
      type: String,
      required: [true, "Grievance text description is required"],
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    channel: {
      type: String,
      enum: ["web", "voice", "mobile"],
      default: "web",
    },
    category: {
      type: String,
      default: "sanitation",
      trim: true,
    },
    categoryLabel: {
      type: String,
      default: "Sanitation & Waste",
      trim: true,
    },
    dept: {
      type: String,
      default: "Sanitation Department",
      trim: true,
    },
    wardId: {
      type: String,
      default: "W-12",
      trim: true,
    },
    wardName: {
      type: String,
      default: "Vijay Nagar (Ward 12)",
      trim: true,
    },
    landmark: {
      type: String,
      default: "",
      trim: true,
    },
    photo: {
      type: String,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    harmScore: {
      type: Number,
      default: 50,
    },
    status: {
      type: String,
      enum: [
        "assigned",
        "in_progress",
        "closed_unverified",
        "verified_resolved",
        "reopened",
        "escalated",
      ],
      default: "assigned",
    },
    officerName: {
      type: String,
      default: "R. K. Sharma",
    },
    slaDays: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for formatted ID mapping
grievanceSchema.virtual("id").get(function () {
  return this.ticketId;
});

grievanceSchema.set("toJSON", { virtuals: true });
grievanceSchema.set("toObject", { virtuals: true });

// Compound index for querying user grievances by date
grievanceSchema.index({ citizen: 1, createdAt: -1 });

const Grievance = mongoose.model("Grievance", grievanceSchema);

module.exports = Grievance;
