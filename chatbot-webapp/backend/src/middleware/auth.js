const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/**
 * Requires a valid `Authorization: Bearer <token>` header.
 *
 * On success, attaches the authenticated user's ID to req.user = { id }.
 * This is the ONLY source of truth for "who is making this request" —
 * routes/services must never trust a user ID supplied in the request
 * body, query string, or params.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or malformed authentication token.'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired authentication token.'));
  }
}

module.exports = { requireAuth };
