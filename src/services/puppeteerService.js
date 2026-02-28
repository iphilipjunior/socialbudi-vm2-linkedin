/**
 * @fileoverview Puppeteer browser service.
 * Manages browser lifecycle for LinkedIn scraping.
 * Uses pre-installed Chromium snap at CHROMIUM_PATH.
 * ALWAYS use the launch config defined here — never change the args.
 */

const puppeteer = require('puppeteer-core');
const logger = require('../utils/logger');

/**
 * Puppeteer launch configuration.
 * Required for GCP e2-micro with snap Chromium.
 */
const LAUNCH_CONFIG = {
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
  ]
};

/**
 * Launch a new Chromium browser instance.
 *
 * @returns {Promise<import('puppeteer-core').Browser>} The browser instance
 * @throws {Error} If browser fails to launch
 */
async function launchBrowser() {
  logger.info('Launching browser', { executablePath: process.env.CHROMIUM_PATH });
  const browser = await puppeteer.launch(LAUNCH_CONFIG);
  logger.info('Browser launched');
  return browser;
}

/**
 * Create a new page with LinkedIn cookie and user agent set.
 *
 * @param {import('puppeteer-core').Browser} browser - Active browser instance
 * @param {string} cookie - LinkedIn li_at cookie value
 * @param {string|null} userAgent - Browser user agent string
 * @returns {Promise<import('puppeteer-core').Page>} Configured page
 */
async function createPage(browser, cookie, userAgent) {
  const page = await browser.newPage();

  if (userAgent) {
    await page.setUserAgent(userAgent);
  }

  await page.setCookie({
    name: 'li_at',
    value: cookie,
    domain: '.linkedin.com',
    path: '/',
    httpOnly: true,
    secure: true
  });

  page.setDefaultTimeout(30000);

  return page;
}

/**
 * Safely close a browser instance.
 *
 * @param {import('puppeteer-core').Browser} browser - Browser to close
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
 * Navigate to a LinkedIn profile URL.
 * PLACEHOLDER — full implementation in Step 7.
 *
 * @param {import('puppeteer-core').Page} page - Active page
 * @param {string} url - LinkedIn profile URL
 * @returns {Promise<object>} Placeholder response
 */
async function navigateToProfile(page, url) {
  logger.info('navigateToProfile called (placeholder)', { url });
  return { placeholder: true, message: 'Navigation not yet implemented — coming in Step 7' };
}

module.exports = { launchBrowser, createPage, closeBrowser, navigateToProfile };
