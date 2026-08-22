const { validationResult } = require("express-validator");
const Citizen = require("../models/Citizen");
const Notification = require("../models/Notification");
const generateToken = require("../utils/generateToken");
const { setTokenCookie, clearTokenCookie } = require("../utils/cookieUtils");
const errorResponse = require("../utils/errorResponse");

// ========================
// @desc    Register a new citizen
// @route   POST /api/auth/register
// @access  Public
// ========================
const register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, "Validation failed", errors.array());
    }

    const {
      fullName,
      email,
      mobile,
      password,
      gender,
      dateOfBirth,
      address,
      city,
      state,
      pincode,
      aadhaarNumber,
      profilePhoto,
    } = req.body;

    // Check if email already exists
    const existingEmail = await Citizen.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return errorResponse(res, 409, "A citizen with this email address already exists");
    }

    // Check if mobile number already exists
    const existingMobile = await Citizen.findOne({ mobile });
    if (existingMobile) {
      return errorResponse(res, 409, "A citizen with this mobile number already exists");
    }

    // Create the citizen (password will be hashed by pre-save hook)
    const citizen = await Citizen.create({
      fullName,
      email,
      mobile,
      password,
      gender,
      dateOfBirth,
      address,
      city,
      state,
      pincode,
      aadhaarNumber,
      profilePhoto: profilePhoto || null,
      status: "approved",
    });

    // Create notification for Admin
    await Notification.create({
      recipientType: "admin",
      recipientId: "admin",
      title: "New Citizen Registered",
      message: `Citizen ${citizen.fullName} (${citizen.email}) created an account.`,
      type: "citizen_approved",
      link: "/admin",
    });

    // Create notification for Departments
    await Notification.create({
      recipientType: "department",
      recipientId: "all",
      title: "New Citizen Account Created",
      message: `Citizen ${citizen.fullName} (${citizen.city || 'Indore'}) created an account.`,
      type: "citizen_approved",
      link: "/officer",
    });

    // Return success — toJSON() strips password and masks Aadhaar
    res.status(201).json({
      success: true,
      message: "Citizen registered successfully",
      citizen: {
        id: citizen._id,
        name: citizen.fullName,
        email: citizen.email,
        role: citizen.role,
        status: citizen.status,
      },
    });
  } catch (error) {
    // Handle Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return errorResponse(res, 409, `A citizen with this ${field} already exists`);
    }

    console.error("Registration Error:", error.message);
    return errorResponse(res, 500, "An error occurred during registration");
  }
};

// ========================
// @desc    Login citizen
// @route   POST /api/auth/login
// @access  Public
// ========================
const login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, "Validation failed", errors.array());
    }

    const { email, password } = req.body;

    // Find citizen by email — explicitly select password for comparison
    const citizen = await Citizen.findOne({ email }).select("+password");
    if (!citizen) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    // Compare password
    const isPasswordMatch = await citizen.comparePassword(password);
    if (!isPasswordMatch) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    // Account status check
    if (citizen.accountStatus !== "active") {
      return errorResponse(
        res,
        403,
        `Your account is ${citizen.accountStatus}. Please contact support.`
      );
    }

    // Generate JWT
    const token = generateToken(citizen._id, citizen.role);

    // Set JWT in HTTP-only cookie
    setTokenCookie(res, token);

    // Return citizen info (no token in body — it's in the cookie)
    res.status(200).json({
      success: true,
      message: "Login successful",
      citizen: {
        id: citizen._id,
        name: citizen.fullName,
        email: citizen.email,
        role: citizen.role,
        status: citizen.status,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    return errorResponse(res, 500, "An error occurred during login");
  }
};

// ========================
// @desc    Logout citizen (clear cookie)
// @route   POST /api/auth/logout
// @access  Public
// ========================
const logout = (req, res) => {
  clearTokenCookie(res);

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

// ========================
// @desc    Get current authenticated citizen
// @route   GET /api/auth/me
// @access  Private
// ========================
const getMe = async (req, res) => {
  try {
    const citizen = await Citizen.findById(req.user.userId);

    if (!citizen) {
      return errorResponse(res, 404, "Citizen not found");
    }

    if (citizen.status === "pending") {
      citizen.status = "approved";
      await citizen.save();
    }

    res.status(200).json({
      success: true,
      citizen,
    });
  } catch (error) {
    console.error("GetMe Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching profile");
  }
};

// ========================
// @desc    Update citizen profile
// @route   PUT /api/auth/profile
// @access  Private
// ========================
const updateProfile = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, "Validation failed", errors.array());
    }

    // Whitelist of fields a citizen is allowed to update
    const allowedFields = [
      "fullName",
      "mobile",
      "gender",
      "dateOfBirth",
      "address",
      "city",
      "state",
      "pincode",
      "profilePhoto",
    ];

    // Build update object from only allowed fields
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 400, "No valid fields provided for update");
    }

    // Recalculate age if DOB is being updated
    if (updates.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(updates.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      updates.age = age;
    }

    // Check for duplicate mobile if being updated
    if (updates.mobile) {
      const existingMobile = await Citizen.findOne({
        mobile: updates.mobile,
        _id: { $ne: req.user.userId },
      });
      if (existingMobile) {
        return errorResponse(res, 409, "A citizen with this mobile number already exists");
      }
    }

    const citizen = await Citizen.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
    });

    if (!citizen) {
      return errorResponse(res, 404, "Citizen not found");
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      citizen,
    });
  } catch (error) {
    // Handle Mongoose duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return errorResponse(res, 409, `A citizen with this ${field} already exists`);
    }

    console.error("Update Profile Error:", error.message);
    return errorResponse(res, 500, "An error occurred while updating profile");
  }
};

// ========================
// @desc    Change citizen password
// @route   PUT /api/auth/change-password
// @access  Private
// ========================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, "Current password and new password are required");
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 400, "New password must be at least 6 characters long");
    }

    const citizen = await Citizen.findById(req.user.userId).select("+password");
    if (!citizen) {
      return errorResponse(res, 404, "Citizen not found");
    }

    const isMatch = await citizen.comparePassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, 401, "Current password is incorrect");
    }

    citizen.password = newPassword;
    await citizen.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error.message);
    return errorResponse(res, 500, "An error occurred while changing password");
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
};
