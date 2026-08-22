const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const citizenSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
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
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit Indian mobile number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Never return password in queries by default
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: "Gender must be male, female, or other",
      },
      required: [true, "Gender is required"],
      lowercase: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    age: {
      type: Number,
      min: [1, "Age must be at least 1"],
      max: [150, "Age cannot exceed 150"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
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
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true,
      match: [/^\d{6}$/, "Pincode must be a valid 6-digit number"],
    },
    aadhaarNumber: {
      type: String,
      required: [true, "Aadhaar number is required"],
      trim: true,
      match: [/^\d{12}$/, "Aadhaar number must be a valid 12-digit number"],
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: {
        values: ["citizen", "admin", "department_officer", "super_admin"],
        message: "Invalid role",
      },
      default: "citizen",
    },
    accountStatus: {
      type: String,
      enum: {
        values: ["active", "inactive", "suspended", "blocked"],
        message: "Invalid account status",
      },
      default: "active",
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: "Invalid status",
      },
      default: "pending",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ========================
// Pre-save: Hash password
// ========================
citizenSchema.pre("save", async function (next) {
  // Only hash if password is new or modified
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
// Pre-save: Calculate age from DOB
// ========================
citizenSchema.pre("save", function (next) {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.age = age;
  }
  next();
});

// ========================
// Instance method: Compare password
// ========================
citizenSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ========================
// Transform: Mask Aadhaar & strip password from JSON
// ========================
citizenSchema.methods.toJSON = function () {
  const citizen = this.toObject();

  // Never expose password
  delete citizen.password;

  // Mask Aadhaar — show only last 4 digits
  if (citizen.aadhaarNumber) {
    citizen.aadhaarNumber = "XXXX-XXXX-" + citizen.aadhaarNumber.slice(-4);
  }

  return citizen;
};

// Indexes for performance
// email index created automatically via unique: true
// mobile index created automatically via unique: true

const Citizen = mongoose.model("Citizen", citizenSchema);

module.exports = Citizen;
