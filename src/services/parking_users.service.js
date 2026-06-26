const bcrypt      = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const repo        = require('../repositories/parking_users.repository');
const walletRepo  = require('../repositories/wallet.repository');
const vehiclesRepo = require('../repositories/app_vehicles.repository');
const sessionsRepo = require('../repositories/parking_sessions.repository');
const visitorsRepo = require('../repositories/visitors.repository');
const { parsePagination, buildMeta } = require('../utils/pagination');

const SALT_ROUNDS = 12;
const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code });

const formatUser = (row) => row ? {
  id:             row.id || row._id,
  type:           row.type,
  name:           row.name,
  email:          row.email,
  phone:          row.phone,
  vehicleNumber:  row.vehicleNumber ?? row.vehicle_number,
  vendorId:       row.vendorId ?? row.vendor_id,
  vendorName:     row.vendor_name || null,
  assignedSiteId:   row.assignedSiteId ?? row.assigned_site_id,
  assignedSiteName: row.assigned_site_name || null,
  slotNumber:       row.slotNumber ?? row.slot_number,
  allottedSlots:  row.allottedSlots ?? row.allotted_slots ?? 1,
  profilePhoto:   row.profilePhoto ?? row.profile_photo,
  status:         row.status,
  walletBalance:  parseFloat(row.wallet_balance ?? row.walletBalance) || 0,
  totalRecharges: parseFloat(row.total_recharges ?? row.totalRecharges) || 0,
  lastRecharge:   row.last_recharge ?? row.lastRecharge,
  joinedAt:       row.joinedAt ?? row.joined_at,
  updatedAt:      row.updatedAt ?? row.updated_at,
} : null;

const formatVehicle = (row) => row ? {
  id:           row.id || row._id,
  userId:       row.userId ?? row.user_id,
  numberPlate:  row.numberPlate ?? row.number_plate,
  vehicleType:  row.vehicleType ?? row.vehicle_type,
  vehicleName:  row.vehicleName ?? row.vehicle_name,
  vehicleModel: row.vehicleModel ?? row.vehicle_model,
  isPrimary:    row.isPrimary ?? row.is_primary,
  status:       row.status,
  createdAt:    row.createdAt ?? row.created_at,
} : null;

const listUsers = async (type, query) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(query);
  const { rows, total } = await repo.findAll({ type, search, status: query.status, limit, offset, sortBy, sortOrder });
  return { data: rows.map(formatUser), meta: buildMeta(total, page, limit), success: true };
};

const getUserById = async (id) => {
  const row = await repo.findById(id);
  if (!row) throw err('User not found', 404);
  return { data: formatUser(row), success: true };
};

const searchUsers = async (q) => {
  if (!q || q.length < 2) return { data: [], success: true };
  const rows = await repo.search(q);
  return { data: rows, success: true };
};

const createUser = async (type, d) => {
  if (await repo.findByEmail(d.email)) throw err('Email already registered', 409);

  const vehicleNumber = d.vehicleNumber || d.numberPlate || null;
  if (vehicleNumber && await repo.findByVehicle(vehicleNumber)) throw err('Vehicle number already registered', 409);

  const passwordHash = await bcrypt.hash(d.password, SALT_ROUNDS);
  const vendorId = d.vendorId || null;
  const assignedSiteId = d.assignedSiteId  || null;
  const slotNumber     = d.slotNumber      || null;
  const allottedSlots  = d.allottedSlots   || 1;
  const user = await repo.create({ type, name: d.name, email: d.email, phone: d.phone, vehicleNumber, passwordHash, vendorId, assignedSiteId, slotNumber, allottedSlots });

  if (type === 'app') await repo.createWallet(user._id);

  if (d.numberPlate) {
    await repo.addVehicle(user._id, {
      numberPlate:  d.numberPlate,
      vehicleType:  d.vehicleType  || 'four_wheeler',
      vehicleName:  d.vehicleName  || `${d.name}'s vehicle`,
      vehicleModel: d.vehicleModel || 'N/A',
    });
  }

  const row = await repo.findById(user._id);
  return { data: formatUser(row), success: true };
};

const updateUser = async (id, d) => {
  const existing = await repo.findById(id);
  if (!existing) throw err('User not found', 404);

  if (d.email && d.email !== existing.email) {
    if (await repo.findByEmail(d.email)) throw err('Email already in use', 409);
  }
  if (d.vehicleNumber && d.vehicleNumber !== existing.vehicle_number) {
    if (await repo.findByVehicle(d.vehicleNumber)) throw err('Vehicle already registered', 409);
  }

  const updates = { name: d.name, email: d.email, phone: d.phone, vehicleNumber: d.vehicleNumber, status: d.status, profilePhoto: d.profilePhoto, allottedSlots: d.allottedSlots, assignedSiteId: d.assignedSiteId !== undefined ? (d.assignedSiteId || null) : undefined };
  if (d.password) updates.passwordHash = await bcrypt.hash(d.password, SALT_ROUNDS);

  const row = await repo.updateById(id, updates);
  return { data: formatUser(row), success: true };
};

