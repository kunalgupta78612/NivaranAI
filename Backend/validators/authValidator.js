const { body } = require("express-validator");

/**
 * Validation rules for citizen registration
 */
const validateRegistration = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required")
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please provide a valid 10-digit Indian mobile number"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),

  body("gender")
    .trim()
    .notEmpty()
    .withMessage("Gender is required")
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other"),

  body("dateOfBirth")
    .notEmpty()
    .withMessage("Date of birth is required")
    .isISO8601()
    .withMessage("Please provide a valid date of birth (YYYY-MM-DD)")
    .custom((value) => {
      const dob = new Date(value);
      const today = new Date();
      if (dob >= today) {
        throw new Error("Date of birth must be in the past");
      }
      return true;
    }),

  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters"),

  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters"),

  body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .isLength({ max: 100 })
    .withMessage("State cannot exceed 100 characters"),

  body("pincode")
    .trim()
    .notEmpty()
    .withMessage("Pincode is required")
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be a valid 6-digit number"),

  body("aadhaarNumber")
    .trim()
    .notEmpty()
    .withMessage("Aadhaar number is required")
    .matches(/^\d{12}$/)
    .withMessage("Aadhaar number must be a valid 12-digit number"),

  body("profilePhoto").optional().isString().withMessage("Profile photo must be a string URL"),
];

/**
 * Validation rules for citizen login
 */
const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

/**
 * Validation rules for profile update
 * All fields are optional since this is a partial update
 */
const validateProfileUpdate = [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),

  body("mobile")
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Please provide a valid 10-digit Indian mobile number"),

  body("gender")
    .optional()
    .trim()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other"),

  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date of birth (YYYY-MM-DD)")
    .custom((value) => {
      const dob = new Date(value);
      const today = new Date();
      if (dob >= today) {
        throw new Error("Date of birth must be in the past");
      }
      return true;
    }),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters"),

  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters"),

  body("state")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("State cannot exceed 100 characters"),

  body("pincode")
    .optional()
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Pincode must be a valid 6-digit number"),

  body("profilePhoto").optional().isString().withMessage("Profile photo must be a string URL"),

  // Explicitly reject fields that citizens cannot update
  body("role").not().exists().withMessage("You cannot update your role"),
  body("accountStatus").not().exists().withMessage("You cannot update your account status"),
  body("password").not().exists().withMessage("Use the password change endpoint to update your password"),
  body("email").not().exists().withMessage("Email cannot be changed"),
  body("aadhaarNumber").not().exists().withMessage("Aadhaar number cannot be changed"),
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
};
