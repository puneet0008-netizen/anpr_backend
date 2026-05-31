const svc = require('../services/portal_users.service');
const { sendSuccess } = require('../utils/response');

const list        = async (req, res, next) => { try { res.json(await svc.listUsers(req.query)); } catch (e) { next(e); } };
const create      = async (req, res, next) => { try { res.status(201).json(await svc.createUser(req.body)); } catch (e) { next(e); } };
const update      = async (req, res, next) => { try { res.json(await svc.updateUser(req.params.id, req.body)); } catch (e) { next(e); } };
const toggle      = async (req, res, next) => { try { res.json(await svc.toggleStatus(req.params.id, req.body.status)); } catch (e) { next(e); } };
const remove      = async (req, res, next) => { try { await svc.deleteUser(req.params.id); sendSuccess(res, { message: 'User deleted' }); } catch (e) { next(e); } };

module.exports = { list, create, update, toggle, remove };
