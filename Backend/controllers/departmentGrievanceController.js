const Grievance = require("../models/Grievance");
const Citizen = require("../models/Citizen");
const Notification = require("../models/Notification");
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

    // Send notification to the citizen owner
    if (grievance.citizen) {
      const citizenId = String(grievance.citizen._id || grievance.citizen);
      const ticketRef = grievance.ticketId || grievance._id;
      const formattedStatus = status.replace('_', ' ');
      await Notification.create({
        recipientType: "citizen",
        recipientId: citizenId,
        title: "Grievance Status Updated",
        message: `Your grievance ${ticketRef} status has been updated to '${formattedStatus}' by ${deptName}.`,
        type: "status_updated",
        link: "/citizen",
      });
    }

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

// ========================
// @desc    Get all citizens for department approval review
// @route   GET /api/department/citizens
// @access  Private (Department)
// ========================
const getDepartmentCitizens = async (req, res) => {
  try {
    const citizens = await Citizen.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: citizens.length,
      citizens,
    });
  } catch (error) {
    console.error("Get Department Citizens Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching citizens");
  }
};

// ========================
// @desc    Approve citizen registration by department
// @route   PATCH /api/department/citizens/:id/approve
// @access  Private (Department)
// ========================
const approveCitizenByDept = async (req, res) => {
  try {
    const { id } = req.params;
    const deptName = req.department.department;

    const citizen = await Citizen.findByIdAndUpdate(
      id,
      { status: "approved" },
      { new: true, runValidators: true }
    );

    if (!citizen) {
      return errorResponse(res, 404, "Citizen not found");
    }

    // Send notification to the citizen
    await Notification.create({
      recipientType: "citizen",
      recipientId: String(citizen._id),
      title: "Account Approved",
      message: `Your citizen account has been approved by ${deptName}! You can now log in and submit grievances.`,
      type: "citizen_approved",
      link: "/login",
    });

    res.status(200).json({
      success: true,
      message: `Citizen '${citizen.fullName}' approved successfully by ${deptName}`,
      citizen,
    });
  } catch (error) {
    console.error("Department Approve Citizen Error:", error.message);
    return errorResponse(res, 500, "An error occurred while approving citizen");
  }
};

// ========================
// @desc    Reject citizen registration by department
// @route   PATCH /api/department/citizens/:id/reject
// @access  Private (Department)
// ========================
const rejectCitizenByDept = async (req, res) => {
  try {
    const { id } = req.params;
    const deptName = req.department.department;

    const citizen = await Citizen.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true, runValidators: true }
    );

    if (!citizen) {
      return errorResponse(res, 404, "Citizen not found");
    }

    // Send notification to the citizen
    await Notification.create({
      recipientType: "citizen",
      recipientId: String(citizen._id),
      title: "Account Registration Rejected",
      message: `Your citizen account registration request was rejected by ${deptName}.`,
      type: "citizen_approved",
      link: "/login",
    });

    res.status(200).json({
      success: true,
      message: `Citizen '${citizen.fullName}' rejected by ${deptName}`,
      citizen,
    });
  } catch (error) {
    console.error("Department Reject Citizen Error:", error.message);
    return errorResponse(res, 500, "An error occurred while rejecting citizen");
  }
};

module.exports = {
  getDepartmentGrievances,
  updateGrievanceStatus,
  getDepartmentCitizens,
  approveCitizenByDept,
  rejectCitizenByDept,
};
