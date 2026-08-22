/**
 * ChainEvent — tamper-evident audit ledger.
 *
 * Every consequential action (ticket filed, officer closed, citizen reopened,
 * SLA breached, AI agent acted) is appended as a block whose hash covers the
 * PREVIOUS block's hash. Change any historical row and every hash after it
 * stops matching — which /api/chain/verify detects and reports.
 *
 * This is what makes "the officer quietly edited the record" impossible to
 * do silently, and it is also what makes the AI agent itself auditable:
 * the bot writes its own actions into the same ledger it protects.
 */
const mongoose = require("mongoose");

const chainEventSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true, index: true },
    prevHash: { type: String, required: true },
    hash: { type: String, required: true, index: true },

    eventType: {
      type: String,
      required: true,
      enum: [
        "grievance_filed",
        "status_changed",
        "citizen_verified",
        "citizen_reopened",
        "escalated",
        "sla_breach",
        "agent_action",
        "support_added",
        "genesis",
      ],
    },

    ticketId: { type: String, default: null, index: true },

    // Who caused it — "citizen:<id>", "officer:<dept>", "agent:nivaran-bot", "system"
    actor: { type: String, required: true },
    actorRole: {
      type: String,
      enum: ["citizen", "department", "admin", "agent", "system"],
      default: "system",
    },

    summary: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Set true when this block was produced by the AI agent acting for a citizen.
    agentGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chainEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ChainEvent", chainEventSchema);
