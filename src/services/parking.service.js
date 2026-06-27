const repo        = require('../repositories/parking.repository');
const userRepo    = require('../repositories/parking_users.repository');
const vendorRepo  = require('../repositories/vendors.repository');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code });

const formatSite = (row) => row ? {
  id:                   row.id || row._id,
  siteName:             row.siteName ?? row.site_name,
  location:             row.location,
  type:                 row.type,
  totalCapacity:        row.totalCapacity ?? row.total_capacity,
  occupied:             row.occupied ?? 0,
  allottedSlots:        row.allotted_slots ?? row.allottedSlots ?? 0,
  hourlyRate:           parseFloat(row.hourlyRate ?? row.hourly_rate) || 0,
  dailyRate:            parseFloat(row.dailyRate ?? row.daily_rate) || 0,
  monthlyRate:          parseFloat(row.monthlyRate ?? row.monthly_rate) || 0,
  status:               row.status,
  assignedVendorId:     row.assignedVendorId ?? row.assigned_vendor_id,
  assignedVendorName:   row.assigned_vendor_name ?? row.assignedVendorName ?? null,
  entryCameraIp:        row.entryCameraIp ?? row.entry_camera_ip,
  exitCameraIp:         row.exitCameraIp ?? row.exit_camera_ip,
  barrierControllerIp:  row.barrierControllerIp ?? row.barrier_controller_ip,
  createdAt:            row.createdAt ?? row.created_at,
} : null;

const DROPDOWN_CACHE_VERSION = 'v2';

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
  const cacheKey = `parking:dropdown:${DROPDOWN_CACHE_VERSION}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;
  const rows = await repo.findDropdown();
  const result = { data: rows.map(r => ({ id: r.id || r._id, siteName: r.siteName ?? r.site_name })), success: true };
  await cacheSet(cacheKey, result, 120);
  return result;
};

const formatVendorSummary = (row) => row ? {
  id:                row._id || row.id,
  vendorName:        row.vendorName ?? row.vendor_name,
  contactPerson:     row.contactPerson ?? row.contact_person,
  phone:             row.phone,
  email:             row.email,
  city:              row.city,
  state:             row.state,
  status:            row.status,
  assignedSiteId:    row.assignedSiteId ?? row.assigned_site_id,
  assignedSiteName:  row.assigned_site_name ?? row.assignedSiteName ?? null,
  contractsCount:    parseInt(row.contracts_count ?? row.contractsCount) || 0,
} : null;

const getVendorParkingDetails = async ({ accountId, role, vendorId }) => {
  let vendor;
  if (role === 'vendor') {
    vendor = await vendorRepo.findByAccountId(accountId);
    if (!vendor) throw err('Vendor profile not found', 404);
  } else {
    if (!vendorId) throw err('vendorId query param is required', 400);
    vendor = await vendorRepo.findById(vendorId);
    if (!vendor) throw err('Vendor not found', 404);
  }

  const resolvedVendorId = vendor._id || vendor.id;
  const sites = await repo.findSitesByVendorId(resolvedVendorId);
  const siteIds = sites.map(s => s._id || s.id);
  const sessionStats = await repo.getVendorSessionStats(siteIds);

  const totalCapacity = sites.reduce((sum, s) => sum + (s.totalCapacity || 0), 0);
  const totalOccupied = sites.reduce((sum, s) => sum + (s.occupied || 0), 0);
  const totalAllottedSlots = sites.reduce((sum, s) => sum + (s.allotted_slots || 0), 0);
  const primarySiteId = vendor.assignedSiteId ?? vendor.assigned_site_id;
  const primarySite = primarySiteId
    ? sites.find(s => (s._id || s.id) === primarySiteId) || await repo.findSiteById(primarySiteId)
    : null;

  return {
    data: {
      vendor:      formatVendorSummary(vendor),
      primarySite: primarySite ? formatSite(primarySite) : null,
      sites:       sites.map(formatSite),
      stats: {
        totalSites:         sites.length,
        totalCapacity,
        currentlyOccupied:  totalOccupied,
        availableSlots:     Math.max(0, totalCapacity - totalOccupied),
        totalAllottedSlots,
        activeSessions:     sessionStats.activeSessions,
        todayEntries:       sessionStats.todayEntries,
        todayExits:         sessionStats.todayExits,
      },
    },
    success: true,
  };
};

module.exports = { listSites, createSite, updateSite, deleteSite, getStats, processRecharge, getRecentRecharges, getSiteDropdown, getVendorParkingDetails };
