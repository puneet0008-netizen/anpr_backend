const svc = require('../services/parking.service');
const { sendSuccess } = require('../utils/response');

const listSites       = async (req, res, next) => { try { res.json(await svc.listSites(req.query)); } catch (e) { next(e); } };
const createSite      = async (req, res, next) => { try { res.status(201).json(await svc.createSite(req.body)); } catch (e) { next(e); } };
const updateSite      = async (req, res, next) => { try { res.json(await svc.updateSite(req.params.id, req.body)); } catch (e) { next(e); } };
const deleteSite      = async (req, res, next) => { try { await svc.deleteSite(req.params.id); sendSuccess(res, { message: 'Parking site deleted' }); } catch (e) { next(e); } };
const getStats        = async (req, res, next) => { try { res.json(await svc.getStats()); } catch (e) { next(e); } };
const processRecharge = async (req, res, next) => { try { res.status(201).json(await svc.processRecharge(req.body, req.user.id)); } catch (e) { next(e); } };
const recentRecharges = async (req, res, next) => { try { res.json(await svc.getRecentRecharges()); } catch (e) { next(e); } };

const siteDropdown         = async (req, res, next) => { try { res.json(await svc.getSiteDropdown()); } catch (e) { next(e); } };
const getVendorParkingDetails = async (req, res, next) => {
  try {
    res.json(await svc.getVendorParkingDetails({
      accountId: req.user.id,
      role:      req.user.role,
      vendorId:  req.query.vendorId,
    }));
  } catch (e) { next(e); }
};
const getActiveSessionsBySiteId = async (req, res, next) => {
  try {
    res.json(await svc.getActiveSessionsBySiteId(req.params.id, {
      accountId: req.user.id,
      role:      req.user.role,
    }));
  } catch (e) { next(e); }
};

module.exports = {
  listSites, createSite, updateSite, deleteSite, getStats,
  processRecharge, recentRecharges, siteDropdown,
  getVendorParkingDetails, getActiveSessionsBySiteId,
};
