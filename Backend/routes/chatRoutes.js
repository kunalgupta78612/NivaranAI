const express = require("express");
const router = express.Router();

const {
  sendMessage,
  health,
  getSession,
  getSessionById,
  listSessions,
  newSession,
  resetSession,
  analyzeOnly,
} = require("../controllers/chatController");

const { protect } = require("../middleware/authMiddleware");

// Public — the UI badge needs to know which engine is live before login
router.get("/health", health);

// Private — everything the agent does is scoped to the logged-in citizen
router.post("/", protect, sendMessage);
router.get("/sessions", protect, listSessions);
router.get("/session", protect, getSession);
router.get("/session/:id", protect, getSessionById);
router.post("/new", protect, newSession);
router.post("/reset", protect, resetSession); // legacy alias for /new
router.post("/analyze", protect, analyzeOnly);

module.exports = router;
