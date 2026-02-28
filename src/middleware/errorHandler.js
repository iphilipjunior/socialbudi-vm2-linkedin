/**
 * @fileoverview Global Express error handler middleware.
 * Differentiates between production and development environments.
 * Never exposes stack traces in production.
 */

const logger = require('../utils/logger');

/**
 * Global error handler middleware for Express.
 * In production: returns a generic error message and logs full details internally.
 * In development: returns full error details including stack trace.
 *
 * @param {Error} err - The error object caught by Express.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Unhandled error', {
    method: req.method,
    url: req.url,
    statusCode,
    message: err.message,
    stack: err.stack
  });

  if (isProduction) {
    return res.status(statusCode).json({
      success: false,
      error: statusCode >= 500 ? 'Internal server error' : err.message
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: err.message,
    stack: err.stack
  });
}

module.exports = errorHandler;
