/**
 * @fileoverview Puppeteer browser management service.
 * Handles Chromium browser lifecycle for LinkedIn scraping.
 * Uses puppeteer-core with system Chromium (snap install).
 * Configured for GCP e2-micro VM with Bright Data residential proxy.
 */

'use strict';

const puppeteer = require('puppeteer-core');
const logger = require('../utils/logger');

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const LINKEDIN_DOMAIN = 'linkedin.com';

/**
 * Launch a local Chromium browser instance with Bright Data residential proxy.
 * Proxy routes all traffic through residential IPs for LinkedIn anti-detection.
 *
 * @returns {Promise<import('puppeteer-core').Browser>} Browser instance
 * @throws {Error} If CHROMIUM_PATH or proxy env vars are not set, or browser fails to launch
 */
async function launchBrowser() {
  const executablePath = process.env.CHROMIUM_PATH;
  const proxyHost = process.env.BRIGHTDATA_PROXY_HOST;
  const proxyPort = process.env.BRIGHTDATA_PROXY_PORT;

  const proxyUsername = process.env.BRIGHTDATA_PROXY_USERNAME;
  const proxyPassword = process.env.BRIGHTDATA_PROXY_PASSWORD;

  if (!executablePath) throw new Error('CHROMIUM_PATH environment variable is not set');
  if (!proxyHost) throw new Error('BRIGHTDATA_PROXY_HOST environment variable is not set');
  if (!proxyPort) throw new Error('BRIGHTDATA_PROXY_PORT environment variable is not set');
  if (!proxyUsername) throw new Error('BRIGHTDATA_PROXY_USERNAME environment variable is not set');
  if (!proxyPassword) throw new Error('BRIGHTDATA_PROXY_PASSWORD environment variable is not set');

  const proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
  logger.info('Launching Chromium browser with residential proxy', { proxyHost, proxyPort });

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    protocolTimeout: 60000,
    args: [
      `--proxy-server=${proxyUrl}`,
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

  logger.info('Browser launched with residential proxy');
  return browser;
}

/**
 * Create a new browser page with proxy authentication, LinkedIn cookie, and user agent injected.
 * Authenticates with Bright Data residential proxy credentials.
 * Injects li_at session cookie for LinkedIn authentication.
 * Blocks images, fonts, media, and stylesheets to reduce bandwidth on e2-micro VM.
 *
 * @param {import('puppeteer-core').Browser} browser - Active browser instance
 * @param {string} cookie - LinkedIn li_at cookie value
 * @param {string|null} userAgent - Browser user agent string (uses default if null)
 * @returns {Promise<import('puppeteer-core').Page>} Configured page instance
 * @throws {Error} If page creation, proxy auth, or cookie injection fails
 */
async function createPage(browser, cookie, userAgent) {
  const proxyUsername = process.env.BRIGHTDATA_PROXY_USERNAME;
  const proxyPassword = process.env.BRIGHTDATA_PROXY_PASSWORD;

  if (!proxyUsername) throw new Error('BRIGHTDATA_PROXY_USERNAME environment variable is not set');
  if (!proxyPassword) throw new Error('BRIGHTDATA_PROXY_PASSWORD environment variable is not set');

  const page = await browser.newPage();

  // Authenticate with residential proxy
  await page.authenticate({ username: proxyUsername, password: proxyPassword });
  logger.info('Proxy authentication set');

  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });

  // Set user agent
  const ua = userAgent || DEFAULT_USER_AGENT;
  await page.setUserAgent(ua);

  // Set navigation timeouts
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  // Inject LinkedIn li_at session cookie
  await page.setCookie({
    name: 'li_at',
    value: cookie,
    domain: LINKEDIN_DOMAIN,
    path: '/',
    httpOnly: true,
    secure: true
  });
  logger.info('LinkedIn cookie injected successfully');

  // Block images, fonts, media, and stylesheets to save bandwidth
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  logger.info('Browser page created with proxy auth, cookie, and user agent injected');
  return page;
}

/**
 * Close a browser instance cleanly.
 * Safe to call even if browser is already closed or null.
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
