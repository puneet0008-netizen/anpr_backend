const repo = require('../repositories/inventory.repository');
const { parsePagination, buildMeta } = require('../utils/pagination');

const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code });

const formatItem = (row) => row ? {
  id:           row.id,
  itemName:     row.item_name,
  totalQty:     row.total_qty,
  availableQty: row.available_qty,
  unit:         row.unit,
  vendorId:     row.vendor_id,
  vendorName:   row.vendor_name,
  status:       row.status,
  createdAt:    row.created_at,
  updatedAt:    row.updated_at,
} : null;

const listItems = async (query) => {
  const { page, limit, offset, sortBy, sortOrder, search } = parsePagination(query);
  const { rows, total } = await repo.findAll({ search, status: query.status, vendorId: query.vendorId, limit, offset, sortBy, sortOrder });
  return { data: rows.map(formatItem), meta: buildMeta(total, page, limit), success: true };
};

const getItemById = async (id) => {
  const row = await repo.findById(id);
  if (!row) throw err('Item not found', 404);
  return { data: formatItem(row), success: true };
};

const createItem = async (d) => {
  if (d.availableQty > d.totalQty) throw err('Available qty cannot exceed total qty', 400);
  const row = await repo.create(d);
  return { data: formatItem(row), success: true };
};

const updateItem = async (id, d) => {
  if (!await repo.findById(id)) throw err('Item not found', 404);
  if (d.availableQty !== undefined && d.totalQty !== undefined && d.availableQty > d.totalQty)
    throw err('Available qty cannot exceed total qty', 400);
  const row = await repo.updateById(id, d);
  return { data: formatItem(row), success: true };
};

const deleteItem = async (id) => {
  if (!await repo.findById(id)) throw err('Item not found', 404);
  await repo.deleteById(id);
};

module.exports = { listItems, getItemById, createItem, updateItem, deleteItem };
