const authService = require('../services/auth.service');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const logger = require('../utils/logger');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login({
      username,
      password,
      ipAddress:  req.ip,
      userAgent:  req.headers['user-agent'],
    });
    logger.info('Login successful', { id: result.id, role: result.role, ip: req.ip });
    return sendSuccess(res, { message: 'Login successful', data: result });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens({
      refreshToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return sendSuccess(res, { message: 'Tokens refreshed', data: result });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    return sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll(req.user.id);
    return sendSuccess(res, { message: 'All sessions revoked' });
  } catch (err) {
    next(err);
  }
};

const { resolveVendorForAccount } = require('../services/vendors.service');

const me = async (req, res, next) => {
  try {
    const data = { id: req.user.id, role: req.user.role };
    if (req.user.role === 'vendor') {
      const vendor = await resolveVendorForAccount(req.user.id);
      if (vendor) data.vendorId = vendor._id || vendor.id;
    }
    return sendSuccess(res, { data });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, logoutAll, me };
