const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Department = require("../models/Department");
const Citizen = require("../models/Citizen");
const Grievance = require("../models/Grievance");
const Notification = require("../models/Notification");
const errorResponse = require("../utils/errorResponse");

function generateAdminToken(adminId, email) {
  return jwt.sign(
    { userId: adminId, email, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function setAdminTokenCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("admin_token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearAdminTokenCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("admin_token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    expires: new Date(0),
    path: "/",
  });
}

// ========================
// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
// ========================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, "Email and password are required");
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!admin) {
      return errorResponse(res, 401, "Invalid admin credentials");
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, "Invalid admin credentials");
    }

    const token = generateAdminToken(admin._id, admin.email);
    setAdminTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin Login Error:", error.message);
    return errorResponse(res, 500, "An error occurred during admin login");
  }
};

// ========================
// @desc    Admin Logout
// @route   POST /api/admin/logout
// @access  Public
// ========================
const logout = (req, res) => {
  clearAdminTokenCookie(res);
  res.status(200).json({
    success: true,
    message: "Admin logged out successfully",
  });
};

// ========================
// @desc    Get current Admin profile
// @route   GET /api/admin/me
// @access  Private (Admin)
// ========================
const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      admin: req.admin,
    });
  } catch (error) {
    console.error("Admin GetMe Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching admin profile");
  }
};

// ========================
// @desc    Get admin dashboard stats (Total Departments, Total Citizens, Total Grievances)
// @route   GET /api/admin/stats
// @access  Private (Admin)
// ========================
const getAdminStats = async (req, res) => {
  try {
    const totalDepartments = await Department.countDocuments();
    const totalCitizens = await Citizen.countDocuments();
    const totalGrievances = await Grievance.countDocuments();

    res.status(200).json({
      success: true,
      stats: {
        totalDepartments,
        totalCitizens,
        totalGrievances,
      },
    });
  } catch (error) {
    console.error("Admin Get Stats Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching admin stats");
  }
};

// ========================
// @desc    Get all registered departments
// @route   GET /api/admin/departments
// @access  Private (Admin)
// ========================
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (error) {
    console.error("Admin Get Departments Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching departments");
  }
};

// ========================
// @desc    Get all registered citizens
// @route   GET /api/admin/citizens
// @access  Private (Admin)
// ========================
const getCitizens = async (req, res) => {
  try {
    const citizens = await Citizen.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: citizens.length,
      citizens,
    });
  } catch (error) {
    console.error("Admin Get Citizens Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching citizens");
  }
};

// ========================
// @desc    Get all grievances across all citizens & departments
// @route   GET /api/admin/grievances
// @access  Private (Admin)
// ========================
const getAllGrievances = async (req, res) => {
  try {
    const grievances = await Grievance.find()
      .populate("citizen", "fullName email mobile")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: grievances.length,
      grievances,
    });
  } catch (error) {
    console.error("Admin Get All Grievances Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching all grievances");
  }
};

// ========================
// @desc    Approve department registration
// @route   PATCH /api/admin/departments/:id/approve
// @access  Private (Admin)
// ========================
const approveDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findByIdAndUpdate(
      id,
      { status: "approved" },
      { new: true, runValidators: true }
    );

    if (!department) {
      return errorResponse(res, 404, "Department not found");
    }

    res.status(200).json({
      success: true,
      message: `Department '${department.department}' has been approved successfully`,
      department,
    });
  } catch (error) {
    console.error("Approve Department Error:", error.message);
    return errorResponse(res, 500, "An error occurred while approving department");
  }
};

// ========================
// @desc    Reject department registration
// @route   PATCH /api/admin/departments/:id/reject
// @access  Private (Admin)
// ========================
const rejectDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true, runValidators: true }
    );

    if (!department) {
      return errorResponse(res, 404, "Department not found");
    }

    res.status(200).json({
      success: true,
      message: `Department '${department.department}' has been rejected`,
      department,
    });
  } catch (error) {
    console.error("Reject Department Error:", error.message);
    return errorResponse(res, 500, "An error occurred while rejecting department");
  }
};

// ========================
// @desc    Admin Delete Grievance permanently from MongoDB
// @route   DELETE /api/admin/grievances/:id
// @access  Private (Admin)
// ========================
const deleteGrievance = async (req, res) => {
  try {
    const { id } = req.params;
    const grievance = await Grievance.findOneAndDelete({
      $or: [{ _id: id }, { ticketId: id }],
    });

    if (!grievance) {
      return errorResponse(res, 404, "Grievance not found");
    }

    res.status(200).json({
      success: true,
      message: `Grievance '${grievance.ticketId || id}' deleted successfully from system`,
      id: grievance._id,
      ticketId: grievance.ticketId,
    });
  } catch (error) {
    console.error("Admin Delete Grievance Error:", error.message);
    return errorResponse(res, 500, "An error occurred while deleting grievance");
  }
};

// ========================
// @desc    Approve citizen registration
// @route   PATCH /api/admin/citizens/:id/approve
// @access  Private (Admin)
// ========================
const approveCitizen = async (req, res) => {
  try {
    const { id } = req.params;
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
      message: "Your citizen account has been approved by admin! You can now log in and submit grievances.",
      type: "citizen_approved",
      link: "/login",
    });

    // Send notification to departments
    await Notification.create({
      recipientType: "department",
      recipientId: "Sanitation Department",
      title: "New Citizen Approved",
      message: `Citizen ${citizen.fullName} account has been approved by Admin.`,
      type: "citizen_approved",
      link: "/officer",
    });

    res.status(200).json({
      success: true,
      message: `Citizen '${citizen.fullName}' has been approved successfully`,
      citizen,
    });
  } catch (error) {
    console.error("Approve Citizen Error:", error.message);
    return errorResponse(res, 500, "An error occurred while approving citizen");
  }
};

// ========================
// @desc    Reject citizen registration
// @route   PATCH /api/admin/citizens/:id/reject
// @access  Private (Admin)
// ========================
const rejectCitizen = async (req, res) => {
  try {
    const { id } = req.params;
    const citizen = await Citizen.findByIdAndUpdate(
      id,
      { status: "rejected" },
      { new: true, runValidators: true }
    );

    if (!citizen) {
      return errorResponse(res, 404, "Citizen not found");
    }

    res.status(200).json({
      success: true,
      message: `Citizen '${citizen.fullName}' has been rejected`,
      citizen,
    });
  } catch (error) {
    console.error("Reject Citizen Error:", error.message);
    return errorResponse(res, 500, "An error occurred while rejecting citizen");
  }
};

module.exports = {
  login,
  logout,
  getMe,
  getAdminStats,
  getDepartments,
  getCitizens,
  getAllGrievances,
  approveDepartment,
  rejectDepartment,
  deleteGrievance,
  approveCitizen,
  rejectCitizen,
};
