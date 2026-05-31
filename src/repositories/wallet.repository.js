const ParkingWallet   = require('../models/parkingWallets.model');
const ParkingRecharge = require('../models/parkingRecharges.model');
const { v4: uuidv4 } = require('uuid');

const findByUser = async (userId) => {
  return ParkingWallet.findOne({ userId }).lean();
};

const recharge = async (userId, amount, paymentMethod, transactionRef) => {
  // Insert recharge record
  const doc = new ParkingRecharge({
    _id:            uuidv4(),
    userId,
    amount,
    paymentMethod,
    transactionRef,
  });
  await doc.save();

  // Update wallet balance
  await ParkingWallet.findOneAndUpdate(
    { userId },
    {
      $inc: { balance: amount, totalRecharges: amount },
      $set: { lastRechargeAt: new Date(), updatedAt: new Date() },
    }
  );

  return doc.toObject();
};

const getRechargeHistory = async (userId, { limit = 20, offset = 0 } = {}) => {
  return ParkingRecharge.find({ userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
};

module.exports = { findByUser, recharge, getRechargeHistory };
