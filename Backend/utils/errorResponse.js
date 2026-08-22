/**
 * Send a standardized error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {array} [errors] - Optional array of validation errors
 */
const errorResponse = (res, statusCode, message, errors = null) => {
  let errorMessage = message;

  if (errors && Array.isArray(errors) && errors.length > 0) {
    // Format validation messages into readable string
    errorMessage = errors.map((e) => e.msg || e).join(". ");
  }

  const response = {
    success: false,
    message: errorMessage,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = errorResponse;
