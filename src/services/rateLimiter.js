/**
 * @fileoverview In-memory rate limiter for LinkedIn scraping requests.
 * Enforces a daily limit of 100 profiles per user, resetting at midnight UTC.
 */

const logger = require('../utils/logger');

/** Maximum number of profile scrapes allowed per user per day. */
const DAILY_LIMIT = 100;

/**
 * In-memory store mapping user_id → { count, resetAt }.
 * @type {Map<string, { count: number, resetAt: number }>}
 */
const userLimits = new Map();

/**
 * Computes the Unix timestamp (ms) for the next midnight UTC.
 *
 * @returns {Date} Next midnight UTC as a Date object.
 */
function getResetTime() {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return midnight;
}

/**
 * Checks whether a user is within their daily rate limit and increments the counter.
 * Creates a new entry if none exists or if the existing entry has expired.
 *
 * @param {string} userId - The user's UUID (users.id).
 * @returns {{ allowed: boolean, used: number, limit: number, resetAt: Date }}
 */
function checkRateLimit(userId) {
  const now = Date.now();
  let entry = userLimits.get(userId);

  if (!entry || entry.resetAt < now) {
    const resetAt = getResetTime();
    entry = { count: 0, resetAt: resetAt.getTime() };
  }

  if (entry.count >= DAILY_LIMIT) {
    return {
      allowed: false,
      used: entry.count,
      limit: DAILY_LIMIT,
      resetAt: new Date(entry.resetAt)
    };
  }

  entry.count += 1;
  userLimits.set(userId, entry);

  return {
    allowed: true,
    used: entry.count,
    limit: DAILY_LIMIT,
    resetAt: new Date(entry.resetAt)
  };
}

/**
 * Returns the current rate limit status for a user without incrementing the counter.
 *
 * @param {string} userId - The user's UUID (users.id).
 * @returns {{ used: number, limit: number, resetAt: Date }}
 */
function getRateLimitStatus(userId) {
  const now = Date.now();
  const entry = userLimits.get(userId);

  if (!entry || entry.resetAt < now) {
    return { used: 0, limit: DAILY_LIMIT, resetAt: getResetTime() };
  }

  return {
    used: entry.count,
    limit: DAILY_LIMIT,
    resetAt: new Date(entry.resetAt)
  };
}

module.exports = { checkRateLimit, getRateLimitStatus };
