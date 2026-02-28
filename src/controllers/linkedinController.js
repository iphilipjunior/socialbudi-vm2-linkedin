/**
 * @fileoverview LinkedIn scraper controller.
 * Handles incoming requests and delegates to linkedinService.
 * Currently returns 501 placeholders — full implementation in Step 7.
 */

const logger = require('../utils/logger');

/**
 * Scrape a single LinkedIn profile.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
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
    message: 'Profile scraping will be implemented in Step 7'
  });
}

/**
 * Scrape all profiles from a LinkedIn search results page.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {void}
 */
function scrapeSearchResults(req, res) {
  logger.info('Search export requested', {
    user_id: req.user.id,
    search_url: req.body.search_url
  });

  return res.status(501).json({
    success: false,
    error: 'Not implemented yet',
    message: 'Search export will be implemented in Step 8'
  });
}

/**
 * Scrape a list of LinkedIn profile URLs in bulk (max 50).
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
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
    message: 'Bulk scraping will be implemented in Step 9'
  });
}

module.exports = { scrapeProfile, scrapeSearchResults, scrapeBulk };
