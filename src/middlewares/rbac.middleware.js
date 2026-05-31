const { sendForbidden } = require('../utils/response');

/**
 * Role-Based Access Control middleware factory.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorize('admin'), handler)
 *   router.get('/admin-or-vendor', authenticate, authorize('admin', 'vendor'), handler)
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return sendForbidden(res, 'No authenticated user found');
  }

  if (!allowedRoles.includes(req.user.role)) {
    return sendForbidden(
      res,
      `Access denied. Required role(s): ${allowedRoles.join(', ')}`
    );
  }

  next();
};

module.exports = { authorize };
