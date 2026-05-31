/**
 * Account repository — Mongoose.
 * All encryption/decryption happens in the SERVICE layer; this
 * layer works exclusively with already-encrypted values.
 */
const Account = require('../models/accounts.model');
const Role    = require('../models/roles.model');
const { v4: uuidv4 } = require('uuid');

// ── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns account doc enriched with role name.
 */
const _withRole = async (doc) => {
  if (!doc) return null;
  const role = await Role.findById(doc.roleId).lean();
  const obj  = doc.toObject ? doc.toObject() : { ...doc };
  obj.role = role ? role.name : null;
  return obj;
};

const findById = async (id) => {
  const doc = await Account.findById(id).lean();
  if (!doc) return null;
  const role = await Role.findById(doc.roleId).lean();
  doc.role = role ? role.name : null;
  return doc;
};

const findByUsernameHash = async (usernameHash) => {
  const doc = await Account.findOne({ usernameHash }).lean();
  if (!doc) return null;
  const role = await Role.findById(doc.roleId).lean();
  doc.role = role ? role.name : null;
  return doc;
};

/**
 * List accounts with optional filters and pagination.
 */
const findAll = async ({
  role      = null,
  createdBy = null,
  isActive  = null,
  limit     = 10,
  offset    = 0,
  sortBy    = 'createdAt',
  sortOrder = 'DESC',
} = {}) => {
  // Resolve role name → roleId
  let roleId = null;
  if (role) {
    const roleDoc = await Role.findOne({ name: role }).lean();
    if (!roleDoc) return { rows: [], total: 0 };
    roleId = roleDoc._id;
  }

  const filter = {};
  if (roleId !== null)                          filter.roleId    = roleId;
  if (createdBy)                                filter.createdBy = createdBy;
  if (isActive !== null && isActive !== undefined) filter.isActive = isActive;

  const safeSortBy    = ['createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt';
  const safeSortOrder = sortOrder === 'ASC' ? 1 : -1;

  const [docs, total] = await Promise.all([
    Account.find(filter)
      .sort({ [safeSortBy]: safeSortOrder })
      .skip(offset)
      .limit(limit)
      .lean(),
    Account.countDocuments(filter),
  ]);

  // Enrich with role names
  const roleCache = {};
  const rows = await Promise.all(docs.map(async (doc) => {
    if (!roleCache[doc.roleId]) {
      const r = await Role.findById(doc.roleId).lean();
      roleCache[doc.roleId] = r ? r.name : null;
    }
    doc.role = roleCache[doc.roleId];
    return doc;
  }));

  return { rows, total };
};

// ── Write ─────────────────────────────────────────────────────────────────────

const create = async ({
  id,
  roleId,
  usernameEncrypted,
  usernameHash,
  passwordHash,
  phoneEncrypted,
  phoneHash,
  createdBy = null,
}) => {
  const _id = id || uuidv4();
  const doc = new Account({
    _id,
    roleId,
    usernameEncrypted,
    usernameHash,
    passwordHash,
    phoneEncrypted,
    phoneHash,
    createdBy: createdBy || null,
  });
  await doc.save();
  return { _id: doc._id };
};

const updateById = async (id, fields) => {
  const allowed = { passwordHash: 1, phoneEncrypted: 1, phoneHash: 1, isActive: 1 };
  const update  = {};
  for (const [key, val] of Object.entries(fields)) {
    if (allowed[key]) update[key] = val;
  }
  if (!Object.keys(update).length) return null;
  const doc = await Account.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  return doc ? { _id: doc._id } : null;
};

const deactivateById = async (id) => {
  const doc = await Account.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).lean();
  return doc ? { _id: doc._id } : null;
};

const existsByUsernameHash = async (usernameHash) => {
  const count = await Account.countDocuments({ usernameHash });
  return count > 0;
};

const getRoleId = async (roleName) => {
  const role = await Role.findOne({ name: roleName }).lean();
  return role ? role._id : null;
};

module.exports = {
  findById,
  findByUsernameHash,
  findAll,
  create,
  updateById,
  deactivateById,
  existsByUsernameHash,
  getRoleId,
};
