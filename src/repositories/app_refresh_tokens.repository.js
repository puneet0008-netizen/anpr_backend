const AppRefreshToken = require('../models/appRefreshTokens.model');
const { v4: uuidv4 } = require('uuid');

const create = async ({ userId, tokenHash, expiresAt, ip, userAgent }) => {
  const doc = new AppRefreshToken({
    _id:       uuidv4(),
    userId,
    tokenHash,
    expiresAt,
    ipAddress: ip || null,
    userAgent: userAgent || null,
  });
  await doc.save();
};

const findValid = async (tokenHash) => {
  return AppRefreshToken.findOne({
    tokenHash,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).lean();
};

const revoke = async (tokenHash) => {
  await AppRefreshToken.updateOne({ tokenHash }, { $set: { isRevoked: true } });
};

const revokeAll = async (userId) => {
  await AppRefreshToken.updateMany({ userId }, { $set: { isRevoked: true } });
};

module.exports = { create, findValid, revoke, revokeAll };
