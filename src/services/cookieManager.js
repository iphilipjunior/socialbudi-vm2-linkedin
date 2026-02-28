/**
 * @fileoverview Cookie management service.
 * Fetches LinkedIn cookies from Supabase for authenticated users.
 * SECURITY: Never log the cookie value. Log "Fetched cookie for user {userId}" only.
 */

const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Fetch a user's LinkedIn cookie and user agent from Supabase.
 *
 * @param {string} userId - The user's UUID from the users table
 * @returns {Promise<{cookie: string, userAgent: string|null}>}
 * @throws {Error} If user not found or cookie is not configured
 */
async function getUserCookie(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('linkedin_cookie, linkedin_user_agent')
    .eq('id', userId)
    .single();

  if (error || !user) {
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
 * Update cookie_updated_at timestamp for a user (fire and forget).
 *
 * @param {string} userId - The user's UUID
 * @returns {void}
 */
function updateCookieLastUsed(userId) {
  supabase
    .from('users')
    .update({ cookie_updated_at: new Date().toISOString() })
    .eq('id', userId)
    .then(() => {})
    .catch((err) => logger.warn('Failed to update cookie_updated_at', { userId, error: err.message }));
}

module.exports = { getUserCookie, updateCookieLastUsed };
