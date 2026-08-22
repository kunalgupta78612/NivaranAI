const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department user name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Never return password in queries by default
    },
    department: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      maxlength: [200, "Department name cannot exceed 200 characters"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      maxlength: [100, "State cannot exceed 100 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ========================
// Pre-save: Hash password
// ========================
departmentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ========================
// Instance method: Compare password
// ========================
departmentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ========================
// Transform: Strip password from JSON output
// ========================
departmentSchema.methods.toJSON = function () {
  const dept = this.toObject();
  delete dept.password;
  return dept;
};

const Department = mongoose.model("Department", departmentSchema);

module.exports = Department;
