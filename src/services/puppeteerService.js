/**
 * @fileoverview Puppeteer browser service.
 * Manages Chromium browser lifecycle using puppeteer-core with the system-installed Chromium.
 * CHROMIUM_PATH must be set in environment (e.g. /snap/bin/chromium).
 */

const puppeteer = require('puppeteer-core');
const logger = require('../utils/logger');

/**
 * Standard Chromium launch arguments for a headless, sandboxless environment.
 * Required for running on VM2 without a display.
 */
const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu'
];

/**
 * Launches a new Chromium browser instance using the path from CHROMIUM_PATH.
 *
 * @returns {Promise<import('puppeteer-core').Browser>} The launched browser instance.
 * @throws {Error} If CHROMIUM_PATH is not set or launch fails.
 */
async function launchBrowser() {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    args: LAUNCH_ARGS
  });
  logger.info('Browser launched');
  return browser;
}

/**
 * Creates a new page in the browser, configures user agent, sets the LinkedIn
 * session cookie, and applies a navigation timeout.
 *
 * @param {import('puppeteer-core').Browser} browser - The active browser instance.
 * @param {string} cookie - The li_at session cookie value.
 * @param {string|null} userAgent - The user agent string to use (or null for default).
 * @returns {Promise<import('puppeteer-core').Page>} The configured page.
 */
async function createPage(browser, cookie, userAgent) {
  const page = await browser.newPage();

  if (userAgent) {
    await page.setUserAgent(userAgent);
  }

  await page.setCookie({
    name: 'li_at',
    value: cookie,
    domain: '.linkedin.com'
  });

  page.setDefaultNavigationTimeout(30000);

  return page;
}

/**
 * Safely closes the browser instance. Swallows errors and logs them as warnings.
 *
 * @param {import('puppeteer-core').Browser} browser - The browser instance to close.
 * @returns {Promise<void>}
 */
async function closeBrowser(browser) {
  try {
    await browser.close();
    logger.info('Browser closed');
  } catch (err) {
    logger.warn('Error closing browser', { error: err.message });
  }
}

/**
 * PLACEHOLDER: Navigate to a LinkedIn profile URL and return the page content.
 * Full implementation coming in Step 7.
 *
 * @param {import('puppeteer-core').Page} page - The configured Puppeteer page.
 * @param {string} url - The LinkedIn URL to navigate to.
 * @returns {Promise<object>} Placeholder response object.
 */
async function navigateToProfile(page, url) {
  return {
    placeholder: true,
    message: 'Navigation not yet implemented'
  };
}

module.exports = { launchBrowser, createPage, closeBrowser, navigateToProfile };
