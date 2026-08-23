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
        "pending",
        "assigned",
        "in_progress",
        "closed_unverified",
        "verified_resolved",
        "reopened",
        "escalated",
        "rejected",
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
    // ---- Added for the Nivaran AI agent ----

    // Citizens who joined an existing ticket instead of filing a duplicate.
    // Duplicates become a democratic signal rather than noise.
    supporters: [
      {
        citizen: { type: mongoose.Schema.Types.ObjectId, ref: "Citizen" },
        joinedAt: { type: Date, default: Date.now },
        via: { type: String, default: "agent" },
      },
    ],
    supportCount: { type: Number, default: 0 },

    // How many times the citizen rejected an officer's "resolved" claim.
    reopenCount: { type: Number, default: 0 },

    // Escalation ladder: 0 = ground officer, 1 = zonal, 2 = commissioner.
    escalationLevel: { type: Number, default: 0 },

    // Computed SLA deadline so breach detection is a query, not a guess.
    slaDueAt: { type: Date, default: null },

    // Filed or modified by the AI agent — each has a ledger block.
    filedByAgent: { type: Boolean, default: false },
    auditHash: { type: String, default: null },

    // Avalanche Fuji Immutable Audit Trail & IPFS Pinning fields
    ipfsCid: { type: String, default: null },
    blockchainTxHash: { type: String, default: null },
    blockNumber: { type: Number, default: null },
    blockchainStatus: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "FAILED", "NOT_CONFIGURED"],
      default: "PENDING",
    },
    blockchainNetwork: {
      type: String,
      default: "Avalanche Fuji C-Chain (Chain 43113)",
    },

    // The plausibility-gate verdict that let this ticket through — a
    // transparent audit trail of why the agent accepted it as a genuine report.
    plausibility: {
      verdict: { type: String, default: null },
      confidence: { type: Number, default: null },
      checkedBy: { type: String, default: null },
    },

    // The 8-stage harm score breakdown, kept so the score stays explainable.
    harmBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },

    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
grievanceSchema.index({ dept: 1, createdAt: -1 });

const Grievance = mongoose.model("Grievance", grievanceSchema);

module.exports = Grievance;
