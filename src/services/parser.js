/**
 * @fileoverview HTML parser for LinkedIn pages.
 * Extracts structured data from profile and search result HTML.
 * PLACEHOLDER — full implementation coming in Step 6.
 */

const logger = require('../utils/logger');

/**
 * PLACEHOLDER: Parses a LinkedIn profile page HTML and extracts structured data.
 * Full implementation coming in Step 6.
 *
 * @param {string} html - Raw HTML content of a LinkedIn profile page.
 * @returns {object} Placeholder object with null fields.
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
    message: 'Parser not yet implemented - coming in Step 6'
  };
}

/**
 * PLACEHOLDER: Parses a LinkedIn search results page HTML and extracts profile list.
 * Full implementation coming in Step 6.
 *
 * @param {string} html - Raw HTML content of a LinkedIn search results page.
 * @returns {object} Placeholder object with empty profiles array.
 */
function parseSearchResults(html) {
  logger.info('parseSearchResults called (placeholder)');
  return {
    placeholder: true,
    profiles: [],
    message: 'Parser not yet implemented - coming in Step 6'
  };
}

module.exports = { parseProfile, parseSearchResults };
