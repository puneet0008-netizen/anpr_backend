/**
 * Calendar-day bounds for YYYY-MM-DD in server local time
 * (same basis as findTodayByUser in parking_sessions.repository).
 */
const localDayBounds = (isoDate) => {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  if (!y || !m || !d) {
    throw Object.assign(new Error('Invalid date'), { statusCode: 400 });
  }
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endExclusive = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { start, endExclusive };
};

module.exports = { localDayBounds };
