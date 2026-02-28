/**
 * @fileoverview Centralized Express error handling middleware.
 * Catches all unhandled errors, logs them, and returns a consistent JSON response.
 * Never exposes stack traces in production.
 */

const logger = require('../utils/logger');

/**
 * Global error handler middleware.
 * Must be registered as the last middleware in Express.
 *
 * @param {Error} err - The error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = errorHandler;
