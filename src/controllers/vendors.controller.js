const svc = require('../services/vendors.service');
const { sendSuccess } = require('../utils/response');

const list       = async (req, res, next) => { try { res.json(await svc.listVendors(req.query)); } catch (e) { next(e); } };
const getById    = async (req, res, next) => { try { res.json(await svc.getVendorById(req.params.id)); } catch (e) { next(e); } };
const dropdown   = async (req, res, next) => { try { res.json(await svc.getVendorDropdown()); } catch (e) { next(e); } };
const create     = async (req, res, next) => { try { res.status(201).json(await svc.createVendor(req.body, req.user?.id)); } catch (e) { next(e); } };
const update     = async (req, res, next) => { try { res.json(await svc.updateVendor(req.params.id, req.body)); } catch (e) { next(e); } };
const deactivate = async (req, res, next) => { try { res.json(await svc.deactivateVendor(req.params.id)); } catch (e) { next(e); } };
const remove     = async (req, res, next) => { try { await svc.deleteVendor(req.params.id); sendSuccess(res, { message: 'Vendor deleted' }); } catch (e) { next(e); } };

module.exports = { list, getById, dropdown, create, update, deactivate, remove };
