const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// Controllers
const {
  register,
  login,
  logout,
  getMe,
  changePassword,
} = require("../controllers/departmentAuthController");

const {
  getDepartmentGrievances,
  updateGrievanceStatus,
} = require("../controllers/departmentGrievanceController");

// Middleware
const { protectDepartment } = require("../middleware/departmentMiddleware");

// Validators
const {
  validateDepartmentRegistration,
  validateDepartmentLogin,
} = require("../validators/departmentValidator");

// ========================
// Rate limiter for department auth endpoints
// ========================
const deptAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: "Too many attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ========================
// Department Auth Routes (Public)
// ========================
router.post("/register", deptAuthLimiter, validateDepartmentRegistration, register);
router.post("/login", deptAuthLimiter, validateDepartmentLogin, login);
router.post("/logout", logout);

// ========================
// Department Auth Routes (Protected)
// ========================
router.get("/me", protectDepartment, getMe);
router.put("/change-password", protectDepartment, changePassword);

// ========================
// Department Grievance Routes (Protected)
// ========================
router.get("/grievances", protectDepartment, getDepartmentGrievances);
router.patch("/grievances/:id/status", protectDepartment, updateGrievanceStatus);

module.exports = router;
