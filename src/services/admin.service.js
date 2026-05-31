const accountRepo = require('../repositories/account.repository');
const auditRepo   = require('../repositories/audit.repository');
const { decrypt } = require('../utils/encryption');
const { buildMeta } = require('../utils/pagination');

// ─── Dashboard stats ──────────────────────────────────────────────────────────

const getStats = async () => {
  const [vendors, users] = await Promise.all([
    accountRepo.findAll({ role: 'vendor', limit: 1, offset: 0 }),
    accountRepo.findAll({ role: 'user',   limit: 1, offset: 0 }),
  ]);
  return {
    totalVendors: vendors.total,
    totalUsers:   users.total,
  };
};

// ─── Audit logs ───────────────────────────────────────────────────────────────

const getAuditLogs = async ({ page, limit, offset, actorId, action, resourceType, status }) => {
  const { rows, total } = await auditRepo.findAll({
    actorId,
    action,
    resourceType,
    status,
    limit,
    offset,
  });
  return { data: rows, meta: buildMeta(total, page, limit) };
};

module.exports = { getStats, getAuditLogs };
