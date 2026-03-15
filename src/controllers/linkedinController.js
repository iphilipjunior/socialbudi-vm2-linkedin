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
 *
 * @param {import('express').Request} req - Express request (req.user set by apiKeyAuth)
 * @param {import('express').Response} res - Express response
 * @returns {Promise<void>}
 */
async function scrapeSearchResults(req, res) {
  const userId = req.user.id;
  const { search_url } = req.body;

  logger.info('Search export endpoint hit', { userId, search_url });

  try {
    const result = await linkedinService.scrapeSearchResults(userId, search_url);
    return res.status(200).json(result);

  } catch (err) {
    // Rate limit exceeded
    if (err.statusCode === 429) {
      return res.status(429).json({
        success: false,
        error: err.message,
        limit: err.limitData?.limit || 100,
        used: err.limitData?.used || 0,
        reset_at: err.limitData?.resetAt || null
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
    logger.error('Search export failed', {
      userId,
      search_url,
      error: err.message
    });

    return res.status(500).json({
      success: false,
      error: 'Search scraping failed. Please try again.',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
}

/**
 * Scrape a list of LinkedIn profile URLs in bulk (max 50).
 *
 * @param {import('express').Request} req - Express request (req.user set by apiKeyAuth)
 * @param {import('express').Response} res - Express response
 * @returns {Promise<void>}
 */
async function scrapeBulk(req, res) {
  const userId = req.user.id;
  const { profile_urls } = req.body;

  logger.info('Bulk scrape endpoint hit', { userId, count: profile_urls?.length });

  // Validate input
  if (!profile_urls || !Array.isArray(profile_urls) || profile_urls.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'profile_urls must be a non-empty array'
    });
  }

  if (profile_urls.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 50 profile URLs per request'
    });
  }

  // Validate each URL is a LinkedIn profile URL
  const invalidUrls = profile_urls.filter(url =>
    !url || !url.includes('linkedin.com/in/')
  );
  if (invalidUrls.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'All URLs must be valid LinkedIn profile URLs (linkedin.com/in/)',
      invalid: invalidUrls.slice(0, 5)
    });
  }

  try {
    const result = await linkedinService.scrapeBulk(userId, profile_urls);
    return res.status(200).json(result);

  } catch (err) {
    if (err.statusCode === 429) {
      return res.status(429).json({
        success: false,
        error: err.message,
        limit: err.limitData?.limit || 100,
        used: err.limitData?.used || 0,
        reset_at: err.limitData?.resetAt || null
      });
    }

    if (err.message?.includes('cookie')) {
      return res.status(403).json({
        success: false,
        error: 'LinkedIn cookie not configured. Please add your cookie in the dashboard.'
      });
    }

    logger.error('Bulk scrape failed', { userId, error: err.message });
    return res.status(500).json({
      success: false,
      error: 'Bulk scraping failed. Please try again.',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
}

module.exports = { scrapeProfile, scrapeSearchResults, scrapeBulk };
