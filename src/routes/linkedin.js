/**
 * @fileoverview LinkedIn scraper API routes.
 * Defines endpoints for profile scraping, search scraping, and bulk scraping.
 * Controllers are wired in later implementation steps.
 */

const express = require('express');

const router = express.Router();

/**
 * @route POST /api/linkedin/profile
 * @description Scrape a single LinkedIn profile.
 * @access Private (API key required)
 * @body {string} profile_url - LinkedIn profile URL (linkedin.com/in/username)
 * @returns {object} 501 - Not yet implemented
 */
router.post('/profile', (req, res) => {
  return res.status(501).json({
    success: false,
    error: 'Not yet implemented'
  });
});

/**
 * @route POST /api/linkedin/search
 * @description Scrape all profiles from a LinkedIn search results URL.
 * @access Private (API key required)
 * @body {string} search_url - LinkedIn search results URL (linkedin.com/search/)
 * @returns {object} 501 - Not yet implemented
 */
router.post('/search', (req, res) => {
  return res.status(501).json({
    success: false,
    error: 'Not yet implemented'
  });
});

/**
 * @route POST /api/linkedin/bulk
 * @description Scrape a list of LinkedIn profile URLs (max 50).
 * @access Private (API key required)
 * @body {string[]} profile_urls - Array of LinkedIn profile URLs (1-50 items)
 * @returns {object} 501 - Not yet implemented
 */
router.post('/bulk', (req, res) => {
  return res.status(501).json({
    success: false,
    error: 'Not yet implemented'
  });
});

module.exports = router;
