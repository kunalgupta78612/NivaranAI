/**
 * Nivaran AI — chat controller.
 * Thin HTTP layer; all the thinking lives in services/agentRuntime.js.
 *
 * Conversation history model: a citizen can have many ChatSession documents.
 * Exactly one is "current" at a time (the most recently updated, non-archived
 * one). "New chat" does not delete anything — it archives the current thread
 * and starts a fresh one, so every past conversation stays in the database
 * and is browsable later.
 */

const mongoose = require("mongoose");
const ChatSession = require("../models/ChatSession");
const Citizen = require("../models/Citizen");
const runtime = require("../services/agentRuntime");
const llm = require("../services/llm");
const chain = require("../services/chain");
const brain = require("../services/civicBrain");
const { heuristicCheck } = require("../services/plausibility");

function deriveTitle(message) {
  const clean = String(message || "").replace(/\s+/g, " ").trim();
  if (!clean) return "New conversation";
  return clean.length > 48 ? clean.slice(0, 45) + "…" : clean;
}

function isValidObjectId(id) {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

/** Find or create the citizen's current (non-archived) session. */
async function getCurrentSession(userId) {
  let session = await ChatSession.findOne({ citizen: userId, archived: false }).sort({ updatedAt: -1 });
  if (!session) {
    session = new ChatSession({ citizen: userId, role: "citizen", messages: [], draft: {} });
  }
  return session;
}

/**
 * @desc  Send a message to the Nivaran AI agent
 * @route POST /api/chat
 * @access Private (Citizen)
 */
const sendMessage = async (req, res) => {
  try {
    const { message, hasPhoto, sessionId, forceLanguage } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }
    if (String(message).length > 2000) {
      return res.status(400).json({ success: false, message: "Message too long (2000 char limit)" });
    }

    const userId = req.user.userId;
    const trimmed = String(message).trim();

    // Continue a specific past thread if the UI asked to (must belong to this citizen).
    let session = null;
    if (sessionId && isValidObjectId(sessionId)) {
      session = await ChatSession.findOne({ _id: sessionId, citizen: userId });
    }
    if (!session) session = await getCurrentSession(userId);

    // Persist an explicit language choice from the UI toggle so it survives
    // page refreshes and applies to every future turn in this conversation,
    // not just the one message that carried it.
    if (forceLanguage === "en" || forceLanguage === "hi" || forceLanguage === "auto") {
      session.preferredLanguage = forceLanguage;
    }

    let citizenName = "";
    try {
      const c = await Citizen.findById(userId).select("fullName").lean();
      citizenName = (c && c.fullName) || "";
    } catch {
      /* non-fatal */
    }

    const ctx = {
      userId,
      citizenName,
      role: "citizen",
      channel: req.body.channel || "web",
      hasPhoto: !!hasPhoto,
      forceLanguage: session.preferredLanguage && session.preferredLanguage !== "auto" ? session.preferredLanguage : null,
    };

    const wasEmpty = session.messages.length === 0;

    const out = await runtime.respond({ session, message: trimmed, ctx });

    if (wasEmpty) session.title = deriveTitle(trimmed);

    await session.save();

    res.status(200).json({
      success: true,
      reply: out.reply,
      actions: out.actions,
      analysis: {
        language: out.analysis.language,
        intent: out.analysis.intent,
        category: out.analysis.category,
        priority: out.analysis.priority,
        harmScore: out.analysis.harmScore,
        stages: out.analysis.stages,
        emergency: out.analysis.emergency,
        ward: out.analysis.ward,
      },
      engine: out.engine,
      degraded: out.degraded || null,
      sessionId: session._id,
      title: session.title,
      preferredLanguage: session.preferredLanguage || "auto",
      lastTicketId: session.lastTicketId || null,
      awaiting: (session.draft && session.draft.awaiting) || "",
    });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({
      success: false,
      message: "The assistant hit an error. Please try again.",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};

/**
 * @desc  Which engine is live (shown as a badge in the UI)
 * @route GET /api/chat/health
 */
const health = async (req, res) => {
  const info = llm.getProviderInfo();
  res.status(200).json({
    success: true,
    engine: info,
    toolCount: require("../services/agentTools").CITIZEN_TOOLS.length,
    categories: brain.CATEGORIES.length,
    fallbackAlwaysAvailable: true,
  });
};

/**
 * @desc  Load the current (non-archived) conversation — so the panel
 *        survives a page refresh without opening the history drawer.
 * @route GET /api/chat/session
 */
const getSession = async (req, res) => {
  try {
    const session = await ChatSession.findOne({ citizen: req.user.userId, archived: false })
      .sort({ updatedAt: -1 })
      .lean();
    if (!session) return res.status(200).json({ success: true, messages: [], sessionId: null, lastTicketId: null });

    const visible = (session.messages || [])
      .filter((m) => m.role === "user" || (m.role === "assistant" && m.content))
      .map((m) => ({ role: m.role, content: m.content, at: m.at }));

    res.status(200).json({
      success: true,
      sessionId: session._id,
      title: session.title,
      preferredLanguage: session.preferredLanguage || "auto",
      messages: visible,
      lastTicketId: session.lastTicketId || null,
      turnCount: session.turnCount || 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load session" });
  }
};

/**
 * @desc  Load ANY past conversation by id (for the history drawer)
 * @route GET /api/chat/session/:id
 */
const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid session id" });

    const session = await ChatSession.findOne({ _id: id, citizen: req.user.userId }).lean();
    if (!session) return res.status(404).json({ success: false, message: "Conversation not found" });

    const visible = (session.messages || [])
      .filter((m) => m.role === "user" || (m.role === "assistant" && m.content))
      .map((m) => ({ role: m.role, content: m.content, at: m.at }));

    res.status(200).json({
      success: true,
      sessionId: session._id,
      title: session.title,
      preferredLanguage: session.preferredLanguage || "auto",
      messages: visible,
      lastTicketId: session.lastTicketId || null,
      turnCount: session.turnCount || 0,
      archived: session.archived,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load conversation" });
  }
};

/**
 * @desc  List past conversations for the history drawer — every chat this
 *        citizen has ever had with the agent, newest first. Nothing is ever
 *        deleted by normal use, so this is the permanent record.
 * @route GET /api/chat/sessions
 */
const listSessions = async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit || 40));
    const sessions = await ChatSession.find({ citizen: req.user.userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("title messages lastTicketId turnCount archived createdAt updatedAt")
      .lean();

    const list = sessions.map((s) => {
      const lastMsg = (s.messages || []).filter((m) => m.role === "assistant" && m.content).slice(-1)[0];
      return {
        sessionId: s._id,
        title: s.title || "New conversation",
        preview: lastMsg ? String(lastMsg.content).slice(0, 90) : "",
        turnCount: s.turnCount || 0,
        lastTicketId: s.lastTicketId || null,
        current: !s.archived,
        updatedAt: s.updatedAt,
        createdAt: s.createdAt,
      };
    });

    res.status(200).json({ success: true, count: list.length, sessions: list });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not load conversation history" });
  }
};

/**
 * @desc  Start a fresh conversation. Past chats are archived, NOT deleted —
 *        they remain in the database and are browsable via /sessions.
 * @route POST /api/chat/new
 */
const newSession = async (req, res) => {
  try {
    await ChatSession.updateMany(
      { citizen: req.user.userId, archived: false },
      { $set: { archived: true } }
    );
    const session = await ChatSession.create({
      citizen: req.user.userId,
      role: "citizen",
      messages: [],
      draft: {},
      archived: false,
    });
    res.status(201).json({ success: true, sessionId: session._id, title: session.title });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not start a new conversation" });
  }
};

/**
 * @desc  Legacy alias — kept so any old client still calling /reset works.
 *        No longer deletes history; behaves exactly like /new.
 * @route POST /api/chat/reset
 */
const resetSession = newSession;

/**
 * @desc  Explain a harm score without filing anything (used by the UI preview)
 * @route POST /api/chat/analyze
 */
const analyzeOnly = async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ success: false, message: "text is required" });

  // Heuristic-only plausibility for the live preview — instant and free, so it
  // can run on every keystroke without hitting the LLM. The full gate (with
  // the LLM second opinion, when configured) only runs at actual filing time.
  const plausibility = heuristicCheck(String(text));

  res.status(200).json({
    success: true,
    analysis: brain.analyze(String(text)),
    plausibility: {
      verdict: plausibility.verdict,
      score: plausibility.score,
      reason: plausibility.reasons[0] || "",
    },
  });
};

/**
 * @desc  Public audit ledger
 * @route GET /api/chain/log
 */
const chainLog = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 60);
    const filter = {};
    if (req.query.ticketId) filter.ticketId = String(req.query.ticketId).toUpperCase();
    if (req.query.agentOnly === "true") filter.agentGenerated = true;

    const blocks = await chain.recent(limit, filter);
    res.status(200).json(blocks);
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not read ledger" });
  }
};

/**
 * @desc  Verify the whole hash chain — this is the tamper-evidence proof
 * @route GET /api/chain/verify
 */
const chainVerify = async (req, res) => {
  try {
    const result = await chain.verify();
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not verify ledger" });
  }
};

module.exports = {
  sendMessage,
  health,
  getSession,
  getSessionById,
  listSessions,
  newSession,
  resetSession,
  analyzeOnly,
  chainLog,
  chainVerify,
};
