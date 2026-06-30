const svc = require('../services/parking_sessions.service');
const { sendSuccess } = require('../utils/response');

const list       = async (req, res, next) => { try { res.json(await svc.listSessions(req.query)); } catch (e) { next(e); } };
const listActive = async (req, res, next) => { try { res.json(await svc.getActiveSessions()); } catch (e) { next(e); } };
const getById    = async (req, res, next) => { try { res.json(await svc.getSessionById(req.params.id)); } catch (e) { next(e); } };
const entry = async (req, res, next) => {
  try {
    const result = await svc.recordEntry(req.body);
    const code   = (req.body.status || '').toUpperCase() === 'OUT' ? 200 : 201;
    res.status(code).json(result);
  } catch (e) { next(e); }
};
const exit       = async (req, res, next) => { try { res.json(await svc.recordExit(req.body)); } catch (e) { next(e); } };
const remove     = async (req, res, next) => {
  try {
    const result = await svc.deleteSession(req.params.id);
    return sendSuccess(res, { message: result.message });
  } catch (e) { next(e); }
};
const lookup     = async (req, res, next) => { try { res.json(await svc.lookupByPlate(req.query.plate)); } catch (e) { next(e); } };

module.exports = { list, listActive, getById, entry, exit, remove, lookup };
