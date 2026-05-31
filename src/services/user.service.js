const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const accountRepo = require('../repositories/account.repository');
const carRepo     = require('../repositories/car.repository');
const { encrypt, decrypt, hmac } = require('../utils/encryption');
const { buildMeta }              = require('../utils/pagination');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');

const SALT_ROUNDS = 12;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatUser = (accountRow, carRow) => {
  if (!accountRow) return null;
  return {
    id:        accountRow.id,
    username:  decrypt(accountRow.username_encrypted),
    phone:     decrypt(accountRow.phone_encrypted),
    role:      accountRow.role,
    isActive:  accountRow.is_active,
    createdBy: accountRow.created_by,
    createdAt: accountRow.created_at,
    updatedAt: accountRow.updated_at,
    car: carRow
      ? {
          id:        carRow.id,
          carNumber: decrypt(carRow.car_number_encrypted),
          carModel:  carRow.car_model,
          carName:   carRow.car_name,
        }
      : null,
  };
};

// ─── Create ──────────────────────────────────────────────────────────────────

const createUser = async (
  { username, password, phone, carNumber, carModel, carName },
  creatorId
) => {
  const usernameHash = hmac(username);
  const carNumberHash = hmac(carNumber.toUpperCase());

  const [userExists, carExists] = await Promise.all([
    accountRepo.existsByUsernameHash(usernameHash),
    carRepo.existsByCarNumberHash(carNumberHash),
  ]);

  if (userExists) throw Object.assign(new Error('Username already taken'),  { statusCode: 409 });
  if (carExists)  throw Object.assign(new Error('Car number already registered'), { statusCode: 409 });

  const roleId       = await accountRepo.getRoleId('user');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const accountId    = uuidv4();

  await accountRepo.create({
    id:                accountId,
    roleId,
    usernameEncrypted: encrypt(username),
    usernameHash,
    passwordHash,
    phoneEncrypted:    encrypt(phone),
    phoneHash:         hmac(phone),
    createdBy:         creatorId,
  });

  await carRepo.create({
    id:                 uuidv4(),
    accountId,
    carNumberEncrypted: encrypt(carNumber.toUpperCase()),
    carNumberHash,
    carModel,
    carName,
  });

  await cacheDelPattern('users:*');
  return { id: accountId };
};

// ─── Read ─────────────────────────────────────────────────────────────────────

const getUserById = async (id) => {
  const cacheKey = `user:${id}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return cached;

  const [account, car] = await Promise.all([
    accountRepo.findById(id),
    carRepo.findByAccountId(id),
  ]);

  if (!account || account.role !== 'user') {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const result = formatUser(account, car);
  await cacheSet(cacheKey, result, 300);
  return result;
};

const listUsers = async ({
  page, limit, offset, sortBy, sortOrder, isActive, createdBy = null,
}) => {
  const cacheKey = `users:${page}:${limit}:${sortBy}:${sortOrder}:${isActive}:${createdBy}`;
  const cached   = await cacheGet(cacheKey);
  if (cached) return cached;

  const { rows, total } = await accountRepo.findAll({
    role:      'user',
    createdBy: createdBy || null,
    isActive:  isActive !== undefined ? isActive : null,
    limit,
    offset,
    sortBy,
    sortOrder,
  });

  // Fetch car details for each user in parallel
  const accountIds = rows.map((r) => r.id);
  const carResults = await Promise.all(accountIds.map((id) => carRepo.findByAccountId(id)));
  const carMap     = Object.fromEntries(accountIds.map((id, i) => [id, carResults[i]]));

  const result = {
    data: rows.map((r) => formatUser(r, carMap[r.id])),
    meta: buildMeta(total, page, limit),
  };

  await cacheSet(cacheKey, result, 60);
  return result;
};

// ─── Update ──────────────────────────────────────────────────────────────────

const updateUser = async (id, { password, phone, carModel, carName, is_active }) => {
  const account = await accountRepo.findById(id);
  if (!account || account.role !== 'user') {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const accountFields = {};
  if (password  !== undefined) accountFields.password_hash   = await bcrypt.hash(password, SALT_ROUNDS);
  if (phone     !== undefined) { accountFields.phone_encrypted = encrypt(phone); accountFields.phone_hash = hmac(phone); }
  if (is_active !== undefined) accountFields.is_active = is_active;

  const carFields = {};
  if (carModel !== undefined) carFields.car_model = carModel;
  if (carName  !== undefined) carFields.car_name  = carName;

  await Promise.all([
    Object.keys(accountFields).length ? accountRepo.updateById(id, accountFields) : Promise.resolve(),
    Object.keys(carFields).length     ? carRepo.updateByAccountId(id, carFields)  : Promise.resolve(),
  ]);

  await cacheDel(`user:${id}`);
  await cacheDelPattern('users:*');

  return getUserById(id);
};

// ─── Deactivate ───────────────────────────────────────────────────────────────

const deactivateUser = async (id) => {
  const account = await accountRepo.findById(id);
  if (!account || account.role !== 'user') {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  await accountRepo.deactivateById(id);
  await cacheDel(`user:${id}`);
  await cacheDelPattern('users:*');
};

// ─── ANPR Lookup ─────────────────────────────────────────────────────────────

const lookupByCarNumber = async (carNumber) => {
  const carNumberHash = hmac(carNumber.toUpperCase());
  const car = await carRepo.findByCarNumberHash(carNumberHash);
  if (!car) throw Object.assign(new Error('Car not found'), { statusCode: 404 });

  const account = await accountRepo.findById(car.account_id);
  return formatUser(account, car);
};

module.exports = {
  createUser,
  getUserById,
  listUsers,
  updateUser,
  deactivateUser,
  lookupByCarNumber,
};
