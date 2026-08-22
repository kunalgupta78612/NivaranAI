/**
 * Set JWT as an HTTP-only cookie on the response
 * @param {object} res - Express response object
 * @param {string} token - JWT token
 */
const setTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true, // Prevent client-side JS access
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? "strict" : "lax", // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: "/",
  };

  res.cookie("token", token, cookieOptions);
};

/**
 * Clear the JWT cookie (for logout)
 * @param {object} res - Express response object
 */
const clearTokenCookie = (res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    expires: new Date(0), // Expire immediately
    path: "/",
  });
};

module.exports = { setTokenCookie, clearTokenCookie };
