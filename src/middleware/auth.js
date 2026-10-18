/**
 * Protect API routes that require an authenticated session
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // Return JSON 401 for API endpoints
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please sign in.'
  });
}

/**
 * Protect page view routes that require an authenticated session (redirects unauthenticated users)
 */
function requireAuthPage(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect('/?error=unauthorized');
}

/**
 * Redirect already authenticated users away from login/register to dashboard
 */
function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard.html');
  }
  next();
}

module.exports = {
  requireAuth,
  requireAuthPage,
  requireGuest
};
