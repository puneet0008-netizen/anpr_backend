const svc = require('../services/inventory.service');
const { sendSuccess } = require('../utils/response');

const list   = async (req, res, next) => { try { res.json(await svc.listItems(req.query)); } catch (e) { next(e); } };
const getById = async (req, res, next) => { try { res.json(await svc.getItemById(req.params.id)); } catch (e) { next(e); } };
const create  = async (req, res, next) => { try { res.status(201).json(await svc.createItem(req.body)); } catch (e) { next(e); } };
const update  = async (req, res, next) => { try { res.json(await svc.updateItem(req.params.id, req.body)); } catch (e) { next(e); } };
const remove  = async (req, res, next) => { try { await svc.deleteItem(req.params.id); sendSuccess(res, { message: 'Item deleted' }); } catch (e) { next(e); } };

module.exports = { list, getById, create, update, remove };
