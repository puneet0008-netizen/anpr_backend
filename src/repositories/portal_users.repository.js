const PortalUser = require('../models/portalUsers.model');
const { v4: uuidv4 } = require('uuid');

const findAll = async ({ search, status, limit, offset, sortBy = 'createdAt', sortOrder = 'DESC' }) => {
  const filter = {};
  if (search) filter.$or = [
    { name:  new RegExp(search, 'i') },
    { email: new RegExp(search, 'i') },
  ];
  if (status) filter.status = status;

  const allowedSort = ['name', 'createdAt', 'role', 'status'];
  const col         = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const sortDir     = sortOrder === 'ASC' ? 1 : -1;

  const [docs, total] = await Promise.all([
    PortalUser.find(filter, { passwordHash: 0 })
      .sort({ [col]: sortDir })
      .skip(offset)
      .limit(limit)
      .lean(),
    PortalUser.countDocuments(filter),
  ]);

  return { rows: docs, total };
};

const findById = async (id) => {
  return PortalUser.findById(id, { passwordHash: 0 }).lean();
};

const findByEmail = async (email) => {
  return PortalUser.findOne({ email }).lean();
};

const create = async (d) => {
  const doc = new PortalUser({
    _id:          uuidv4(),
    name:         d.name,
    email:        d.email,
    passwordHash: d.passwordHash,
    role:         d.role,
    accessLevel:  d.accessLevel,
    status:       'active',
  });
  await doc.save();
  // Return without passwordHash
  const obj = doc.toObject();
  delete obj.passwordHash;
  return obj;
};

const updateById = async (id, d) => {
  const map = {
    name: 'name', email: 'email', role: 'role', accessLevel: 'accessLevel',
    status: 'status', passwordHash: 'passwordHash', lastLoginAt: 'lastLoginAt',
  };
  const update = {};
  for (const [key, field] of Object.entries(map)) {
    if (d[key] !== undefined) update[field] = d[key];
  }
  if (!Object.keys(update).length) return findById(id);
  await PortalUser.findByIdAndUpdate(id, { $set: update });
  return findById(id);
};

const deleteById = async (id) => {
  await PortalUser.findByIdAndDelete(id);
};

module.exports = { findAll, findById, findByEmail, create, updateById, deleteById };
