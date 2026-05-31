const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const accountRepo = require('../repositories/account.repository');
const { encrypt, decrypt, hmac } = require('../utils/encryption');
const { buildMeta }              = require('../utils/pagination');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');

const SALT_ROUNDS = 12;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip encryption – expose plain values for API responses */
const formatAccount = (row) => {
  if (!row) return null;
  return {
    id:        row.id,
    username:  decrypt(row.username_encrypted),
    phone:     decrypt(row.phone_encrypted),
    role:      row.role,
    isActive:  row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// ─── Create ──────────────────────────────────────────────────────────────────

const createVendor = async ({ username, password, phone }, creatorId) => {
  const usernameHash = hmac(username);

  const exists = await accountRepo.existsByUsernameHash(usernameHash);
  if (exists) throw Object.assign(new Error('Username already taken'), { statusCode: 409 });

  const roleId       = await accountRepo.getRoleId('vendor');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const vendor = await accountRepo.create({
    id:                uuidv4(),
    roleId,
    usernameEncrypted: encrypt(username),
    usernameHash,
    passwordHash,
    phoneEncrypted:    encrypt(phone),
    phoneHash:         hmac(phone),
    createdBy:         creatorId,
  });

  await cacheDelPattern('vendors:*');
  return vendor;
};

// ─── Read ────────────────────────────────────────────────────────────────────

const getVendorById = async (id) => {
  const cacheKey = `vendor:${id}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return cached;

  const row = await accountRepo.findById(id);
  if (!row || row.role !== 'vendor') {
    throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });
  }

  const result = formatAccount(row);
  await cacheSet(cacheKey, result, 300);
  return result;
};

const listVendors = async ({ page, limit, offset, sortBy, sortOrder, isActive }) => {
  const cacheKey = `vendors:${page}:${limit}:${sortBy}:${sortOrder}:${isActive}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return cached;

  const { rows, total } = await accountRepo.findAll({
    role:      'vendor',
    isActive:  isActive !== undefined ? isActive : null,
    limit,
    offset,
    sortBy,
    sortOrder,
  });

  const result = {
    data: rows.map(formatAccount),
    meta: buildMeta(total, page, limit),
  };

  await cacheSet(cacheKey, result, 60);
  return result;
};

// ─── Update ──────────────────────────────────────────────────────────────────

const updateVendor = async (id, { password, phone, is_active }) => {
  const row = await accountRepo.findById(id);
  if (!row || row.role !== 'vendor') {
    throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });
  }

  const fields = {};
  if (password !== undefined) {
    fields.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  }
  if (phone !== undefined) {
    fields.phone_encrypted = encrypt(phone);
    fields.phone_hash      = hmac(phone);
  }
  if (is_active !== undefined) {
    fields.is_active = is_active;
  }

  await accountRepo.updateById(id, fields);
  await cacheDel(`vendor:${id}`);
  await cacheDelPattern('vendors:*');

  return getVendorById(id);
};

// ─── Deactivate ───────────────────────────────────────────────────────────────

const deactivateVendor = async (id) => {
  const row = await accountRepo.findById(id);
  if (!row || row.role !== 'vendor') {
    throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });
  }
  await accountRepo.deactivateById(id);
  await cacheDel(`vendor:${id}`);
  await cacheDelPattern('vendors:*');
};

module.exports = { createVendor, getVendorById, listVendors, updateVendor, deactivateVendor };
