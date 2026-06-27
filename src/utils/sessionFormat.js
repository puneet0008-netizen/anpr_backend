const isSessionOut = (row) => {
  const status = row.status ?? ((row.exitTime || row.exit_time) ? 'completed' : 'active');
  return status === 'completed' || !!(row.exitTime || row.exit_time);
};

const toSessionStatus = (row) => (isSessionOut(row) ? 'OUT' : 'IN');

const toParkingType = (row) => {
  const hasUser = !!(row.userId || row.user_id);
  return (hasUser || row.isMonthly === true) ? 'pass' : 'daily';
};

const calcDurationMinutes = (row) => {
  const start = new Date(row.entryTime || row.entry_time);
  const end = row.exitTime || row.exit_time ? new Date(row.exitTime || row.exit_time) : new Date();
  return Math.max(0, Math.round((end - start) / 60000));
};

/** Fee = hours parked × hourly rate. Pass holders are not charged. */
const calcHourlyFee = (row, hourlyRate = 0) => {
  if (toParkingType(row) === 'pass') return 0;
  const rate = parseFloat(hourlyRate) || 0;
  if (!rate) return 0;
  const hours = calcDurationMinutes(row) / 60;
  return Math.round(hours * rate * 100) / 100;
};

module.exports = { toSessionStatus, toParkingType, isSessionOut, calcDurationMinutes, calcHourlyFee };
