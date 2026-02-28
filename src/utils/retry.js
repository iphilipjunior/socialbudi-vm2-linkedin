/**
 * @fileoverview Retry utility for LinkedIn scraping operations.
 * Implements exponential backoff and random delay for anti-detection.
 */

const logger = require('../utils/logger');

/**
 * Retry an async function with exponential backoff.
 *
 * @param {Function} fn - Async function to retry
 * @param {object} [options] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of attempts
 * @param {number} [options.baseDelay=1000] - Base delay in ms
 * @param {number} [options.factor=2] - Exponential backoff factor
 * @returns {Promise<*>} Result of the successful function call
 * @throws {Error} The last error if all retries fail
 */
async function retry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000, factor = 2 } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(factor, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
          error: err.message,
          nextRetryMs: delay
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Wait for a random duration between min and max milliseconds.
 * Used between LinkedIn requests to mimic human behaviour.
 *
 * @param {number} [min=2000] - Minimum delay in ms
 * @param {number} [max=5000] - Maximum delay in ms
 * @returns {Promise<void>}
 */
function randomDelay(min = 2000, max = 5000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  logger.info(`Random delay: ${ms}ms`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { retry, randomDelay };
