const { ApiError } = require('./errorHandler');

/**
 * Validates req.body against a Zod schema. On success, replaces req.body
 * with the parsed (and defaulted/coerced) value.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ApiError(400, 'Validation failed', result.error.flatten()));
    }
    req.body = result.data;
    return next();
  };
}

module.exports = { validateBody };
