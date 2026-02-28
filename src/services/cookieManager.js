/**
 * @fileoverview Cookie manager service.
 * Fetches and updates LinkedIn session cookies stored in Supabase.
 *
 * SECURITY WARNING: Never log the cookie value (li_at).
 * Only log the user_id to confirm the fetch succeeded.
 */

const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Fetches the LinkedIn cookie and user agent for a given user.
 * Logs the fetch action but NEVER the cookie value.
 *
 * @param {string} userId - The UUID of the user (users.id).
 * @returns {Promise<{ cookie: string, userAgent: string|null }>} The user's cookie and user agent.
 * @throws {Error} If the user is not found or the query fails.
 */
async function getUserCookie(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('linkedin_cookie, linkedin_user_agent')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error(`User not found or query failed for user_id: ${userId}`);
  }

  logger.info(`Fetched cookie for user ${userId}`);

  return {
    cookie: user.linkedin_cookie,
    userAgent: user.linkedin_user_agent
  };
}

/**
 * Updates the cookie_updated_at timestamp for a user.
 * Fire-and-forget — errors are swallowed and logged as warnings.
 *
 * @param {string} userId - The UUID of the user (users.id).
 * @returns {void}
 */
function updateCookieLastUsed(userId) {
  supabase
    .from('users')
    .update({ cookie_updated_at: new Date().toISOString() })
    .eq('id', userId)
    .then(() => {})
    .catch((err) => {
      logger.warn('Failed to update cookie_updated_at', { user_id: userId, error: err.message });
    });
}

module.exports = { getUserCookie, updateCookieLastUsed };
