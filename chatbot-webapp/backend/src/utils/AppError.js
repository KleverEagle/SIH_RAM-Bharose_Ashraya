/**
 * Standard application error.
 *
 * Every error that should produce a specific HTTP status + error code
 * throws one of these. The centralized error handler in app.js turns it
 * into the standard { success: false, error: { code, message } } shape.
 */
class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP status code to respond with.
   * @param {string} code - Machine-readable error code (e.g. "VALIDATION_ERROR").
   * @param {string} message - Human-readable message safe to show the frontend.
   */
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // distinguishes expected errors from bugs
  }
}

module.exports = AppError;
