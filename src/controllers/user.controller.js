const userService = require('../services/user.service');
const { parsePagination } = require('../utils/pagination');
const { sendSuccess, sendCreated } = require('../utils/response');
const { getIO } = require('../sockets');

const create = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body, req.user.id);

    const io = getIO();
    // Notify the vendor who created the user (if creator is a vendor)
    if (req.user.role === 'vendor') {
      io.to(`vendor:${req.user.id}`).emit('user:created', {
        userId:    user.id,
        createdBy: req.user.id,
        timestamp: new Date(),
      });
    }
    // Always notify admin room
    io.to('admin').emit('user:created', {
      userId:    user.id,
      createdBy: req.user.id,
      role:      req.user.role,
      timestamp: new Date(),
    });

    return sendCreated(res, { message: 'User created', data: { id: user.id } });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    // Users can only view their own profile
    if (req.user.role === 'user' && req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, { data: user });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    return sendSuccess(res, { data: user });
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const { page, limit, offset, sortBy, sortOrder } = parsePagination(req.query);
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined;

    // Vendors only see users they created
    const createdBy = req.user.role === 'vendor' ? req.user.id : null;

    const result = await userService.listUsers({
      page, limit, offset, sortBy, sortOrder, isActive, createdBy,
    });
    return sendSuccess(res, { data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return sendSuccess(res, { message: 'User updated', data: user });
  } catch (err) {
    next(err);
  }
};

const deactivate = async (req, res, next) => {
  try {
    await userService.deactivateUser(req.params.id);
    return sendSuccess(res, { message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
};

const lookupCarNumber = async (req, res, next) => {
  try {
    const user = await userService.lookupByCarNumber(req.params.carNumber);
    return sendSuccess(res, { data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getById, getMe, list, update, deactivate, lookupCarNumber };
