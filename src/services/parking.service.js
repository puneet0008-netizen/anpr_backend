const repo     = require('../repositories/parking.repository');
const userRepo  = require('../repositories/parking_users.repository');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code });

const formatSite = (row) => row ? {
  id:                   row.id,
  siteName:             row.site_name,
  location:             row.location,
  type:                 row.type,
  totalCapacity:        row.total_capacity,
  occupied:             row.occupied      ?? 0,
  allottedSlots:        row.allotted_slots ?? 0,
  hourlyRate:           parseFloat(row.hourly_rate),
  dailyRate:            parseFloat(row.daily_rate),
  monthlyRate:          parseFloat(row.monthly_rate),
  status:               row.status,
  assignedVendorId:     row.assigned_vendor_id,
  assignedVendorName:   row.assigned_vendor_name,
  entryCameraIp:        row.entry_camera_ip,
  exitCameraIp:         row.exit_camera_ip,
  barrierControllerIp:  row.barrier_controller_ip,
  createdAt:            row.created_at,
} : null;

// ─── Sites ───────────────────────────────────────────────────────────────────

const listSites = async (query) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(query);
  const { rows, total } = await repo.findAllSites({ search, status: query.status, limit, offset, sortBy, sortOrder });
  return { data: rows.map(formatSite), meta: buildMeta(total, page, limit), success: true };
};

const createSite = async (d) => {
  const row = await repo.createSite(d);
  await cacheDel('parking:stats');
  return { data: formatSite(row), success: true };
};

const updateSite = async (id, d) => {
  const existing = await repo.findSiteById(id);
  if (!existing) throw err('Parking site not found', 404);
  const row = await repo.updateSiteById(id, d);
  return { data: formatSite(row), success: true };
};

const deleteSite = async (id) => {
  if (!await repo.findSiteById(id)) throw err('Parking site not found', 404);
  await repo.deleteSiteById(id);
  await cacheDel('parking:stats');
};

const getStats = async () => {
  const cached = await cacheGet('parking:stats');
  if (cached) return cached;
  const stats = await repo.getStats();
  const result = { data: stats, success: true };
  await cacheSet('parking:stats', result, 60);
  return result;
};

// ─── Recharge ─────────────────────────────────────────────────────────────────

const processRecharge = async ({ userId, amount, paymentMethod, transactionRef }, actorId) => {
  const user = await userRepo.findById(userId);
  if (!user) throw err('User not found', 404);
  if (user.type !== 'app') throw err('Recharges are only for app users', 400);

  await repo.updateWallet(userId, amount);
  const recharge = await repo.createRecharge({
    userId,
    userName:       user.name,
    vehicleNumber:  user.vehicle_number,
    amount,
    paymentMethod,
    transactionRef,
    processedBy:    actorId,
  });
  await cacheDelPattern('recharges:*');
  return { data: recharge, success: true };
};

const getRecentRecharges = async () => {
  const cached = await cacheGet('recharges:recent');
  if (cached) return cached;
  const rows = await repo.getRecentRecharges(20);
  const result = {
    data: rows.map(r => ({
      id:             r.id,
      userId:         r.user_id,
      userName:       r.user_name,
      vehicleNumber:  r.vehicle_number,
      amount:         parseFloat(r.amount),
      paymentMethod:  r.payment_method,
      transactionRef: r.transaction_ref,
      createdAt:      r.created_at,
    })),
    success: true,
  };
  await cacheSet('recharges:recent', result, 30);
  return result;
};

const getSiteDropdown = async () => {
  const cached = await cacheGet('parking:dropdown');
  if (cached) return cached;
  const rows = await repo.findDropdown();
  const result = { data: rows.map(r => ({ id: r.id, siteName: r.site_name })), success: true };
  await cacheSet('parking:dropdown', result, 120);
  return result;
};

module.exports = { listSites, createSite, updateSite, deleteSite, getStats, processRecharge, getRecentRecharges, getSiteDropdown };
