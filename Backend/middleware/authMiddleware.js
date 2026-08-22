const jwt = require("jsonwebtoken");
const errorResponse = require("../utils/errorResponse");

/**
 * Protect routes — Verify JWT from HTTP-only cookie
 * Attaches { userId, role } to req.user
 */
const protect = (req, res, next) => {
  try {
    // Read token from HTTP-only cookie
    const token = req.cookies?.token;

    if (!token) {
      return errorResponse(res, 401, "Access denied. No authentication token provided.");
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, 401, "Authentication token has expired. Please login again.");
    }
    if (error.name === "JsonWebTokenError") {
      return errorResponse(res, 401, "Invalid authentication token.");
    }
    return errorResponse(res, 401, "Authentication failed.");
  }
};

/**
 * Role-based authorization middleware
 * Usage: authorize("admin", "super_admin")
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, "Authentication required.");
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
      );
    }

    next();
  };
};

module.exports = { protect, authorize };
