/**
 * Wraps an async route/middleware handler so any rejected promise is
 * forwarded to next(), instead of needing a try/catch in every route.
 *
 * Usage: router.get('/x', asyncHandler(async (req, res) => { ... }))
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
