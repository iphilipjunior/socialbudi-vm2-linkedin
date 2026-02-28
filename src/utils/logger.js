/**
 * @fileoverview Winston logger configuration for SocialBudi LinkedIn Scraper.
 * SECURITY WARNING: Never log cookie values, API keys, or JWT tokens.
 * Log "Fetched cookie for user {user_id}" instead of the cookie value itself.
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error'
    }),
    new transports.File({
      filename: path.join('logs', 'app.log')
    }),
    ...(process.env.NODE_ENV !== 'production'
      ? [new transports.Console({ format: format.simple() })]
      : [new transports.Console()])
  ]
});

module.exports = logger;
