const vendorService = require('../services/vendor.service');
const { parsePagination } = require('../utils/pagination');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { getIO } = require('../sockets');

const create = async (req, res, next) => {
  try {
    const vendor = await vendorService.createVendor(req.body, req.user.id);

    // Real-time: notify admin room
    getIO().to('admin').emit('vendor:created', {
      vendorId:  vendor.id,
      createdBy: req.user.id,
      timestamp: new Date(),
    });

    return sendCreated(res, { message: 'Vendor created', data: { id: vendor.id } });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    return sendSuccess(res, { data: vendor });
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

    const result = await vendorService.listVendors({ page, limit, offset, sortBy, sortOrder, isActive });
    return sendSuccess(res, { data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body);
    return sendSuccess(res, { message: 'Vendor updated', data: vendor });
  } catch (err) {
    next(err);
  }
};

const deactivate = async (req, res, next) => {
  try {
    await vendorService.deactivateVendor(req.params.id);
    return sendSuccess(res, { message: 'Vendor deactivated' });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getById, list, update, deactivate };
