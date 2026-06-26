const bcrypt       = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const repo         = require('../repositories/vendors.repository');
const parkingRepo  = require('../repositories/parking.repository');
const accountRepo  = require('../repositories/account.repository');
const { encrypt, hmac } = require('../utils/encryption');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');

const SALT_ROUNDS = 12;

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code });

const formatVendor = (row) => row ? {
  id:                  row.id || row._id,
  vendorName:          row.vendorName ?? row.vendor_name,
  contactPerson:       row.contactPerson ?? row.contact_person,
  phone:               row.phone,
  email:               row.email,
  city:                row.city,
  state:               row.state,
  gstin:               row.gstin,
  registeredAddress:   row.registeredAddress ?? row.registered_address,
  primaryService:      row.primaryService ?? row.primary_service,
  contractStartDate:   row.contractStartDate ?? row.contract_start_date,
  notes:               row.notes,
  status:              row.status,
  lastOrderDate:       row.lastOrderDate ?? row.last_order_date,
  itemsCount:          parseInt(row.items_count ?? row.itemsCount) || 0,
  contractsCount:      parseInt(row.contracts_count ?? row.contractsCount) || 0,
  assignedSiteId:      row.assignedSiteId ?? row.assigned_site_id,
  assignedSiteName:    row.assigned_site_name ?? row.assignedSiteName ?? null,
  assignedParkingSites: row.assigned_parking_sites ?? row.assignedParkingSites ?? [],
  cameraIds:           [],
  contractDocuments:   [],
  createdAt:           row.createdAt ?? row.created_at,
  updatedAt:           row.updatedAt ?? row.updated_at,
} : null;

const CACHE_VERSION = 'v2';

const listVendors = async (query) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(query);
  const cacheKey = `vendors:list:${CACHE_VERSION}:${JSON.stringify({ page, limit, sortBy, sortOrder, search, status: query.status })}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const { rows, total } = await repo.findAll({ search, status: query.status, limit, offset, sortBy, sortOrder });
  const result = { data: rows.map(formatVendor), meta: buildMeta(total, page, limit), success: true };
  await cacheSet(cacheKey, result, 60);
  return result;
};

const getVendorById = async (id) => {
  const cacheKey = `vendor:${CACHE_VERSION}:${id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;
  const row = await repo.findById(id);
  if (!row) throw err('Vendor not found', 404);
  const result = { data: formatVendor(row), success: true };
  await cacheSet(cacheKey, result, 300);
  return result;
};

const getVendorDropdown = async () => {
  const cacheKey = `vendors:dropdown:${CACHE_VERSION}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;
  const rows = await repo.findDropdown();
  const result = { data: rows.map(r => ({
    id: r.id || r._id,
    vendorName: r.vendorName ?? r.vendor_name,
    assignedSiteId: r.assignedSiteId ?? r.assigned_site_id,
    assignedSiteName: r.assigned_site_name ?? r.assignedSiteName ?? null,
  })), success: true };
  await cacheSet(cacheKey, result, 120);
  return result;
};

const createVendor = async (d, creatorId) => {
  if (await repo.existsByGstin(d.gstin)) throw err('GSTIN already registered', 409);
  if (d.assignedSiteId === '') d.assignedSiteId = null;

  // ── Create login account for the vendor ────────────────────────────────────
  const username     = d.email;                      // use email as login username
  const usernameHash = hmac(username);
  if (await accountRepo.existsByUsernameHash(usernameHash)) throw err('Email already registered as an account', 409);

  const roleId       = await accountRepo.getRoleId('vendor');
  const passwordHash = await bcrypt.hash(d.password, SALT_ROUNDS);

  const account = await accountRepo.create({
    id:                uuidv4(),
    roleId,
    usernameEncrypted: encrypt(username),
    usernameHash,
    passwordHash,
    phoneEncrypted:    encrypt(d.phone || ''),
    phoneHash:         hmac(d.phone || ''),
    createdBy:         creatorId || null,
  });
  const accountId = account.id;

  const row = await repo.create({ ...d, accountId });
  const rowId = row.id || row._id;
  // Sync: mark the allocated parking site's assigned_vendor_id
  if (d.assignedSiteId) {
    await parkingRepo.updateSiteById(d.assignedSiteId, { assignedVendorId: rowId });
  }
  await cacheDelPattern('vendors:*');
  return { data: formatVendor(row), success: true };
};

const updateVendor = async (id, d) => {
  const existing = await repo.findById(id);
  if (!existing) throw err('Vendor not found', 404);
  if (d.gstin && await repo.existsByGstin(d.gstin, id)) throw err('GSTIN already in use', 409);
  // Normalize empty string to null so UUID column doesn't reject it
  if (d.assignedSiteId === '') d.assignedSiteId = null;

  // If password is being changed and vendor has a linked account, update it
  if (d.password && (existing.accountId ?? existing.account_id)) {
    const passwordHash = await bcrypt.hash(d.password, SALT_ROUNDS);
    await accountRepo.updateById(existing.accountId ?? existing.account_id, { password_hash: passwordHash });
  }

  const row = await repo.updateById(id, d);
  // Bidirectional sync: keep parking_sites.assigned_vendor_id aligned with vendors.assigned_site_id
  if (d.assignedSiteId !== undefined) {
    const oldSiteId = existing.assignedSiteId ?? existing.assigned_site_id;
    const newSiteId = d.assignedSiteId || null;
    if (oldSiteId && oldSiteId !== newSiteId) {
      // Clear the old site's vendor reference
      await parkingRepo.updateSiteById(oldSiteId, { assignedVendorId: null });
    }
    if (newSiteId && newSiteId !== oldSiteId) {
      // Assign the new site to this vendor
      await parkingRepo.updateSiteById(newSiteId, { assignedVendorId: id });
    }
  }
  await cacheDel(`vendor:${CACHE_VERSION}:${id}`);
  await cacheDelPattern('vendors:*');
  return { data: formatVendor(row), success: true };
};

const deactivateVendor = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) throw err('Vendor not found', 404);
  if (existing.status === 'inactive') throw err('Vendor is already inactive', 409);
  const row = await repo.updateById(id, { status: 'inactive' });
  await cacheDel(`vendor:${CACHE_VERSION}:${id}`);
  await cacheDelPattern('vendors:*');
  return { data: formatVendor(row), success: true };
};

const deleteVendor = async (id) => {
  if (!await repo.findById(id)) throw err('Vendor not found', 404);
  await repo.deleteById(id);
  await cacheDel(`vendor:${CACHE_VERSION}:${id}`);
  await cacheDelPattern('vendors:*');
};

module.exports = { listVendors, getVendorById, getVendorDropdown, createVendor, updateVendor, deactivateVendor, deleteVendor };
