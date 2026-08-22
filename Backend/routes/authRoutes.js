const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// Controllers
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
} = require("../controllers/authController");

// Middleware
const { protect } = require("../middleware/authMiddleware");

// Validators
const {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
} = require("../validators/authValidator");

// ========================
// Rate limiters for auth endpoints
// ========================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  message: {
    success: false,
    message: "Too many attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ========================
// Auth Routes
// ========================

// Public routes
router.post("/register", authLimiter, validateRegistration, register);
router.post("/login", authLimiter, validateLogin, login);
router.post("/logout", logout);

// Protected routes
router.get("/me", protect, getMe);
router.put("/profile", protect, validateProfileUpdate, updateProfile);

module.exports = router;
