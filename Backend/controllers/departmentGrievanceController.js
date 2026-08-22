const Grievance = require("../models/Grievance");
const errorResponse = require("../utils/errorResponse");

// ========================
// @desc    Get all grievances belonging to the authenticated department
// @route   GET /api/department/grievances
// @access  Private (Department)
// ========================
const getDepartmentGrievances = async (req, res) => {
  try {
    const deptName = req.department.department;

    const grievances = await Grievance.find({ dept: deptName })
      .populate("citizen", "fullName email mobile city state address")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: grievances.length,
      grievances,
    });
  } catch (error) {
    console.error("Get Department Grievances Error:", error.message);
    return errorResponse(
      res,
      500,
      "An error occurred while fetching department grievances"
    );
  }
};

// ========================
// @desc    Update grievance status by department
// @route   PATCH /api/department/grievances/:id/status
// @access  Private (Department)
// ========================
const updateGrievanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const deptName = req.department.department;

    const allowedStatuses = [
      "pending",
      "assigned",
      "in_progress",
      "closed_unverified",
      "verified_resolved",
      "reopened",
      "escalated",
      "rejected",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return errorResponse(
        res,
        400,
        `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
      );
    }

    // Find grievance by _id or ticketId, AND ensure it belongs to this department
    const grievance = await Grievance.findOne({
      $or: [{ _id: id }, { ticketId: id }],
      dept: deptName,
    });

    if (!grievance) {
      return errorResponse(
        res,
        404,
        "Grievance not found or not authorized for this department"
      );
    }

    grievance.status = status;
    if (!grievance.statusHistory) {
      grievance.statusHistory = [];
    }
    grievance.statusHistory.push({
      status,
      updatedAt: new Date(),
    });
    await grievance.save();

    // Re-populate citizen info for the response
    await grievance.populate("citizen", "fullName email mobile city state address");

    res.status(200).json({
      success: true,
      message: `Grievance status updated to ${status}`,
      grievance,
    });
  } catch (error) {
    console.error("Department Update Grievance Status Error:", error.message);
    return errorResponse(
      res,
      500,
      "An error occurred while updating grievance status"
    );
  }
};

module.exports = {
  getDepartmentGrievances,
  updateGrievanceStatus,
};
