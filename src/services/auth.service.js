const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const accountRepo = require('../repositories/account.repository');
const tokenRepo   = require('../repositories/token.repository');
const { encrypt, decrypt, hmac } = require('../utils/encryption');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} = require('../utils/jwt');

// ─── Login ───────────────────────────────────────────────────────────────────

const login = async ({ username, password, ipAddress, userAgent }) => {
  const usernameHash = hmac(username);
  const account      = await accountRepo.findByUsernameHash(usernameHash);

  if (!account) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  if (!account.isActive) throw Object.assign(new Error('Account is deactivated'), { statusCode: 403 });

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const payload      = { id: account._id, role: account.role };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await tokenRepo.save({
    accountId:  account._id,
    tokenHash:  hashRefreshToken(refreshToken),
    expiresAt:  refreshTokenExpiresAt(),
    ipAddress,
    userAgent,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    role:      account.role,
    id:        account._id,
  };
};

// ─── Refresh ─────────────────────────────────────────────────────────────────

const refreshTokens = async ({ refreshToken, ipAddress, userAgent }) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  const tokenHash   = hashRefreshToken(refreshToken);
  const storedToken = await tokenRepo.findByHash(tokenHash);

  if (!storedToken) {
    throw Object.assign(new Error('Refresh token not found or revoked'), { statusCode: 401 });
  }

  // Rotate: revoke old, issue new pair
  await tokenRepo.revokeByHash(tokenHash);

  const account = await accountRepo.findById(decoded.id);
  if (!account || !account.isActive) {
    throw Object.assign(new Error('Account not found or inactive'), { statusCode: 401 });
  }

  const payload         = { id: account._id, role: account.role };
  const newAccessToken  = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  await tokenRepo.save({
    accountId:  account._id,
    tokenHash:  hashRefreshToken(newRefreshToken),
    expiresAt:  refreshTokenExpiresAt(),
    ipAddress,
    userAgent,
  });

  return {
    accessToken:  newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn:    process.env.JWT_EXPIRES_IN || '1h',
  };
};

// ─── Logout ──────────────────────────────────────────────────────────────────

const logout = async (refreshToken) => {
  if (!refreshToken) return;
  const tokenHash = hashRefreshToken(refreshToken);
  await tokenRepo.revokeByHash(tokenHash);
};

const logoutAll = async (accountId) => {
  await tokenRepo.revokeAllForAccount(accountId);
};

module.exports = { login, refreshTokens, logout, logoutAll };
