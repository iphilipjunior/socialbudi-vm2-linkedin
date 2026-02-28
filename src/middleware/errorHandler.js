/**
 * @fileoverview Centralized Express error handler middleware.
 * Returns sanitized error responses — never exposes stack traces in production.
 */

const logger = require('../utils/logger');

/**
 * Global error handler middleware for Express.
 * Must be registered last (after all routes).
 *
 * In production: logs full error internally, returns generic message.
 * In development: returns full error details including stack trace.
 *
 * Always returns JSON: { success: false, error: string }
 *
 * @param {Error} err - The error object passed to next(err).
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void}
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  logger.error(err.message, {
    method: req.method,
    url: req.url,
    statusCode,
    stack: err.stack
  });

  if (process.env.NODE_ENV === 'production') {
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
