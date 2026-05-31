const adminService  = require('../services/admin.service');
const vendorService = require('../services/vendor.service');
const userService   = require('../services/user.service');
const { parsePagination } = require('../utils/pagination');
const { sendSuccess }     = require('../utils/response');

const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getStats();
    return sendSuccess(res, { data: stats });
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { actorId, action, resourceType, status } = req.query;
    const result = await adminService.getAuditLogs({
      page, limit, offset, actorId, action, resourceType, status,
    });
    return sendSuccess(res, { data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getAuditLogs };
