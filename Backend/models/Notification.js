const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ["citizen", "department", "admin"],
      required: true,
    },
    recipientId: {
      type: String, // citizen userId, department name, or "admin"
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["grievance_submitted", "status_updated", "citizen_approved", "department_approved", "system"],
      default: "system",
    },
    link: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
