/**
 * @fileoverview API key authentication middleware.
 * Validates X-API-Key header against Supabase api_keys table.
 * Attaches user and apiKey objects to the request for downstream handlers.
 * SECURITY: Never log the API key value itself.
 */

const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate requests using an API key.
 * Validates the key exists, is active, belongs to the linkedin or all service,
 * and that the associated user has a LinkedIn cookie configured.
 *
 * @param {import('express').Request} req - Express request (expects X-API-Key header)
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 * @returns {Promise<void>}
 */
async function apiKeyAuth(req, res, next) {
  try {
    const apiKeyValue = req.headers['x-api-key'];

    if (!apiKeyValue) {
      return res.status(401).json({
        success: false,
        error: 'API key required. Provide it in the X-API-Key header.'
      });
    }

    // Validate API key against Supabase
    const { data: apiKey, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKeyValue)
      .eq('is_active', true)
      .in('service', ['linkedin', 'all'])
      .single();

    if (keyError || !apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key.'
      });
    }

    // Fetch associated user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, linkedin_cookie, linkedin_user_agent')
      .eq('id', apiKey.user_id)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Check cookie is configured
    if (!user.linkedin_cookie || user.linkedin_cookie.trim() === '') {
      return res.status(403).json({
        success: false,
        error: 'LinkedIn cookie not configured. Please add your cookie in the dashboard.'
      });
    }

    // Update last_used_at (fire and forget)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)
      .then(() => {})
      .catch((err) => logger.warn('Failed to update last_used_at', { error: err.message }));

    // Attach to request
    req.user = {
      id: user.id,
      full_name: user.full_name,
      linkedin_cookie: user.linkedin_cookie,
      linkedin_user_agent: user.linkedin_user_agent
    };
    req.apiKey = {
      id: apiKey.id,
      service: apiKey.service
    };

    // SECURITY: log user_id only, never the key value
    logger.info('API key authenticated', {
      user_id: user.id,
      service: apiKey.service
    });

    return next();
  } catch (err) {
    logger.error('API key auth error', { error: err.message });
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication.'
    });
  }
}

module.exports = apiKeyAuth;
