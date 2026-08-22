const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const errorResponse = require("../utils/errorResponse");

const protectAdmin = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return errorResponse(res, 401, "Not authorized, admin token missing");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return errorResponse(res, 403, "Forbidden, admin access required");
    }

    const admin = await Admin.findById(decoded.userId);
    if (!admin) {
      return errorResponse(res, 401, "Admin account not found");
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Admin Auth Middleware Error:", error.message);
    return errorResponse(res, 401, "Not authorized, token invalid or expired");
  }
};

module.exports = { protectAdmin };
