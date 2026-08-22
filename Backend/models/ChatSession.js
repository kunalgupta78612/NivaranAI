/**
 * ChatSession — conversational memory for the Nivaran AI agent.
 *
 * Holds the transcript plus a "draft" slot-filling buffer, so the agent can
 * conduct a real interview across turns ("what is the problem?" -> "where?"
 * -> "should I file it or join your neighbour's ticket?") instead of treating
 * every message as a fresh, contextless request.
 */
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant", "tool"], required: true },
    content: { type: String, default: "" },
    toolCalls: { type: mongoose.Schema.Types.Mixed, default: null },
    toolCallId: { type: String, default: null },
    toolName: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: "Citizen", required: true, index: true },
    role: { type: String, enum: ["citizen", "department", "admin"], default: "citizen" },

    messages: { type: [messageSchema], default: [] },

    // Slot-filling buffer for an in-progress complaint
    draft: {
      text: { type: String, default: "" },
      locality: { type: String, default: "" },
      landmark: { type: String, default: "" },
      hasPhoto: { type: Boolean, default: false },
      awaiting: { type: String, default: "" }, // "location" | "confirm_file" | "join_choice" | ""
      candidateTicketId: { type: String, default: "" },
    },

    // Last ticket the conversation touched — lets the citizen say "reopen it"
    lastTicketId: { type: String, default: "" },

    language: { type: String, default: "en" },

    // Explicit citizen choice from the UI toggle ("en" | "hi"). "auto" means
    // let the civic engine detect it from what they type, turn by turn.
    preferredLanguage: { type: String, enum: ["auto", "en", "hi"], default: "auto" },
    provider: { type: String, default: "none" },
    turnCount: { type: Number, default: 0 },

    // Auto-derived from the first user message, e.g. "Transformer sparking near..."
    title: { type: String, default: "New conversation" },

    // Set true once the citizen starts a fresh chat. Past sessions are NEVER
    // deleted — they are the permanent record of what the agent did and when.
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatSessionSchema.index({ citizen: 1, archived: 1, updatedAt: -1 });

// Keep transcripts bounded — long sessions cost tokens and slow the demo.
chatSessionSchema.pre("save", function (next) {
  const MAX = 40;
  if (this.messages.length > MAX) {
    this.messages = this.messages.slice(this.messages.length - MAX);
  }
  next();
});

module.exports = mongoose.model("ChatSession", chatSessionSchema);
