const svc = require('../services/parking_users.service');
const { sendSuccess } = require('../utils/response');

const listWeb    = async (req, res, next) => { try { res.json(await svc.listUsers('web', req.query)); } catch (e) { next(e); } };
const listApp    = async (req, res, next) => { try { res.json(await svc.listUsers('app', req.query)); } catch (e) { next(e); } };
const search     = async (req, res, next) => { try { res.json(await svc.searchUsers(req.query.q)); } catch (e) { next(e); } };
const getById    = async (req, res, next) => { try { res.json(await svc.getUserById(req.params.id)); } catch (e) { next(e); } };
const createWeb  = async (req, res, next) => { try { res.status(201).json(await svc.createUser('web', req.body)); } catch (e) { next(e); } };
const createApp  = async (req, res, next) => { try { res.status(201).json(await svc.createUser('app', req.body)); } catch (e) { next(e); } };
const updateUser = async (req, res, next) => { try { res.json(await svc.updateUser(req.params.id, req.body)); } catch (e) { next(e); } };
const deleteUser = async (req, res, next) => { try { await svc.deleteUser(req.params.id); sendSuccess(res, { message: 'User deleted' }); } catch (e) { next(e); } };

const rechargeWallet = async (req, res, next) => {
  try {
    const result = await svc.rechargeWallet(req.params.id, req.body);
    res.json(result);
  } catch (e) { next(e); }
};

const getAppUserDetail = async (req, res, next) => {
  try {
    const result = await svc.getAppUserDetail(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

const listUserVehicles  = async (req, res, next) => { try { res.json(await svc.listUserVehicles(req.params.id)); } catch (e) { next(e); } };
const addUserVehicle    = async (req, res, next) => { try { res.status(201).json(await svc.addUserVehicle(req.params.id, req.body)); } catch (e) { next(e); } };
const updateUserVehicle = async (req, res, next) => { try { res.json(await svc.updateUserVehicle(req.params.id, req.params.vehicleId, req.body)); } catch (e) { next(e); } };
const removeUserVehicle = async (req, res, next) => { try { await svc.removeUserVehicle(req.params.id, req.params.vehicleId); res.json({ success: true, message: 'Vehicle removed' }); } catch (e) { next(e); } };
const setPrimaryVehicle = async (req, res, next) => { try { res.json(await svc.setPrimaryVehicle(req.params.id, req.params.vehicleId)); } catch (e) { next(e); } };

const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const photoUrl = req.file.path; // Cloudinary URL
    await svc.updateUser(req.params.id, { profilePhoto: photoUrl });
    res.json({ success: true, data: { photoUrl } });
  } catch (e) { next(e); }
};

module.exports = { listWeb, listApp, search, getById, createWeb, createApp, updateUser, deleteUser, rechargeWallet, getAppUserDetail, listUserVehicles, addUserVehicle, updateUserVehicle, removeUserVehicle, setPrimaryVehicle, uploadPhoto };
