const svc = require('../services/parking_sessions.service');
const { sendSuccess } = require('../utils/response');

const list       = async (req, res, next) => { try { res.json(await svc.listSessions(req.query)); } catch (e) { next(e); } };
const listActive = async (req, res, next) => { try { res.json(await svc.getActiveSessions()); } catch (e) { next(e); } };
const getById    = async (req, res, next) => { try { res.json(await svc.getSessionById(req.params.id)); } catch (e) { next(e); } };
const entry      = async (req, res, next) => { try { res.status(201).json(await svc.recordEntry(req.body)); } catch (e) { next(e); } };
const exit       = async (req, res, next) => { try { res.json(await svc.recordExit(req.body)); } catch (e) { next(e); } };
const lookup     = async (req, res, next) => { try { res.json(await svc.lookupByPlate(req.query.plate)); } catch (e) { next(e); } };

module.exports = { list, listActive, getById, entry, exit, lookup };
