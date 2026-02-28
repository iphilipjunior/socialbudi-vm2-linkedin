/**
 * @fileoverview In-memory rate limiter for LinkedIn scraping.
 * Enforces a daily limit of 100 profiles per user, resetting at midnight UTC.
 * Uses a Map for storage — resets on server restart (acceptable for daily limits).
 */

const logger = require('../utils/logger');

const DAILY_LIMIT = 100;

/** @type {Map<string, {count: number, resetAt: number}>} */
const userLimits = new Map();

/**
 * Calculate the next midnight UTC as a Unix timestamp (ms).
 *
 * @returns {number} Timestamp of next midnight UTC
 */
function getResetTime() {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return midnight.getTime();
}

/**
 * Check and increment the rate limit for a user.
 * Returns whether the request is allowed and current usage stats.
 *
 * @param {string} userId - The user's UUID
 * @returns {{allowed: boolean, used: number, limit: number, resetAt: number}}
 */
function checkRateLimit(userId) {
  const now = Date.now();
  let entry = userLimits.get(userId);

  // Create or reset entry if expired
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: getResetTime() };
  }

  if (entry.count >= DAILY_LIMIT) {
    return {
      allowed: false,
      used: entry.count,
      limit: DAILY_LIMIT,
      resetAt: entry.resetAt
    };
  }

  entry.count += 1;
  userLimits.set(userId, entry);

  logger.info('Rate limit checked', { userId, used: entry.count, limit: DAILY_LIMIT });

  return {
    allowed: true,
    used: entry.count,
    limit: DAILY_LIMIT,
    resetAt: entry.resetAt
  };
}

/**
 * Get the current rate limit status for a user without incrementing.
 *
 * @param {string} userId - The user's UUID
 * @returns {{used: number, limit: number, resetAt: number, remaining: number}}
 */
function getRateLimitStatus(userId) {
  const now = Date.now();
  const entry = userLimits.get(userId);

  if (!entry || entry.resetAt <= now) {
    return { used: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT, resetAt: getResetTime() };
  }

  return {
    used: entry.count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - entry.count),
    resetAt: entry.resetAt
  };
}

module.exports = { checkRateLimit, getRateLimitStatus };
