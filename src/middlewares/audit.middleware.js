const { query } = require('../config/database');
const logger    = require('../utils/logger');

/**
 * Audit-log middleware factory.
 *
 * Writes a row to audit_logs AFTER the response is sent (non-blocking).
 *
 * Usage:
 *   router.post('/vendors', authenticate, authorize('admin'),
 *     auditLog('CREATE_VENDOR', 'vendor'), vendorController.create)
 *
 * @param {string} action         e.g. 'CREATE_VENDOR'
 * @param {string} resourceType   e.g. 'vendor'
 * @param {function} [getResourceId]  Optional fn(req, res) → UUID
 */
const auditLog = (action, resourceType, getResourceId = null) =>
  (req, res, next) => {
    // Capture the original json method so we can hook into it
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Restore immediately so subsequent calls work normally
      res.json = originalJson;
      const result = originalJson(body);

      // Fire-and-forget – do not await
      (async () => {
        try {
          const actorId   = req.user?.id   || null;
          const actorRole = req.user?.role || null;
          const resourceId = getResourceId
            ? getResourceId(req, body)
            : body?.data?.id || null;

          const status = res.statusCode < 400 ? 'success' : 'failure';

          await query(
            `INSERT INTO audit_logs
               (actor_id, actor_role, action, resource_type, resource_id,
                details, ip_address, user_agent, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              actorId,
              actorRole,
              action,
              resourceType,
              resourceId,
              JSON.stringify({ method: req.method, path: req.path, statusCode: res.statusCode }),
              req.ip,
              req.headers['user-agent'] || null,
              status,
            ]
          );
        } catch (err) {
          logger.error('Audit log write failed', { error: err.message });
        }
      })();

      return result;
    };

    next();
  };

module.exports = { auditLog };
