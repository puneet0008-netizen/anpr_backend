const DeviceToken = require('../models/deviceTokens.model');
const { v4: uuidv4 } = require('uuid');

const upsert = async ({ userId, token, platform, deviceId }) => {
  const doc = await DeviceToken.findOneAndUpdate(
    { userId, token },
    {
      $set: {
        platform: platform || 'android',
        deviceId: deviceId || null,
      },
      $setOnInsert: { _id: uuidv4(), userId, token },
    },
    { upsert: true, new: true }
  ).lean();
  return doc;
};

const removeToken = async (userId, token) => {
  await DeviceToken.deleteOne({ userId, token });
};

const findByUser = async (userId) => {
  return DeviceToken.find({ userId }).lean();
};

module.exports = { upsert, removeToken, findByUser };
