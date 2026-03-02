/**
 * @fileoverview LinkedIn scraping service.
 * Orchestrates browser automation to scrape LinkedIn data.
 * Chains: rateLimiter → cookieManager → retry → puppeteerService → parser
 */

'use strict';

const puppeteerService = require('./puppeteerService');
const cookieManager = require('./cookieManager');
const parser = require('./parser');
const rateLimiter = require('./rateLimiter');
const retry = require('../utils/retry');
const logger = require('../utils/logger');

/**
 * Scrape a single LinkedIn profile.
 *
 * Flow:
 * 1. Check rate limit
 * 2. Fetch cookie from Supabase
 * 3. Apply random delay (anti-detection)
 * 4. Launch browser, create page
 * 5. Navigate to profile URL
 * 6. Parse profile data
 * 7. Update cookie last used (fire-and-forget)
 * 8. Increment rate limit counter
 * 9. Close browser (always — in finally block)
 *
 * @param {string} userId - User UUID from users.id
 * @param {string} profileUrl - Full LinkedIn profile URL
 * @returns {Promise<{success: boolean, data: object, scraped_at: string}>}
 * @throws {Error} On navigation failure, parse failure, or cookie missing
 */
async function scrapeProfile(userId, profileUrl) {
  logger.info('scrapeProfile started', { userId, profileUrl });

  // Step 1: Check rate limit
  const limitCheck = rateLimiter.checkLimit(userId);
  if (!limitCheck.allowed) {
    logger.warn('Rate limit exceeded for user', {
      userId,
      used: limitCheck.used,
      reset_at: limitCheck.reset_at
    });
    const err = new Error('Daily rate limit exceeded');
    err.statusCode = 429;
    err.limitData = limitCheck;
    throw err;
  }

  // Step 2: Fetch cookie
  const { cookie, userAgent } = await cookieManager.getUserCookie(userId);

  // Step 3: Random delay (anti-detection)
  await retry.randomDelay();

  let browser = null;

  try {
    // Step 4: Launch browser and create page
    browser = await puppeteerService.launchBrowser();
    const page = await puppeteerService.createPage(browser, cookie, userAgent);

    // Step 5: Navigate to profile
    logger.info('Navigating to LinkedIn profile', { profileUrl });
    await page.goto(profileUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Step 6: Parse profile data
    const profileData = await parser.parseProfile(page);

    // Step 7: Update cookie last used (fire-and-forget)
    cookieManager.updateCookieLastUsed(userId);

    // Step 8: Increment rate limit counter
    rateLimiter.incrementCount(userId);

    logger.info('scrapeProfile completed successfully', {
      userId,
      profileUrl,
      name: profileData.name || 'unknown'
    });

    return {
      success: true,
      data: profileData,
      scraped_at: new Date().toISOString()
    };

  } finally {
    // Step 9: Always close browser
    await puppeteerService.closeBrowser(browser);
  }
}

/**
 * Scrape all profiles from a LinkedIn search results page.
 *
 * Flow:
 * 1. Check rate limit
 * 2. Fetch cookie from Supabase
 * 3. Apply random delay (anti-detection)
 * 4. Launch browser, create page
 * 5. Navigate to search URL
 * 6. Parse search results
 * 7. Update cookie last used (fire-and-forget)
 * 8. Close browser (always — in finally block)
 * 9. Return results
 *
 * @param {string} userId - User UUID from users.id
 * @param {string} searchUrl - Full LinkedIn search results URL
 * @returns {Promise<{success: boolean, data: Array, count: number, scraped_at: string}>}
 * @throws {Error} On rate limit exceeded, navigation failure, or cookie missing
 */
async function scrapeSearchResults(userId, searchUrl) {
  logger.info('scrapeSearchResults started', { userId, searchUrl });

  // Step 1: Check rate limit (also increments the counter)
  const limitCheck = rateLimiter.checkRateLimit(userId);
  if (!limitCheck.allowed) {
    logger.warn('Rate limit exceeded for user', {
      userId,
      used: limitCheck.used,
      reset_at: limitCheck.resetAt
    });
    const err = new Error('Daily rate limit exceeded');
    err.statusCode = 429;
    err.limitData = limitCheck;
    throw err;
  }

  // Step 2: Fetch cookie
  const { cookie, userAgent } = await cookieManager.getUserCookie(userId);

  // Step 3: Random delay (anti-detection)
  await retry.randomDelay();

  let browser = null;

  try {
    // Step 4: Launch browser and create page
    browser = await puppeteerService.launchBrowser();
    const page = await puppeteerService.createPage(browser, cookie, userAgent);

    // Step 5: Navigate to search URL
    logger.info('Navigating to LinkedIn search URL', { searchUrl });
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    logger.info('Navigation completed');

    // Step 6: Parse search results
    const results = await parser.parseSearchResults(page);

    // Step 7: Update cookie last used (fire-and-forget)
    cookieManager.updateCookieLastUsed(userId);

    logger.info('scrapeSearchResults completed successfully', {
      userId,
      searchUrl,
      count: results.length
    });

    return {
      success: true,
      data: results,
      count: results.length,
      scraped_at: new Date().toISOString()
    };

  } catch (err) {
    logger.error('scrapeSearchResults threw', { error: err.message, stack: err.stack });
    throw err;
  } finally {
    // Step 8: Always close browser
    await puppeteerService.closeBrowser(browser);
  }
}

/**
 * Scrape a list of LinkedIn profile URLs in bulk.
 * PLACEHOLDER — full implementation in Step 9.
 *
 * @param {string} userId - User UUID
 * @param {string[]} profileUrls - Array of LinkedIn profile URLs
 * @returns {Promise<object>} Placeholder response
 */
async function scrapeBulk(userId, profileUrls) {
  logger.info('scrapeBulk called (placeholder)', { userId, count: profileUrls.length });
  return {
    placeholder: true,
    message: 'LinkedIn bulk scraping not yet implemented — coming in Step 9'
  };
}

module.exports = { scrapeProfile, scrapeSearchResults, scrapeBulk };
