const VehicleRequest = require('../models/vehicleRequests.model');
const AppVehicle     = require('../models/appVehicles.model');
const ParkingUser    = require('../models/parkingUsers.model');
const { v4: uuidv4 } = require('uuid');

const findByUser = async (userId) => {
  const requests = await VehicleRequest.find({ userId }).sort({ createdAt: -1 }).lean();

  const vehicleIds = [...new Set(requests.map(r => r.vehicleId).filter(Boolean))];
  const vehicles   = await AppVehicle.find({ _id: { $in: vehicleIds } }, { numberPlate: 1, vehicleName: 1 }).lean();
  const vehicleMap = {};
  for (const v of vehicles) vehicleMap[v._id] = v;

  return requests.map(r => ({
    ...r,
    number_plate:  r.vehicleId ? (vehicleMap[r.vehicleId]?.numberPlate  || null) : null,
    vehicle_name:  r.vehicleId ? (vehicleMap[r.vehicleId]?.vehicleName  || null) : null,
  }));
};

const findAll = async ({ status, limit = 50, offset = 0 }) => {
  const filter = {};
  if (status) filter.status = status;

  const [requests, total] = await Promise.all([
    VehicleRequest.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    VehicleRequest.countDocuments(filter),
  ]);

  const vehicleIds = [...new Set(requests.map(r => r.vehicleId).filter(Boolean))];
  const userIds    = [...new Set(requests.map(r => r.userId).filter(Boolean))];

  const [vehicles, users] = await Promise.all([
    AppVehicle.find({ _id: { $in: vehicleIds } }, { numberPlate: 1, vehicleName: 1 }).lean(),
    ParkingUser.find({ _id: { $in: userIds } }, { name: 1, phone: 1 }).lean(),
  ]);

  const vehicleMap = {};
  for (const v of vehicles) vehicleMap[v._id] = v;
  const userMap = {};
  for (const u of users) userMap[u._id] = u;

  const rows = requests.map(r => ({
    ...r,
    number_plate: r.vehicleId ? (vehicleMap[r.vehicleId]?.numberPlate  || null) : null,
    vehicle_name: r.vehicleId ? (vehicleMap[r.vehicleId]?.vehicleName  || null) : null,
    user_name:    r.userId    ? (userMap[r.userId]?.name                || null) : null,
    user_phone:   r.userId    ? (userMap[r.userId]?.phone               || null) : null,
  }));

  return { rows, total };
};

const create = async (d) => {
  const doc = new VehicleRequest({
    _id:            uuidv4(),
    userId:         d.userId,
    vehicleId:      d.vehicleId,
    requestType:    d.requestType,
    currentValue:   d.currentValue,
    requestedValue: d.requestedValue,
    reason:         d.reason,
  });
  await doc.save();
  return doc.toObject();
};

const updateStatus = async (id, status, adminNote = null) => {
  const doc = await VehicleRequest.findByIdAndUpdate(
    id,
    { $set: { status, adminNote } },
    { new: true }
  ).lean();
  return doc;
};

module.exports = { findByUser, findAll, create, updateStatus };
