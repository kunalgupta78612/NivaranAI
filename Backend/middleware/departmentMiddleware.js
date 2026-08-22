const jwt = require("jsonwebtoken");
const errorResponse = require("../utils/errorResponse");

/**
 * Protect department routes — Verify JWT from HTTP-only cookie `dept_token`
 * Attaches { departmentId, department, role } to req.department
 *
 * This is completely separate from the citizen `protect` middleware
 * which reads the `token` cookie. Both can coexist in the same browser.
 */
const protectDepartment = (req, res, next) => {
  try {
    // Read token from the department-specific HTTP-only cookie
    const token = req.cookies?.dept_token;

    if (!token) {
      return errorResponse(
        res,
        401,
        "Access denied. No department authentication token provided."
      );
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure this is a department token
    if (decoded.role !== "department") {
      return errorResponse(
        res,
        403,
        "Invalid token type. Department authentication required."
      );
    }

    // Attach department info to request
    req.department = {
      departmentId: decoded.departmentId,
      department: decoded.department,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(
        res,
        401,
        "Department authentication token has expired. Please login again."
      );
    }
    if (error.name === "JsonWebTokenError") {
      return errorResponse(res, 401, "Invalid department authentication token.");
    }
    return errorResponse(res, 401, "Department authentication failed.");
  }
};

module.exports = { protectDepartment };
