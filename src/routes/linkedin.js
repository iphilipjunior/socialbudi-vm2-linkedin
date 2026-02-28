/**
 * @fileoverview LinkedIn scraper API routes.
 * Mounts authentication, validation, and controller handlers for all three endpoints.
 */

const express = require('express');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const {
  validateProfileUrl,
  validateSearchUrl,
  validateBulkUrls,
  handleValidationErrors
} = require('../middleware/validation');
const linkedinController = require('../controllers/linkedinController');

const router = express.Router();

/**
 * @route POST /api/linkedin/profile
 * @description Scrape a single LinkedIn profile.
 * @access Private (X-API-Key required)
 * @body {string} profile_url - LinkedIn profile URL (must contain linkedin.com/in/)
 */
router.post(
  '/profile',
  apiKeyAuth,
  validateProfileUrl,
  handleValidationErrors,
  linkedinController.scrapeProfile
);

/**
 * @route POST /api/linkedin/search-export
 * @description Scrape all profiles from a LinkedIn search results page.
 * @access Private (X-API-Key required)
 * @body {string} search_url - LinkedIn search URL (must contain linkedin.com/search/)
 */
router.post(
  '/search-export',
  apiKeyAuth,
  validateSearchUrl,
  handleValidationErrors,
  linkedinController.scrapeSearchResults
);

/**
 * @route POST /api/linkedin/bulk
 * @description Scrape a list of LinkedIn profile URLs (max 50).
 * @access Private (X-API-Key required)
 * @body {string[]} profile_urls - Array of 1-50 LinkedIn profile URLs
 */
router.post(
  '/bulk',
  apiKeyAuth,
  validateBulkUrls,
  handleValidationErrors,
  linkedinController.scrapeBulk
);

module.exports = router;
