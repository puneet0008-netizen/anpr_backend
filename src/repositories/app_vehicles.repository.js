const AppVehicle = require('../models/appVehicles.model');
const { v4: uuidv4 } = require('uuid');

const findByUser = async (userId) => {
  return AppVehicle.find({ userId, status: { $ne: 'removed' } })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();
};

const findById = async (id) => {
  return AppVehicle.findById(id).lean();
};

const findByPlate = async (plate, excludeId = null) => {
  const filter = { numberPlate: plate, status: 'active' };
  if (excludeId) filter._id = { $ne: excludeId };
  return AppVehicle.findOne(filter).lean();
};

const countActiveByUser = async (userId) => {
  return AppVehicle.countDocuments({ userId, status: 'active' });
};

const create = async (d) => {
  const count     = await countActiveByUser(d.userId);
  const isPrimary = count === 0;
  const doc = new AppVehicle({
    _id:         uuidv4(),
    userId:      d.userId,
    numberPlate: d.numberPlate.toUpperCase(),
    vehicleType: d.vehicleType,
    vehicleName: d.vehicleName,
    vehicleModel:d.vehicleModel,
    isPrimary,
  });
  await doc.save();
  return doc.toObject();
};

const updatePlate = async (id, newPlate) => {
  await AppVehicle.findByIdAndUpdate(id, { $set: { numberPlate: newPlate.toUpperCase() } });
  return AppVehicle.findById(id).lean();
};

const setPrimary = async (userId, vehicleId) => {
  await AppVehicle.updateMany({ userId }, { $set: { isPrimary: false } });
  await AppVehicle.findByIdAndUpdate(vehicleId, { $set: { isPrimary: true } });
};

const remove = async (id) => {
  await AppVehicle.findByIdAndUpdate(id, { $set: { status: 'removed', isPrimary: false } });
};

module.exports = { findByUser, findById, findByPlate, countActiveByUser, create, updatePlate, setPrimary, remove };
