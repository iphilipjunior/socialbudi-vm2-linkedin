/**
 * @fileoverview LinkedIn scraper controller.
 * Handles incoming requests and delegates to linkedinService.
 * scrapeProfile: full implementation
 * scrapeSearchResults, scrapeBulk: 501 placeholders until Steps 8-9
 */

'use strict';

const linkedinService = require('../services/linkedinService');
const logger = require('../utils/logger');

/**
 * Scrape a single LinkedIn profile.
 * Full implementation — calls linkedinService.scrapeProfile()
 *
 * @param {import('express').Request} req - Express request (req.user set by apiKeyAuth)
 * @param {import('express').Response} res - Express response
 * @returns {Promise<void>}
 */
async function scrapeProfile(req, res) {
  const userId = req.user.id;
  const { profile_url } = req.body;

  logger.info('Profile scrape endpoint hit', { userId, profile_url });

  try {
    const result = await linkedinService.scrapeProfile(userId, profile_url);
    return res.status(200).json(result);

  } catch (err) {
    // Rate limit exceeded
    if (err.statusCode === 429) {
      return res.status(429).json({
        success: false,
        error: err.message,
        limit: err.limitData?.limit || 100,
        used: err.limitData?.used || 0,
        reset_at: err.limitData?.reset_at || null
      });
    }

    // Cookie not configured
    if (err.message?.includes('cookie')) {
      return res.status(403).json({
        success: false,
        error: 'LinkedIn cookie not configured. Please add your cookie in the dashboard.'
      });
    }

    // All other errors
    logger.error('Profile scrape failed', {
      userId,
      profile_url,
      error: err.message
    });

    return res.status(500).json({
      success: false,
      error: 'Scraping failed. Please try again.',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
}

/**
 * Scrape all profiles from a LinkedIn search results page.
 * PLACEHOLDER — full implementation in Step 8.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {void}
 */
function scrapeSearchResults(req, res) {
  logger.info('Search export requested (placeholder)', { userId: req.user.id });
  return res.status(501).json({
    success: false,
    error: 'Not implemented yet',
    message: 'Search export will be implemented in Step 8'
  });
}

/**
 * Scrape a list of LinkedIn profile URLs in bulk (max 50).
 * PLACEHOLDER — full implementation in Step 9.
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @returns {void}
 */
function scrapeBulk(req, res) {
  logger.info('Bulk scrape requested (placeholder)', { userId: req.user.id });
  return res.status(501).json({
    success: false,
    error: 'Not implemented yet',
    message: 'Bulk scraping will be implemented in Step 9'
  });
}

module.exports = { scrapeProfile, scrapeSearchResults, scrapeBulk };
