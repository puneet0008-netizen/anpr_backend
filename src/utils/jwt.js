const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET  = () => process.env.JWT_SECRET          || 'changeme_access';
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET  || 'changeme_refresh';
const ACCESS_EXP     = () => process.env.JWT_EXPIRES_IN      || '1h';
const REFRESH_EXP    = () => process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Sign an access token.
 * @param {object} payload  { id, role }
 */
const signAccessToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET(), { expiresIn: ACCESS_EXP(), algorithm: 'HS256' });

/**
 * Sign a refresh token.
 */
const signRefreshToken = (payload) =>
  jwt.sign(payload, REFRESH_SECRET(), { expiresIn: REFRESH_EXP(), algorithm: 'HS256' });

/**
 * Verify an access token – throws on invalid/expired.
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, ACCESS_SECRET(), { algorithms: ['HS256'] });

/**
 * Verify a refresh token – throws on invalid/expired.
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, REFRESH_SECRET(), { algorithms: ['HS256'] });

/**
 * SHA-256 hash of a raw refresh token string (for DB storage).
 */
const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Calculate the Date when a refresh token expires (for DB row).
 */
const refreshTokenExpiresAt = () => {
  const exp = REFRESH_EXP();
  const ms  = exp.endsWith('d')
    ? parseInt(exp) * 86400 * 1000
    : exp.endsWith('h')
      ? parseInt(exp) * 3600 * 1000
      : 7 * 86400 * 1000;
  return new Date(Date.now() + ms);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
};
