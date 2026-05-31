/**
 * Parses pagination / filter query params from an Express request.
 *
 * @param {object} query  req.query
 * @param {object} opts   { maxLimit }
 * @returns {{ page, limit, offset, sortBy, sortOrder, search }}
 */
const parsePagination = (query = {}, opts = {}) => {
  const maxLimit = opts.maxLimit || 100;

  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const sortBy    = query.sortBy    || 'created_at';
  const sortOrder = (query.sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const search    = query.search   ? String(query.search).trim() : null;

  return { page, limit, offset, sortBy, sortOrder, search };
};

/**
 * Builds the standard pagination meta block for API responses.
 */
const buildMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

module.exports = { parsePagination, buildMeta };
