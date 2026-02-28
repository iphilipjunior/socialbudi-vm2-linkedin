/**
 * @fileoverview Retry utility with exponential backoff and random delay helpers.
 * Used for resilient LinkedIn page navigation and scraping operations.
 */

const logger = require('../utils/logger');

/**
 * Retries an async function up to maxRetries times with exponential backoff.
 * Logs a warning on each failure. Throws the last error if all attempts fail.
 *
 * @param {() => Promise<any>} fn - The async function to retry.
 * @param {object} [options] - Retry configuration.
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts.
 * @param {number} [options.baseDelay=1000] - Base delay in milliseconds before first retry.
 * @param {number} [options.factor=2] - Exponential backoff multiplier.
 * @returns {Promise<any>} The result of the first successful call.
 * @throws {Error} The last error encountered after all retries are exhausted.
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
        logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          error: err.message,
          attempt: attempt + 1,
          maxRetries
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Returns a Promise that resolves after a random delay between min and max milliseconds.
 * Used to introduce human-like pauses between LinkedIn page requests.
 *
 * @param {number} [min=2000] - Minimum delay in milliseconds.
 * @param {number} [max=5000] - Maximum delay in milliseconds.
 * @returns {Promise<void>}
 */
function randomDelay(min = 2000, max = 5000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

module.exports = { retry, randomDelay };
