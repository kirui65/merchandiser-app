const logger = require('../utils/logger');

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    logger.error(err.message, err.stack);
  } else {
    logger.warn(`${statusCode} ${req.method} ${req.originalUrl} — ${err.message}`);
  }

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal server error',
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
