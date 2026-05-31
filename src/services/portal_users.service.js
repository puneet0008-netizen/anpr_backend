const bcrypt = require('bcryptjs');
const repo   = require('../repositories/portal_users.repository');
const { parsePagination, buildMeta } = require('../utils/pagination');

const SALT_ROUNDS = 12;
const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code });

const format = (row) => row ? {
  id:          row.id,
  name:        row.name,
  email:       row.email,
  role:        row.role,
  accessLevel: row.access_level,
  status:      row.status,
  lastLogin:   row.last_login_at,
  createdAt:   row.created_at,
} : null;

const listUsers = async (query) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(query);
  const { rows, total } = await repo.findAll({ search, status: query.status, limit, offset, sortBy, sortOrder });
  return { data: rows.map(format), meta: buildMeta(total, page, limit), success: true };
};

const createUser = async (d) => {
  if (await repo.findByEmail(d.email)) throw err('Email already registered', 409);
  const passwordHash = await bcrypt.hash(d.tempPassword, SALT_ROUNDS);
  const row = await repo.create({ name: d.name, email: d.email, passwordHash, role: d.role, accessLevel: d.accessLevel });
  return { data: format(row), success: true };
};

const updateUser = async (id, d) => {
  const existing = await repo.findById(id);
  if (!existing) throw err('User not found', 404);
  if (d.email && d.email !== existing.email && await repo.findByEmail(d.email)) throw err('Email already in use', 409);

  const updates = { name: d.name, email: d.email, role: d.role, accessLevel: d.accessLevel };
  if (d.password) updates.passwordHash = await bcrypt.hash(d.password, SALT_ROUNDS);
  if (d.status)   updates.status = d.status;

  const row = await repo.updateById(id, updates);
  return { data: format(row), success: true };
};

const toggleStatus = async (id, status) => {
  if (!await repo.findById(id)) throw err('User not found', 404);
  const row = await repo.updateById(id, { status });
  return { data: format(row), success: true };
};

const deleteUser = async (id) => {
  if (!await repo.findById(id)) throw err('User not found', 404);
  await repo.deleteById(id);
};

module.exports = { listUsers, createUser, updateUser, toggleStatus, deleteUser };