const deleteUser = async (id) => {
  if (!await repo.findById(id)) throw err('User not found', 404);
  await repo.deleteById(id);
};

// ─── Admin: recharge wallet ──────────────────────────────────────────────────

const rechargeWallet = async (id, { amount, paymentMethod, transactionRef }) => {
  const user = await repo.findById(id);
  if (!user) throw err('User not found', 404);
  if (user.type !== 'app') throw err('Only app users have wallets', 400);

  if (!amount || amount <= 0) throw err('Amount must be positive', 400);
  const ref = transactionRef || `ADM-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;

  await walletRepo.recharge(id, amount, paymentMethod || 'Cash', ref);
  const updated = await repo.findById(id);
  return { data: formatUser(updated), success: true };
};

// ─── Admin: app user detail ───────────────────────────────────────────────────

const getAppUserDetail = async (id) => {
  const row = await repo.findById(id);
  if (!row) throw err('User not found', 404);
  if (row.type !== 'app') throw err('Not an app user', 400);

  const [wallet, vehicles, recentSessions, rechargeHistory, visitors] = await Promise.all([
    walletRepo.findByUser(id),
    vehiclesRepo.findByUser(id),
    sessionsRepo.findByUser(id, { limit: 10 }),
    walletRepo.getRechargeHistory(id, { limit: 10 }),
    visitorsRepo.findByUser(id, { limit: 10 }),
  ]);

  return {
    data: {
      ...formatUser(row),
      wallet: {
        balance:        parseFloat(wallet?.balance) || 0,
        totalRecharges: parseFloat(wallet?.total_recharges) || 0,
        lastRechargeAt: wallet?.last_recharge_at || null,
      },
      vehicles: vehicles.map(formatVehicle),
      recentSessions: recentSessions.map((s) => ({
        id:              s._id || s.id,
        numberPlate:     s.numberPlate ?? s.number_plate,
        vehicleName:     s.vehicleName ?? s.vehicle_name,
        entryTime:       s.entryTime ?? s.entry_time,
        exitTime:        s.exitTime ?? s.exit_time ?? null,
        status:          s.status ?? ((s.exitTime || s.exit_time) ? 'completed' : 'active'),
        durationMinutes: s.duration_minutes_calc != null ? Math.round(Number(s.duration_minutes_calc)) : null,
      })),
      rechargeHistory,
      visitors,
    },
    success: true,
  };
};

const setPrimaryVehicle = async (userId, vehicleId) => {
  const user = await repo.findById(userId);
  if (!user) throw err('User not found', 404);
  await vehiclesRepo.setPrimary(userId, vehicleId);
  // Sync vehicle_number on the user row to reflect the new primary
  const newPrimary = await vehiclesRepo.findById(vehicleId);
  if (newPrimary) await repo.updateById(userId, { vehicleNumber: newPrimary.number_plate });
  const vehicles = await vehiclesRepo.findByUser(userId);
  return { data: vehicles.map(formatVehicle), success: true };
};

const listUserVehicles = async (userId) => {
  const user = await repo.findById(userId);
  if (!user) throw err('User not found', 404);
  const vehicles = await repo.listVehicles(userId);
  return { data: vehicles.map(formatVehicle), success: true };
};

const addUserVehicle = async (userId, d) => {
  const user = await repo.findById(userId);
  if (!user) throw err('User not found', 404);
  const vehicle = await repo.addVehicle(userId, d);
  // If this became the primary vehicle (first one added), sync vehicle_number on the user row
  if (vehicle.is_primary) {
    await repo.updateById(userId, { vehicleNumber: vehicle.number_plate });
  }
  return { data: formatVehicle(vehicle), success: true };
};

const updateUserVehicle = async (userId, vehicleId, d) => {
  const user = await repo.findById(userId);
  if (!user) throw err('User not found', 404);
  const vehicle = await repo.updateVehicle(vehicleId, userId, d);
  if (!vehicle) throw err('Vehicle not found', 404);
  return { data: formatVehicle(vehicle), success: true };
};

const removeUserVehicle = async (userId, vehicleId) => {
  const user = await repo.findById(userId);
  if (!user) throw err('User not found', 404);
  await repo.removeVehicle(vehicleId, userId);
  // After removal, sync vehicle_number to the new primary (or clear if none left)
  const remaining = await vehiclesRepo.findByUser(userId);
  const primary = remaining.find(v => v.is_primary);
  await repo.updateById(userId, { vehicleNumber: primary ? primary.number_plate : null });
};

module.exports = { listUsers, getUserById, searchUsers, createUser, updateUser, deleteUser, rechargeWallet, getAppUserDetail, listUserVehicles, addUserVehicle, updateUserVehicle, removeUserVehicle, setPrimaryVehicle };
