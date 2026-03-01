/**
 * @fileoverview Puppeteer browser management service.
 * Handles Chromium browser lifecycle for LinkedIn scraping.
 * Uses puppeteer-core with system Chromium (snap install).
 * Configured for GCP e2-micro VM constraints.
 */

'use strict';

const puppeteer = require('puppeteer-core');
const logger = require('../utils/logger');

// Default user agent if user has not set one
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// LinkedIn cookie domain
const LINKEDIN_DOMAIN = 'linkedin.com';

/**
 * Launch a Chromium browser instance.
 * Uses GCP VM safe flags — no sandbox, no GPU, no shared memory.
 *
 * @returns {Promise<import('puppeteer-core').Browser>} Browser instance
 * @throws {Error} If browser fails to launch
 */
async function launchBrowser() {
  const executablePath = process.env.CHROMIUM_PATH;

  if (!executablePath) {
    throw new Error('CHROMIUM_PATH environment variable is not set');
  }

  logger.info('Launching Chromium browser', { executablePath });

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    protocolTimeout: 60000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--mute-audio',
      '--no-default-browser-check',
      '--single-process'
    ]
  });

  logger.info('Chromium browser launched successfully');
  return browser;
}

/**
 * Create a new browser page with LinkedIn cookie and user agent injected.
 * Blocks images, fonts, and media to reduce bandwidth on e2-micro VM.
 *
 * @param {import('puppeteer-core').Browser} browser - Active browser instance
 * @param {string} cookie - LinkedIn li_at cookie value
 * @param {string|null} userAgent - Browser user agent string (uses default if null)
 * @returns {Promise<import('puppeteer-core').Page>} Configured page instance
 * @throws {Error} If page creation or cookie injection fails
 */
async function createPage(browser, cookie, userAgent) {
  const page = await browser.newPage();

  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });

  // Set user agent
  const ua = userAgent || DEFAULT_USER_AGENT;
  await page.setUserAgent(ua);

  // Set default navigation timeout (30 seconds)
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  // Inject LinkedIn li_at cookie
  await page.setCookie({
    name: 'li_at',
    value: cookie,
    domain: LINKEDIN_DOMAIN,
    path: '/',
    httpOnly: true,
    secure: true
  });

  // Block images, fonts, and media to save bandwidth on e2-micro
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  logger.info('Browser page created with cookie and user agent injected');
  return page;
}

/**
 * Close a browser instance cleanly.
 * Safe to call even if browser is already closed.
 * Never throws — logs warning on failure only.
 *
 * @param {import('puppeteer-core').Browser|null} browser - Browser instance to close
 * @returns {Promise<void>}
 */
async function closeBrowser(browser) {
  if (!browser) return;

  try {
    await browser.close();
    logger.info('Browser closed successfully');
  } catch (err) {
    logger.warn('Failed to close browser cleanly', { error: err.message });
  }
}

module.exports = { launchBrowser, createPage, closeBrowser };
