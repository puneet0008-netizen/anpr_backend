/**
 * Refresh token repository — Mongoose.
 */
const RefreshToken = require('../models/refreshTokens.model');
const { v4: uuidv4 } = require('uuid');

const save = async ({ accountId, tokenHash, expiresAt, ipAddress, userAgent }) => {
  const doc = new RefreshToken({
    _id:       uuidv4(),
    accountId,
    tokenHash,
    expiresAt,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });
  await doc.save();
};

const findByHash = async (tokenHash) => {
  return RefreshToken.findOne({
    tokenHash,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).lean();
};

const revokeByHash = async (tokenHash) => {
  await RefreshToken.updateOne({ tokenHash }, { $set: { isRevoked: true } });
};

const revokeAllForAccount = async (accountId) => {
  await RefreshToken.updateMany({ accountId }, { $set: { isRevoked: true } });
};

module.exports = { save, findByHash, revokeByHash, revokeAllForAccount };
