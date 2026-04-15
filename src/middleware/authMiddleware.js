/**
 * Auth middleware — requires authentication for protected routes.
 * Used for history and other user-specific features.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required. Please sign in to access this feature.' });
  }
}

/**
 * Optional auth — attaches user info if available, but doesn't block.
 * Used for routes that work for both guests and authenticated users.
 */
function optionalAuth(req, res, next) {
  // User info is already attached via session if they're logged in
  next();
}

module.exports = { requireAuth, optionalAuth };
