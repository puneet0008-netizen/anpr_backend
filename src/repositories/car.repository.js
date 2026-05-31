/**
 * Car Details repository — Mongoose.
 */
const CarDetail = require('../models/carDetails.model');
const { v4: uuidv4 } = require('uuid');

const findByAccountId = async (accountId) => {
  return CarDetail.findOne({ accountId }).lean();
};

const findByCarNumberHash = async (carNumberHash) => {
  return CarDetail.findOne({ carNumberHash }).lean();
};

const create = async ({
  id,
  accountId,
  carNumberEncrypted,
  carNumberHash,
  carModel,
  carName,
}) => {
  const doc = new CarDetail({
    _id: id || uuidv4(),
    accountId,
    carNumberEncrypted,
    carNumberHash,
    carModel,
    carName,
  });
  await doc.save();
  return { _id: doc._id };
};

const updateByAccountId = async (accountId, fields) => {
  const allowed = { carModel: 1, carName: 1, carNumberEncrypted: 1, carNumberHash: 1 };
  const update  = {};
  for (const [key, val] of Object.entries(fields)) {
    if (allowed[key]) update[key] = val;
  }
  if (!Object.keys(update).length) return null;
  const doc = await CarDetail.findOneAndUpdate(
    { accountId },
    { $set: update },
    { new: true }
  ).lean();
  return doc ? { _id: doc._id } : null;
};

const existsByCarNumberHash = async (carNumberHash, excludeAccountId = null) => {
  const filter = { carNumberHash };
  if (excludeAccountId) filter.accountId = { $ne: excludeAccountId };
  const count = await CarDetail.countDocuments(filter);
  return count > 0;
};

module.exports = {
  findByAccountId,
  findByCarNumberHash,
  create,
  updateByAccountId,
  existsByCarNumberHash,
};
