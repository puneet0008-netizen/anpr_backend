/**
 * CORS allowlist — supports comma-separated CORS_ORIGIN env values.
 * Native mobile apps send no Origin header and are always allowed.
 */
const parseAllowedOrigins = () => {
  const raw = (process.env.CORS_ORIGIN || '*').trim();
  if (!raw || raw === '*') return '*';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
};

const isDevOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?$/.test(origin);

const createOriginChecker = () => {
  const allowed = parseAllowedOrigins();

  return (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowed === '*') return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && isDevOrigin(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  };
};

const getExpressCorsOptions = () => ({
  origin:         createOriginChecker(),
  methods:        ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

const getSocketCorsOptions = () => {
  const allowed = parseAllowedOrigins();
  if (allowed === '*') {
    return { origin: '*', methods: ['GET', 'POST'], credentials: true };
  }
  return {
    origin:      createOriginChecker(),
    methods:     ['GET', 'POST'],
    credentials: true,
  };
};

module.exports = {
  parseAllowedOrigins,
  createOriginChecker,
  getExpressCorsOptions,
  getSocketCorsOptions,
};
