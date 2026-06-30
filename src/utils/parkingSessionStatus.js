const ParkingSession = require('../models/parkingSessions.model');

const IN_STATUSES = ['IN', 'active'];
const OUT_STATUSES = ['OUT', 'completed'];

const isInStatus = (status) => IN_STATUSES.includes(status);
const isOutStatus = (status) => OUT_STATUSES.includes(status);

const inStatusQuery = () => ({ $in: IN_STATUSES });
const outStatusQuery = () => ({ $in: OUT_STATUSES });

const resolveListStatusFilter = (status) => {
  if (!status) return undefined;
  const s = String(status).toLowerCase();
  if (s === 'in' || s === 'active') return inStatusQuery();
  if (s === 'out' || s === 'completed') return outStatusQuery();
  return status;
};

/** Aggregation: latest event per plate that is currently parked (IN). */
const fetchActiveSessions = async (baseFilter = {}) => {
  const pipeline = [
    ...(Object.keys(baseFilter).length ? [{ $match: baseFilter }] : []),
    { $sort: { entryTime: -1, createdAt: -1 } },
    { $group: { _id: '$numberPlate', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $match: { status: inStatusQuery() } },
    { $sort: { entryTime: -1 } },
  ];
  return ParkingSession.aggregate(pipeline);
};

const countActiveSessions = async (baseFilter = {}) => {
  const pipeline = [
    ...(Object.keys(baseFilter).length ? [{ $match: baseFilter }] : []),
    { $sort: { entryTime: -1, createdAt: -1 } },
    { $group: { _id: '$numberPlate', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $match: { status: inStatusQuery() } },
    { $count: 'total' },
  ];
  const result = await ParkingSession.aggregate(pipeline);
  return result[0]?.total ?? 0;
};

const findLatestByPlate = async (plate) => {
  if (!plate) return null;
  return ParkingSession.findOne({ numberPlate: plate.toUpperCase() })
    .sort({ entryTime: -1, createdAt: -1 })
    .lean();
};

const findActiveByPlate = async (plate) => {
  const latest = await findLatestByPlate(plate);
  if (!latest || !isInStatus(latest.status)) return null;
  return latest;
};

module.exports = {
  IN_STATUSES,
  OUT_STATUSES,
  isInStatus,
  isOutStatus,
  inStatusQuery,
  outStatusQuery,
  resolveListStatusFilter,
  fetchActiveSessions,
  countActiveSessions,
  findLatestByPlate,
  findActiveByPlate,
};
