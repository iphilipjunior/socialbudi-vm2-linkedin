/**
 * @fileoverview Winston logger configuration for the SocialBudi LinkedIn Scraper.
 *
 * SECURITY WARNING: Never log cookie values (li_at), API keys, or JWT tokens.
 * Log user IDs and action names only — never the sensitive values themselves.
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');

const { combine, timestamp, json, errors, colorize, simple } = format;

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = path.join(__dirname, '../../logs');

/**
 * Shared file format: JSON with ISO timestamp and error stack support.
 */
const fileFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json()
);

/**
 * Winston logger instance.
 *
 * Transports:
 *  - logs/app.log   — all log levels (info, warn, error, debug)
 *  - logs/error.log — error level only
 *  - console        — development only (colorized simple format)
 *
 * @type {import('winston').Logger}
 */
const logger = createLogger({
  level: LOG_LEVEL,
  format: fileFormat,
  transports: [
    new transports.File({
      filename: path.join(LOG_DIR, 'app.log'),
      level: LOG_LEVEL,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    }),
    new transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        simple()
      )
    })
  );
}

module.exports = logger;
