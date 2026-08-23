const Notification = require("../models/Notification");
const jwt = require("jsonwebtoken");
const errorResponse = require("../utils/errorResponse");

// Helper to determine recipient context from request cookies, auth headers, or req.user
function getRecipientContext(req) {
  const cookies = req.cookies || {};
  const roleParam = req.query?.role;
  const referer = req.headers?.referer || "";
  const authHeader = req.headers?.authorization || "";

  // Extract Bearer token if present
  let bearerToken = null;
  if (authHeader.startsWith("Bearer ")) {
    bearerToken = authHeader.substring(7).trim();
  }

  // Helper to safely verify token
  const verifyToken = (token) => {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return null;
    }
  };

  // 0. If req.user is set via auth middleware
  if (req.user) {
    if (req.user.role === "admin") {
      return { recipientType: "admin", recipientId: "admin" };
    }
    if (req.user.department) {
      return { recipientType: "department", recipientId: String(req.user.department) };
    }
    if (req.user.userId) {
      return { recipientType: "citizen", recipientId: String(req.user.userId) };
    }
  }

  // 1. Check Bearer token first if supplied
  if (bearerToken) {
    const decoded = verifyToken(bearerToken);
    if (decoded) {
      if (decoded.role === "admin") return { recipientType: "admin", recipientId: "admin" };
      if (decoded.department) return { recipientType: "department", recipientId: String(decoded.department) };
      if (decoded.userId) return { recipientType: "citizen", recipientId: String(decoded.userId) };
    }
  }

  // 2. Explicit role query parameter
  if (roleParam === "citizen" && cookies.token) {
    const decoded = verifyToken(cookies.token);
    if (decoded?.userId) return { recipientType: "citizen", recipientId: String(decoded.userId) };
  }

  if (roleParam === "department" && (cookies.dept_token || cookies.department_token)) {
    const token = cookies.dept_token || cookies.department_token;
    const decoded = verifyToken(token);
    if (decoded?.department) return { recipientType: "department", recipientId: String(decoded.department) };
  }

  if (roleParam === "admin" && cookies.admin_token) {
    const decoded = verifyToken(cookies.admin_token);
    if (decoded?.role === "admin") return { recipientType: "admin", recipientId: "admin" };
  }

  // 3. Infer from HTTP Referer header
  if ((referer.includes("/citizen") || referer.includes("/my-grievances")) && cookies.token) {
    const decoded = verifyToken(cookies.token);
    if (decoded?.userId) return { recipientType: "citizen", recipientId: String(decoded.userId) };
  }

  if (referer.includes("/officer") && (cookies.dept_token || cookies.department_token)) {
    const token = cookies.dept_token || cookies.department_token;
    const decoded = verifyToken(token);
    if (decoded?.department) return { recipientType: "department", recipientId: String(decoded.department) };
  }

  if ((referer.includes("/admin") || referer.includes("/godmode")) && cookies.admin_token) {
    const decoded = verifyToken(cookies.admin_token);
    if (decoded?.role === "admin") return { recipientType: "admin", recipientId: "admin" };
  }

  // 4. Default fallback: Citizen token -> Department token -> Admin token
  if (cookies.token) {
    const decoded = verifyToken(cookies.token);
    if (decoded?.userId) return { recipientType: "citizen", recipientId: String(decoded.userId) };
  }

  const deptToken = cookies.dept_token || cookies.department_token;
  if (deptToken) {
    const decoded = verifyToken(deptToken);
    if (decoded?.department) return { recipientType: "department", recipientId: String(decoded.department) };
  }

  if (cookies.admin_token) {
    const decoded = verifyToken(cookies.admin_token);
    if (decoded?.role === "admin") return { recipientType: "admin", recipientId: "admin" };
  }

  return null;
}

const getMyNotifications = async (req, res) => {
  try {
    const context = getRecipientContext(req);
    if (!context) {
      return res.status(200).json({ success: true, notifications: [], unreadCount: 0 });
    }

    const query = {
      recipientType: context.recipientType,
      $or: [{ recipientId: context.recipientId }, { recipientId: "all" }],
    };

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ ...query, read: false });

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching notifications");
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );
    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error("Mark Notification Read Error:", error.message);
    return errorResponse(res, 500, "An error occurred while updating notification");
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const context = getRecipientContext(req);
    if (context) {
      await Notification.updateMany(
        { recipientType: context.recipientType, recipientId: context.recipientId, read: false },
        { read: true }
      );
    }
    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark All Read Error:", error.message);
    return errorResponse(res, 500, "An error occurred while marking all read");
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
