'use strict';

const supabase = require('../config/supabase');
const logger = require('./logger');

/**
 * Log scraping activity to Supabase system_logs table.
 * Fire-and-forget — never throws, never blocks scraping operations.
 *
 * @param {string} logLevel - 'info', 'warn', or 'error'
 * @param {string} action - Action identifier e.g. 'scrape_profile', 'search_export', 'bulk_scrape'
 * @param {string} message - Human readable log message
 * @param {string|null} userId - User UUID (never log cookie or API key values)
 * @param {object|null} metadata - Additional data (never include cookie/key values)
 */
function logActivity(logLevel, action, message, userId = null, metadata = null) {
  try {
    supabase
      .from('system_logs')
      .insert({
        log_level: logLevel,
        action,
        message,
        user_id: userId || null,
        metadata: metadata || null
      })
      .then(({ error }) => {
        if (error) {
          logger.warn('Failed to write activity log to Supabase', { error: error.message });
        }
      })
      .catch(err => {
        logger.warn('Activity log insert threw', { error: err.message });
      });
  } catch (err) {
    logger.warn('Activity log synchronous error', { error: err.message });
  }
}

module.exports = { logActivity };
