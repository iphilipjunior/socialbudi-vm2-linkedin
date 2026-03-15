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
  const limitCheck = rateLimiter.checkRateLimit(userId);
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
  const { cookie, jsessionid, bcookie, userAgent } = await cookieManager.getUserCookie(userId);

  // Step 3: Random delay (anti-detection)
  await retry.randomDelay();

  let browser = null;

  try {
    // Step 4: Launch browser and create page
    browser = await puppeteerService.launchBrowser();
    const page = await puppeteerService.createPage(browser, cookie, userAgent, jsessionid, bcookie);

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
  const { cookie, jsessionid, bcookie, userAgent } = await cookieManager.getUserCookie(userId);

  // Step 3: Random delay (anti-detection)
  await retry.randomDelay();

  let browser = null;

  try {
    // Step 4: Launch browser and create page
    browser = await puppeteerService.launchBrowser();
    logger.info('Browser launched with residential proxy');
    const page = await puppeteerService.createPage(browser, cookie, userAgent, jsessionid, bcookie);
    logger.info('Page created successfully');

    // Step 5: Navigate to search URL
    // Convert desktop URL to mobile URL for reliable content rendering
    const mobileUrl = searchUrl.replace('linkedin.com/search/', 'linkedin.com/m/search/');
    logger.info('Navigating to LinkedIn mobile search URL', { mobileUrl });
    await page.goto(mobileUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    logger.info('Navigation completed');

    // Wait 10s for LinkedIn mobile page to fully render profile cards
    // Profile cards appear at ~4s; resource blocking must not start before then
    await new Promise(r => setTimeout(r, 10000));
    logger.info('Post-navigation render wait complete');

    // Enable resource blocking AFTER page has fully rendered
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
    logger.info('Resource blocking enabled post-navigation');

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
 * Scrapes sequentially with random delay between each profile.
 * Partial success supported — failed profiles are logged but do not abort.
 * Rate limit is shared with scrapeProfile and scrapeSearchResults.
 *
 * @param {string} userId - User UUID from users.id
 * @param {string[]} profileUrls - Array of LinkedIn profile URLs (max 50)
 * @returns {Promise<{success: boolean, total_requested: number, total_scraped: number, failed: number, data: Array, errors: Array, scraped_at: string}>}
 * @throws {Error} On rate limit exceeded or cookie missing
 */
async function scrapeBulk(userId, profileUrls) {
  logger.info('scrapeBulk started', { userId, count: profileUrls.length });

  // Cap at 50 profiles per request
  const urls = profileUrls.slice(0, 50);

  // Check rate limit upfront — verify enough quota remains
  const limitCheck = rateLimiter.checkRateLimit(userId);
  if (!limitCheck.allowed) {
    const err = new Error('Daily rate limit exceeded');
    err.statusCode = 429;
    err.limitData = limitCheck;
    throw err;
  }

  // Fetch cookie once — reuse across all profiles
  const { cookie, jsessionid, bcookie, userAgent } = await cookieManager.getUserCookie(userId);

  const results = [];
  const errors = [];

  for (let i = 0; i < urls.length; i++) {
    const profileUrl = urls[i];

    // Check rate limit before each profile
    const check = rateLimiter.checkRateLimit(userId);
    if (!check.allowed) {
      logger.warn('Rate limit reached mid-bulk', { userId, scraped: i, remaining: urls.length - i });
      errors.push({ profile_url: profileUrl, error: 'Daily rate limit reached' });
      // Add remaining URLs to errors
      for (let j = i + 1; j < urls.length; j++) {
        errors.push({ profile_url: urls[j], error: 'Daily rate limit reached' });
      }
      break;
    }

    let browser = null;
    try {
      // Random delay between profiles (anti-detection)
      if (i > 0) await retry.randomDelay();

      browser = await puppeteerService.launchBrowser();
      const page = await puppeteerService.createPage(browser, cookie, userAgent, jsessionid, bcookie);

      logger.info('Navigating to profile', { profileUrl, index: i + 1, total: urls.length });
      await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      const profileData = await parser.parseProfile(page);
      results.push({ ...profileData, profile_url: profileUrl });
      logger.info('Profile scraped successfully', { profileUrl, name: profileData.name || 'unknown' });

    } catch (err) {
      logger.error('Failed to scrape profile', { profileUrl, error: err.message });
      errors.push({ profile_url: profileUrl, error: err.message });
    } finally {
      await puppeteerService.closeBrowser(browser);
    }
  }

  // Update cookie last used (fire-and-forget)
  cookieManager.updateCookieLastUsed(userId);

  logger.info('scrapeBulk completed', {
    userId,
    total_requested: urls.length,
    total_scraped: results.length,
    failed: errors.length
  });

  return {
    success: true,
    total_requested: urls.length,
    total_scraped: results.length,
    failed: errors.length,
    data: results,
    errors,
    scraped_at: new Date().toISOString()
  };
}

module.exports = { scrapeProfile, scrapeSearchResults, scrapeBulk };
