/**
 * @fileoverview LinkedIn HTML parser service.
 * Extracts structured data from LinkedIn page HTML.
 * Full multi-selector implementation coming in Step 6.
 */

const logger = require('../utils/logger');

/**
 * Parse a LinkedIn profile page and extract structured data.
 * PLACEHOLDER — full multi-selector implementation in Step 6.
 *
 * @param {string} html - Raw HTML from a LinkedIn profile page
 * @returns {object} Parsed profile data (placeholder)
 */
function parseProfile(html) {
  logger.info('parseProfile called (placeholder)');
  return {
    placeholder: true,
    name: null,
    headline: null,
    location: null,
    about: null,
    experience: [],
    education: [],
    skills: [],
    message: 'Parser not yet implemented — coming in Step 6'
  };
}

/**
 * Parse LinkedIn search results page and extract profile list.
 * PLACEHOLDER — full implementation in Step 6.
 *
 * @param {string} html - Raw HTML from a LinkedIn search results page
 * @returns {object} Parsed search results (placeholder)
 */
function parseSearchResults(html) {
  logger.info('parseSearchResults called (placeholder)');
  return {
    placeholder: true,
    profiles: [],
    message: 'Search parser not yet implemented — coming in Step 6'
  };
}

module.exports = { parseProfile, parseSearchResults };
