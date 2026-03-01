/**
 * @fileoverview LinkedIn HTML parser service.
 * Extracts structured data from LinkedIn profile and search result pages.
 * Uses multiple CSS selector fallbacks per field — LinkedIn changes selectors frequently.
 * Never throws on missing fields — returns empty string or empty array instead.
 */

'use strict';

const logger = require('../utils/logger');

// ─── PROFILE SELECTORS ──────────────────────────────────────────────────────
// Each field has 3 fallback selectors tried in order

const SELECTORS = {
  name: [
    'h1.top-card-layout__title',
    'h1.text-heading-xlarge',
    'h1.inline',
    '.pv-text-details__left-panel h1'
  ],
  headline: [
    '.top-card-layout__headline',
    '.top-card__subline-text',
    '.pv-text-details__left-panel .text-body-medium',
    'h2.top-card-layout__headline'
  ],
  location: [
    '.top-card__subline-item',
    '.profile-info-subline .not-first-middot span',
    '.pv-text-details__left-panel span.text-body-small'
  ],
  about: [
    '.core-section-container__content .with-line-breaks',
    '.summary__text',
    '#about ~ .display-flex .full-width'
  ],
  experience: {
    container: [
      '#experience ~ .experience__list li',
      '.experience-section ul > li',
      '#experience-section .experience-item'
    ],
    title: [
      '.t-bold span[aria-hidden="true"]',
      '.pv-entity__summary-info h3',
      'span.mr1.t-bold'
    ],
    company: [
      '.t-14.t-normal span[aria-hidden="true"]',
      '.pv-entity__secondary-title',
      '.t-14.t-normal.t-black--light span[aria-hidden="true"]'
    ],
    duration: [
      '.pvs-entity__caption-wrapper[aria-hidden="true"]',
      '.pv-entity__date-range span:not(:first-child)',
      '.t-14.t-normal.t-black--light:last-child span[aria-hidden="true"]'
    ]
  },
  education: {
    container: [
      '#education ~ .education__list li',
      '.education-section ul > li'
    ],
    school: [
      '.t-bold span[aria-hidden="true"]',
      '.pv-entity__school-name',
      'span.mr1.t-bold'
    ],
    degree: [
      '.t-14.t-normal span[aria-hidden="true"]',
      '.pv-entity__degree-name .pv-entity__comma-item',
      '.t-14.t-normal.t-black--light span[aria-hidden="true"]'
    ],
    years: [
      '.pvs-entity__caption-wrapper[aria-hidden="true"]',
      '.pv-entity__dates span:not(:first-child)',
      '.t-14.t-black--light span[aria-hidden="true"]'
    ]
  },
  skills: [
    '#skills ~ .skills__list .skills-section__skill',
    '.pv-skill-category-entity__name'
  ],
  searchResults: {
    container: [
      '.reusable-search__result-container li',
      '.search-results-container ul li.reusable-search__result-container',
      '.scaffold-finite-scroll__content ul li'
    ],
    name: [
      '.entity-result__title-text a span[aria-hidden="true"]',
      '.actor-name',
      '.entity-result__title-line span[aria-hidden="true"]'
    ],
    headline: [
      '.entity-result__primary-subtitle',
      '.subline-level-1',
      '.entity-result__summary'
    ],
    location: [
      '.entity-result__secondary-subtitle',
      '.subline-level-2',
      '.entity-result__topline .t-14:last-child'
    ],
    profileUrl: [
      '.entity-result__title-text a',
      '.app-aware-link',
      'a[data-control-name="search_srp_result"]'
    ]
  }
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Try multiple selectors in order, return first match text or fallback.
 *
 * @param {import('puppeteer-core').Page} page
 * @param {string[]} selectors
 * @param {string} fallback
 * @returns {Promise<string>}
 */
async function trySelectors(page, selectors, fallback = '') {
  for (const selector of selectors) {
    try {
      const text = await page.$eval(selector, el => el.innerText?.trim() || '');
      if (text) return text;
    } catch {
      // selector not found, try next
    }
  }
  return fallback;
}

/**
 * Try multiple selectors for a list of elements, return first match.
 *
 * @param {import('puppeteer-core').Page} page
 * @param {string[]} selectors
 * @returns {Promise<import('puppeteer-core').ElementHandle[]>}
 */
async function trySelectorsAll(page, selectors) {
  for (const selector of selectors) {
    try {
      const elements = await page.$$(selector);
      if (elements.length > 0) return elements;
    } catch {
      // selector not found, try next
    }
  }
  return [];
}

/**
 * Safely get text from an element handle using multiple selectors.
 *
 * @param {import('puppeteer-core').ElementHandle} element
 * @param {string[]} selectors
 * @param {string} fallback
 * @returns {Promise<string>}
 */
async function getTextFromElement(element, selectors, fallback = '') {
  for (const selector of selectors) {
    try {
      const text = await element.$eval(selector, el => el.innerText?.trim() || '');
      if (text) return text;
    } catch {
      // try next
    }
  }
  return fallback;
}

// ─── MAIN PARSER FUNCTIONS ───────────────────────────────────────────────────

/**
 * Parse a LinkedIn profile page into structured data.
 * Never throws — missing fields return empty string or empty array.
 *
 * @param {import('puppeteer-core').Page} page - Loaded LinkedIn profile page
 * @returns {Promise<object>} Structured profile data
 */
async function parseProfile(page) {
  logger.info('Parsing LinkedIn profile page');

  const profileUrl = page.url();

  // ── Basic fields ──
  const name = await trySelectors(page, SELECTORS.name);
  const headline = await trySelectors(page, SELECTORS.headline);
  const location = await trySelectors(page, SELECTORS.location);
  const about = await trySelectors(page, SELECTORS.about);

  // ── Experience ──
  const experience = [];
  try {
    const expItems = await trySelectorsAll(page, SELECTORS.experience.container);
    for (const item of expItems.slice(0, 10)) {
      const title = await getTextFromElement(item, SELECTORS.experience.title);
      const company = await getTextFromElement(item, SELECTORS.experience.company);
      const duration = await getTextFromElement(item, SELECTORS.experience.duration);
      if (title || company) {
        experience.push({ title, company, duration, location: '' });
      }
    }
  } catch (err) {
    logger.warn('Failed to parse experience section', { error: err.message });
  }

  // ── Education ──
  const education = [];
  try {
    const eduItems = await trySelectorsAll(page, SELECTORS.education.container);
    for (const item of eduItems.slice(0, 5)) {
      const school = await getTextFromElement(item, SELECTORS.education.school);
      const degree = await getTextFromElement(item, SELECTORS.education.degree);
      const years = await getTextFromElement(item, SELECTORS.education.years);
      if (school) {
        education.push({ school, degree, years });
      }
    }
  } catch (err) {
    logger.warn('Failed to parse education section', { error: err.message });
  }

  // ── Skills ──
  const skills = [];
  try {
    const skillElements = await trySelectorsAll(page, SELECTORS.skills);
    for (const el of skillElements.slice(0, 10)) {
      const skill = await el.evaluate(e => e.innerText?.trim() || '');
      if (skill) skills.push(skill);
    }
  } catch (err) {
    logger.warn('Failed to parse skills section', { error: err.message });
  }

  logger.info('Profile parsed successfully', {
    name: name || 'unknown',
    fieldsFound: {
      headline: !!headline,
      location: !!location,
      about: !!about,
      experience: experience.length,
      education: education.length,
      skills: skills.length
    }
  });

  return {
    name,
    headline,
    location,
    about,
    experience,
    education,
    skills,
    profile_url: profileUrl
  };
}

/**
 * Parse a LinkedIn search results page into an array of profile stubs.
 * Returns empty array if no results found — never throws.
 *
 * @param {import('puppeteer-core').Page} page - Loaded LinkedIn search results page
 * @returns {Promise<Array<{name: string, headline: string, location: string, profile_url: string}>>}
 */
async function parseSearchResults(page) {
  logger.info('Parsing LinkedIn search results page');

  const results = [];

  try {
    const items = await trySelectorsAll(page, SELECTORS.searchResults.container);

    for (const item of items) {
      try {
        const name = await getTextFromElement(item, SELECTORS.searchResults.name);
        const headline = await getTextFromElement(item, SELECTORS.searchResults.headline);
        const location = await getTextFromElement(item, SELECTORS.searchResults.location);

        // Get profile URL
        let profile_url = '';
        for (const selector of SELECTORS.searchResults.profileUrl) {
          try {
            profile_url = await item.$eval(selector, el => el.href || '');
            if (profile_url) break;
          } catch {
            // try next
          }
        }

        // Clean up LinkedIn tracking params from URL
        if (profile_url) {
          try {
            const url = new URL(profile_url);
            profile_url = `${url.origin}${url.pathname}`;
          } catch {
            // keep as-is
          }
        }

        if (name || profile_url) {
          results.push({ name, headline, location, profile_url });
        }
      } catch (err) {
        logger.warn('Failed to parse individual search result', { error: err.message });
      }
    }
  } catch (err) {
    logger.warn('Failed to parse search results page', { error: err.message });
  }

  logger.info(`Search results parsed: ${results.length} profiles found`);
  return results;
}

module.exports = { parseProfile, parseSearchResults };
