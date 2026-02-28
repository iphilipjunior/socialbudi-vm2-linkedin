/**
 * @fileoverview Winston logger configuration for the LinkedIn scraper service.
 *
 * SECURITY WARNING: Never log cookie values, API keys, JWT tokens, or any sensitive
 * authentication data. Log only sanitized, non-sensitive information.
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = format;

/**
 * Custom log format that includes timestamp, level, message, and optional metadata.
 */
const logFormat = printf(({ level, message, timestamp: ts, stack, ...metadata }) => {
  let log = `${ts} [${level}]: ${message}`;
  if (stack) {
    log += `\n${stack}`;
  }
  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }
  return log;
});

/**
 * Winston logger instance with console and file transports.
 * Supports log levels: error, warn, info, debug.
 *
 * @type {import('winston').Logger}
 */
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    new transports.File({
      filename: path.join(__dirname, '../../logs/app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

module.exports = logger;
