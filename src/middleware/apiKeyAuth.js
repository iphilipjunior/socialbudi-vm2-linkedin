/**
 * @fileoverview API key authentication middleware.
 * Validates the X-API-Key header against the Supabase api_keys table,
 * loads the associated user, and attaches both to the request object.
 *
 * SECURITY WARNING: Never log the API key value itself — only log user_id and service.
 */

const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Express middleware that authenticates requests using the X-API-Key header.
 *
 * Validation steps:
 *  1. Reads X-API-Key header — returns 401 if missing.
 *  2. Queries api_keys table for a matching active key with service 'linkedin' or 'all'.
 *  3. Loads the associated user from the users table.
 *  4. Checks that linkedin_cookie is present on the user.
 *  5. Updates last_used_at on the api_key (fire-and-forget).
 *  6. Attaches req.user and req.apiKey, then calls next().
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
async function apiKeyAuth(req, res, next) {
  try {
    const apiKeyValue = req.headers['x-api-key'];

    if (!apiKeyValue) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }

    // Look up the API key in Supabase
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKeyValue)
      .eq('is_active', true)
      .in('service', ['linkedin', 'all'])
      .single();

    if (keyError || !apiKey) {
      return res.status(401).json({ success: false, error: 'Invalid or inactive API key' });
    }

    // Load the associated user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, linkedin_cookie, linkedin_user_agent')
      .eq('id', apiKey.user_id)
      .single();

    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    // Require a LinkedIn cookie to be configured
    if (!user.linkedin_cookie || user.linkedin_cookie.trim() === '') {
      return res.status(403).json({
        success: false,
        error: 'LinkedIn cookie not configured. Please add your cookie in the dashboard.'
      });
    }

    // Update last_used_at — fire and forget, do not await
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)
      .then(() => {})
      .catch(() => {});

    // Attach context to request — NEVER include the raw key value in logs
    req.user = {
      id: user.id,
      full_name: user.full_name,
      linkedin_cookie: user.linkedin_cookie,
      linkedin_user_agent: user.linkedin_user_agent
    };

    req.apiKey = {
      id: apiKey.id,
      api_key: apiKey.api_key,
      service: apiKey.service
    };

    logger.info('API key authenticated', { user_id: user.id, service: apiKey.service });

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = apiKeyAuth;
