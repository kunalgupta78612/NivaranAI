const Notification = require("../models/Notification");
const jwt = require("jsonwebtoken");
const errorResponse = require("../utils/errorResponse");

// Helper to determine recipient context from request cookies
function getRecipientContext(req) {
  const cookies = req.cookies || {};
  const roleParam = req.query?.role;
  const referer = req.headers?.referer || "";

  // 1. Explicit role query parameter
  if (roleParam === "citizen" && cookies.token) {
    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
      if (decoded && decoded.userId) {
        return { recipientType: "citizen", recipientId: String(decoded.userId) };
      }
    } catch (e) {}
  }

  if (roleParam === "department" && (cookies.dept_token || cookies.department_token)) {
    try {
      const token = cookies.dept_token || cookies.department_token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && decoded.department) {
        return { recipientType: "department", recipientId: decoded.department };
      }
    } catch (e) {}
  }

  if (roleParam === "admin" && cookies.admin_token) {
    try {
      const decoded = jwt.verify(cookies.admin_token, process.env.JWT_SECRET);
      if (decoded && decoded.role === "admin") {
        return { recipientType: "admin", recipientId: "admin" };
      }
    } catch (e) {}
  }

  // 2. Infer from HTTP Referer header
  if ((referer.includes("/citizen") || referer.includes("/my-grievances")) && cookies.token) {
    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
      if (decoded && decoded.userId) {
        return { recipientType: "citizen", recipientId: String(decoded.userId) };
      }
    } catch (e) {}
  }

  if (referer.includes("/officer") && (cookies.dept_token || cookies.department_token)) {
    try {
      const token = cookies.dept_token || cookies.department_token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && decoded.department) {
        return { recipientType: "department", recipientId: decoded.department };
      }
    } catch (e) {}
  }

  if ((referer.includes("/admin") || referer.includes("/godmode")) && cookies.admin_token) {
    try {
      const decoded = jwt.verify(cookies.admin_token, process.env.JWT_SECRET);
      if (decoded && decoded.role === "admin") {
        return { recipientType: "admin", recipientId: "admin" };
      }
    } catch (e) {}
  }

  // 3. Default fallback: Citizen token first
  if (cookies.token) {
    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
      if (decoded && decoded.userId) {
        return { recipientType: "citizen", recipientId: String(decoded.userId) };
      }
    } catch (e) {}
  }

  const deptToken = cookies.dept_token || cookies.department_token;
  if (deptToken) {
    try {
      const decoded = jwt.verify(deptToken, process.env.JWT_SECRET);
      if (decoded && decoded.department) {
        return { recipientType: "department", recipientId: decoded.department };
      }
    } catch (e) {}
  }

  if (cookies.admin_token) {
    try {
      const decoded = jwt.verify(cookies.admin_token, process.env.JWT_SECRET);
      if (decoded && decoded.role === "admin") {
        return { recipientType: "admin", recipientId: "admin" };
      }
    } catch (e) {}
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
