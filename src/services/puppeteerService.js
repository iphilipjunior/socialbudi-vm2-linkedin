/**
 * @fileoverview Puppeteer browser management service.
 * Handles Chromium browser lifecycle for LinkedIn scraping.
 * Uses puppeteer-core with system Chromium (snap install) routed through
 * Bright Data residential proxy for anti-detection on search export.
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
 * Launch a Chromium browser instance routed through the Bright Data residential proxy.
 * Uses GCP VM safe flags — no sandbox, no GPU, no shared memory.
 * Proxy authentication is handled per-page via page.authenticate().
 *
 * @returns {Promise<import('puppeteer-core').Browser>} Browser instance
 * @throws {Error} If CHROMIUM_PATH, BRIGHTDATA_PROXY_HOST, or BRIGHTDATA_PROXY_PORT are not set
 */
async function launchBrowser() {
  const executablePath = process.env.CHROMIUM_PATH;
  const proxyHost = process.env.BRIGHTDATA_PROXY_HOST;
  const proxyPort = process.env.BRIGHTDATA_PROXY_PORT;

  if (!executablePath) {
    throw new Error('CHROMIUM_PATH environment variable is not set');
  }
  if (!proxyHost || !proxyPort) {
    throw new Error('BRIGHTDATA_PROXY_HOST and BRIGHTDATA_PROXY_PORT environment variables are required');
  }

  const proxyServer = `http://${proxyHost}:${proxyPort}`;

  logger.info('Launching Chromium with residential proxy', { executablePath, proxyHost, proxyPort });

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
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
      `--proxy-server=${proxyServer}`
    ]
  });

  logger.info('Browser launched with residential proxy');
  return browser;
}

/**
 * Create a new browser page with proxy authentication, LinkedIn cookie, and user agent injected.
 * Blocks images, fonts, media, and stylesheets to reduce bandwidth on e2-micro VM.
 *
 * @param {import('puppeteer-core').Browser} browser - Active browser instance
 * @param {string} cookie - LinkedIn li_at cookie value
 * @param {string|null} userAgent - Browser user agent string (uses default if null)
 * @returns {Promise<import('puppeteer-core').Page>} Configured page instance
 * @throws {Error} If page creation, proxy auth, or cookie injection fails
 */
async function createPage(browser, cookie, userAgent) {
  const page = await browser.newPage();

  // Authenticate with Bright Data residential proxy
  const proxyUsername = process.env.BRIGHTDATA_PROXY_USERNAME;
  const proxyPassword = process.env.BRIGHTDATA_PROXY_PASSWORD;
  await page.authenticate({ username: proxyUsername, password: proxyPassword });

  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });

  // Set user agent
  const ua = userAgent || DEFAULT_USER_AGENT;
  await page.setUserAgent(ua);

  // Set default navigation timeout (30 seconds)
  page.setDefaultNavigationTimeout(30000);
  page.setDefaultTimeout(30000);

  // Inject LinkedIn li_at cookie
  await page.setCookie({
    name: 'li_at',
    value: cookie,
    domain: LINKEDIN_DOMAIN,
    path: '/',
    httpOnly: true,
    secure: true
  });
  logger.info('LinkedIn cookie injected successfully');

  // Block images, fonts, media, and stylesheets to save bandwidth on e2-micro
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
