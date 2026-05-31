/**
 * Encryption utilities
 *
 * - encrypt / decrypt  → AES-256-CBC (reversible, for PII storage)
 * - hmac               → HMAC-SHA256 (deterministic, for indexed lookups)
 *
 * ENCRYPTION_KEY must be a 64-char hex string (32 bytes).
 * ENCRYPTION_IV  must be a 32-char hex string (16 bytes).
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

const getKey = () => {
  const k = process.env.ENCRYPTION_KEY;
  if (!k || k.length !== 64) throw new Error('ENCRYPTION_KEY must be a 64-char hex string');
  return Buffer.from(k, 'hex');
};

const getIV = () => {
  const iv = process.env.ENCRYPTION_IV;
  if (!iv || iv.length !== 32) throw new Error('ENCRYPTION_IV must be a 32-char hex string');
  return Buffer.from(iv, 'hex');
};

const getHmacSecret = () => {
  const s = process.env.ENCRYPTION_KEY;
  if (!s) throw new Error('ENCRYPTION_KEY not set');
  return s;
};

/**
 * Encrypt plaintext → "iv:ciphertext" (both hex).
 * A fresh random IV is generated per call so identical plaintexts
 * produce different ciphertexts (but hmac() stays deterministic).
 */
const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined) return null;
  const iv     = crypto.randomBytes(16);           // fresh IV every time
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const enc    = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${enc.toString('hex')}`;
};

/**
 * Decrypt "iv:ciphertext" → plaintext string.
 */
const decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  const [ivHex, dataHex] = ciphertext.split(':');
  if (!ivHex || !dataHex) throw new Error('Invalid ciphertext format');
  const iv       = Buffer.from(ivHex,  'hex');
  const data     = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

/**
 * HMAC-SHA256 of a value – used as a deterministic lookup index.
 * Always lower-cases input so lookups are case-insensitive.
 */
const hmac = (value) => {
  if (value === null || value === undefined) return null;
  return crypto
    .createHmac('sha256', getHmacSecret())
    .update(String(value).toLowerCase())
    .digest('hex');
};

module.exports = { encrypt, decrypt, hmac };
