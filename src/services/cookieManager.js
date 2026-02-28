/**
 * @fileoverview Cookie management service.
 * Fetches LinkedIn li_at cookies from Supabase for authenticated users.
 * SECURITY: Never log the cookie value. Only log "Fetched cookie for user {userId}".
 */

'use strict';

const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Fetch a user's LinkedIn cookie and user agent from Supabase.
 * Called by scraping services before launching Puppeteer.
 *
 * @param {string} userId - The user's UUID from the users table (users.id)
 * @returns {Promise<{cookie: string, userAgent: string|null}>} Cookie data
 * @throws {Error} If user not found or linkedin_cookie is null/empty
 */
async function getUserCookie(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('linkedin_cookie, linkedin_user_agent')
    .eq('id', userId)
    .single();

  if (error) {
    logger.error('Failed to fetch cookie from database', {
      userId,
      error: error.message
    });
    throw new Error(`Database error fetching cookie for user: ${userId}`);
  }

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  if (!user.linkedin_cookie || user.linkedin_cookie.trim() === '') {
    throw new Error(`LinkedIn cookie not configured for user: ${userId}`);
  }

  // SECURITY: never log the cookie value
  logger.info(`Fetched cookie for user ${userId}`);

  return {
    cookie: user.linkedin_cookie,
    userAgent: user.linkedin_user_agent || null
  };
}

/**
 * Update cookie_updated_at timestamp after successful use.
 * Fire-and-forget — does not block scraping operations.
 *
 * @param {string} userId - The user's UUID
 * @returns {void}
 */
function updateCookieLastUsed(userId) {
  supabase
    .from('users')
    .update({ cookie_updated_at: new Date().toISOString() })
    .eq('id', userId)
    .then(() => {
      logger.info(`Updated cookie_updated_at for user ${userId}`);
    })
    .catch((err) => {
      logger.warn('Failed to update cookie_updated_at', {
        userId,
        error: err.message
      });
    });
}

module.exports = { getUserCookie, updateCookieLastUsed };
