/**
 * @fileoverview Puppeteer browser management service.
 * Handles Chromium browser lifecycle for LinkedIn scraping.
 * Uses puppeteer-extra + stealth plugin with system Chromium (snap install).
 * Configured for GCP e2-micro VM with Decodo SOCKS5 residential proxy.
 * Mobile iPhone UA is used — LinkedIn serves full content to mobile user agents.
 */

'use strict';

const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');

puppeteerExtra.use(StealthPlugin());

const LINKEDIN_DOMAIN = '.linkedin.com';

/**
 * Launch a local Chromium browser instance with Decodo SOCKS5 residential proxy.
 * Uses puppeteer-extra + stealth plugin to avoid bot detection.
 * SOCKS5 credentials are embedded in the proxy URL for tunnel auth.
 *
 * @returns {Promise<import('puppeteer-core').Browser>} Browser instance
 * @throws {Error} If CHROMIUM_PATH or SOCKS5 env vars are not set, or browser fails to launch
 */
async function launchBrowser() {
  const executablePath = process.env.CHROMIUM_PATH;
  const socks5User = process.env.DECODO_SOCKS5_USER;
  const socks5Pass = process.env.DECODO_SOCKS5_PASS;

  if (!executablePath) throw new Error('CHROMIUM_PATH environment variable is not set');
  if (!socks5User) throw new Error('DECODO_SOCKS5_USER environment variable is not set');
  if (!socks5Pass) throw new Error('DECODO_SOCKS5_PASS environment variable is not set');

  const proxyUrl = `socks5://${socks5User}:${socks5Pass}@gate.decodo.com:7000`;
  logger.info('Launching Chromium browser with Decodo SOCKS5 proxy');

  const browser = await puppeteerExtra.launch({
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

  logger.info('Browser launched with Decodo SOCKS5 proxy');
  return browser;
}

/**
 * Create a new browser page with mobile iPhone viewport, LinkedIn cookies injected.
 * Uses mobile UA — LinkedIn serves full content to mobile user agents.
 * Resource blocking is NOT set up here — caller must enable it post-navigation.
 * No page.authenticate() needed — SOCKS5 credentials are in the proxy URL.
 *
 * @param {import('puppeteer-core').Browser} browser - Active browser instance
 * @param {string} cookie - LinkedIn li_at cookie value
 * @param {string|null} userAgent - Ignored — mobile iPhone UA is always used
 * @param {string|null} jsessionid - LinkedIn JSESSIONID cookie value (optional)
 * @param {string|null} bcookie - LinkedIn bcookie value (optional)
 * @returns {Promise<import('puppeteer-core').Page>} Configured page instance
 * @throws {Error} If page creation or cookie injection fails
 */
async function createPage(browser, cookie, userAgent, jsessionid, bcookie) {
  const page = await browser.newPage();

  // Use mobile iPhone viewport and UA — LinkedIn serves full content to mobile
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });

  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  await page.setUserAgent(ua);

  // Set navigation timeouts
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);

  // Inject li_at cookie
  await page.setCookie({
    name: 'li_at',
    value: cookie,
    domain: LINKEDIN_DOMAIN,
    path: '/',
    httpOnly: true,
    secure: true
  });

  // Inject JSESSIONID if provided
  if (jsessionid) {
    await page.setCookie({
      name: 'JSESSIONID',
      value: jsessionid,
      domain: LINKEDIN_DOMAIN,
      path: '/',
      httpOnly: true,
      secure: true
    });
  }

  // Inject bcookie if provided
  if (bcookie) {
    await page.setCookie({
      name: 'bcookie',
      value: bcookie,
      domain: LINKEDIN_DOMAIN,
      path: '/',
      httpOnly: false,
      secure: false
    });
  }

  logger.info('All LinkedIn cookies injected', {
    has_jsessionid: !!jsessionid,
    has_bcookie: !!bcookie
  });

  logger.info('Browser page created with mobile UA and cookies injected');
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
