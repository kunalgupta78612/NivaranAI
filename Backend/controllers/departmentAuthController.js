const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const Department = require("../models/Department");
const errorResponse = require("../utils/errorResponse");

/**
 * Generate a JWT for the authenticated department user.
 * Contains departmentId, department name, and role.
 */
function generateDepartmentToken(departmentId, departmentName) {
  return jwt.sign(
    { departmentId, department: departmentName, role: "department" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/**
 * Set dept_token as an HTTP-only cookie on the response.
 */
function setDeptTokenCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("dept_token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

/**
 * Clear the dept_token cookie (for logout).
 */
function clearDeptTokenCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("dept_token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    expires: new Date(0),
    path: "/",
  });
}

// ========================
// @desc    Register a new department user
// @route   POST /api/department/register
// @access  Public
// ========================
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, "Validation failed", errors.array());
    }

    const { name, email, password, department, city, state } = req.body;

    const existingEmail = await Department.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return errorResponse(res, 409, "A department user with this email already exists");
    }

    const dept = await Department.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      department,
      city,
      state,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Department registration submitted! Your account is pending admin approval.",
      department: {
        id: dept._id,
        name: dept.name,
        email: dept.email,
        department: dept.department,
        status: dept.status,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return errorResponse(res, 409, `A department user with this ${field} already exists`);
    }

    console.error("Department Registration Error:", error.message);
    return errorResponse(res, 500, "An error occurred during department registration");
  }
};

// ========================
// @desc    Login department user
// @route   POST /api/department/login
// @access  Public
// ========================
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, "Validation failed", errors.array());
    }

    const { email, password } = req.body;

    const dept = await Department.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!dept) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    const isPasswordMatch = await dept.comparePassword(password);
    if (!isPasswordMatch) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    if (dept.status === "pending") {
      return errorResponse(res, 403, "Your department account is pending admin approval.");
    }

    if (dept.status === "rejected") {
      return errorResponse(res, 403, "Your department account has been rejected.");
    }

    const token = generateDepartmentToken(dept._id, dept.department);
    setDeptTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Department login successful",
      department: {
        id: dept._id,
        name: dept.name,
        email: dept.email,
        department: dept.department,
        city: dept.city,
        state: dept.state,
        status: dept.status,
      },
    });
  } catch (error) {
    console.error("Department Login Error:", error.message);
    return errorResponse(res, 500, "An error occurred during department login");
  }
};

const logout = (req, res) => {
  clearDeptTokenCookie(res);
  res.status(200).json({
    success: true,
    message: "Department logged out successfully",
  });
};

const getMe = async (req, res) => {
  try {
    const dept = await Department.findById(req.department.departmentId);

    if (!dept) {
      return errorResponse(res, 404, "Department user not found");
    }

    res.status(200).json({
      success: true,
      department: dept,
    });
  } catch (error) {
    console.error("Department GetMe Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching department profile");
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, "Current password and new password are required");
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 400, "New password must be at least 6 characters long");
    }

    const dept = await Department.findById(req.department.departmentId).select("+password");
    if (!dept) {
      return errorResponse(res, 404, "Department user not found");
    }

    const isMatch = await dept.comparePassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, 401, "Current password is incorrect");
    }

    dept.password = newPassword;
    await dept.save();

    res.status(200).json({
      success: true,
      message: "Department password changed successfully",
    });
  } catch (error) {
    console.error("Department Change Password Error:", error.message);
    return errorResponse(res, 500, "An error occurred while changing password");
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  changePassword,
};
