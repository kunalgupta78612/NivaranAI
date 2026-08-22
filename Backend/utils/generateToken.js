const jwt = require("jsonwebtoken");

/**
 * Generate a JWT for the authenticated citizen
 * @param {string} userId - The citizen's MongoDB _id
 * @param {string} role - The citizen's role
 * @returns {string} Signed JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

module.exports = generateToken;
