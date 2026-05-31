/**
 * Standardised JSON response helpers.
 * All responses have the shape:
 *   { success, message, data?, meta?, errors? }
 */

const sendSuccess = (res, { message = 'OK', data = null, meta = null, statusCode = 200 } = {}) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};

const sendCreated = (res, { message = 'Created', data = null } = {}) =>
  sendSuccess(res, { message, data, statusCode: 201 });

const sendError = (res, { message = 'An error occurred', errors = null, statusCode = 500 } = {}) => {
  const body = { success: false, message };
  if (errors !== null) body.errors = errors;
  return res.status(statusCode).json(body);
};

const sendNotFound = (res, message = 'Resource not found') =>
  sendError(res, { message, statusCode: 404 });

const sendUnauthorized = (res, message = 'Unauthorized') =>
  sendError(res, { message, statusCode: 401 });

const sendForbidden = (res, message = 'Forbidden') =>
  sendError(res, { message, statusCode: 403 });

const sendBadRequest = (res, message = 'Bad request', errors = null) =>
  sendError(res, { message, errors, statusCode: 400 });

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendBadRequest,
};
