const { sendBadRequest } = require('../utils/response');

/**
 * Joi validation middleware factory.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), authController.login)
 *
 * @param {import('joi').Schema} schema   Joi schema to validate against
 * @param {'body'|'query'|'params'} source  Part of req to validate (default: 'body')
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly:    false,
    stripUnknown:  true,
    convert:       true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field:   d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return sendBadRequest(res, 'Validation failed', errors);
  }

  // Replace the source with the sanitised value
  req[source] = value;
  next();
};

module.exports = { validate };
