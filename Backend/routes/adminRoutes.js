const express = require("express");
const router = express.Router();
const {
  login,
  logout,
  getMe,
  getAdminStats,
  getDepartments,
  getCitizens,
  getAllGrievances,
  approveDepartment,
  rejectDepartment,
} = require("../controllers/adminController");
const { protectAdmin } = require("../middleware/adminMiddleware");

// Public admin routes
router.post("/login", login);
router.post("/logout", logout);

// Protected admin routes
router.get("/me", protectAdmin, getMe);
router.get("/stats", protectAdmin, getAdminStats);
router.get("/departments", protectAdmin, getDepartments);
router.get("/citizens", protectAdmin, getCitizens);
router.get("/grievances", protectAdmin, getAllGrievances);

router.patch("/departments/:id/approve", protectAdmin, approveDepartment);
router.patch("/departments/:id/reject", protectAdmin, rejectDepartment);

module.exports = router;
