const express = require("express");
const router = express.Router();

const {
  createGrievance,
  getMyGrievances,
  getMyGrievanceCount,
  getGrievanceById,
  updateGrievance,
  deleteGrievance,
  getGrievanceStats,
  updateGrievanceStatus,
} = require("../controllers/grievanceController");

const { protect } = require("../middleware/authMiddleware");

// All grievance routes require authentication via HTTP-only JWT cookie
router.post("/", protect, createGrievance);
router.get("/", protect, getMyGrievances); // Route /api/grievances -> getMyGrievances
router.get("/mine", protect, getMyGrievances);
router.get("/my", protect, getMyGrievances);
router.get("/my/count", protect, getMyGrievanceCount);
router.get("/stats", protect, getGrievanceStats);
router.get("/:id", protect, getGrievanceById);
router.put("/:id", protect, updateGrievance);
router.delete("/:id", protect, deleteGrievance);
router.patch("/:id/status", protect, updateGrievanceStatus);
router.post("/:id/close", protect, updateGrievanceStatus);
router.post("/:id/verify", protect, updateGrievanceStatus);

module.exports = router;
