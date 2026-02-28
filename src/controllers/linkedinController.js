/**
 * @fileoverview LinkedIn scraper controller.
 * Handles HTTP request/response for profile, search-export, and bulk endpoints.
 * Core scraping logic will be wired in Step 5.
 */

const logger = require('../utils/logger');

/**
 * Handle POST /api/linkedin/profile
 * Scrapes a single LinkedIn profile by URL.
 *
 * @param {import('express').Request} req - Express request. Expects req.body.profile_url and req.user.
 * @param {import('express').Response} res - Express response.
 * @returns {void}
 */
function scrapeProfile(req, res) {
  logger.info('Profile scrape requested', {
    user_id: req.user.id,
    profile_url: req.body.profile_url
  });

  return res.status(501).json({
    success: false,
    error: 'Not implemented yet',
    message: 'Profile scraping coming in Step 5'
  });
}

/**
 * Handle POST /api/linkedin/search-export
 * Scrapes all profiles from a LinkedIn search results page.
 *
 * @param {import('express').Request} req - Express request. Expects req.body.search_url and req.user.
 * @param {import('express').Response} res - Express response.
 * @returns {void}
 */
function scrapeSearchResults(req, res) {
  logger.info('Search export requested', { user_id: req.user.id });

  return res.status(501).json({
    success: false,
    error: 'Not implemented yet',
    message: 'Search export coming in Step 5'
  });
}

/**
 * Handle POST /api/linkedin/bulk
 * Scrapes a list of LinkedIn profile URLs (max 50).
 *
 * @param {import('express').Request} req - Express request. Expects req.body.profile_urls and req.user.
 * @param {import('express').Response} res - Express response.
 * @returns {void}
 */
function scrapeBulk(req, res) {
  logger.info('Bulk scrape requested', {
    user_id: req.user.id,
    count: req.body.profile_urls?.length
  });

  return res.status(501).json({
    success: false,
    error: 'Not implemented yet',
    message: 'Bulk scraping coming in Step 5'
  });
}

module.exports = { scrapeProfile, scrapeSearchResults, scrapeBulk };
