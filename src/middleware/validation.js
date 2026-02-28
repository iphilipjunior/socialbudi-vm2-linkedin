/**
 * @fileoverview Request validation middleware using express-validator.
 * Provides validation chains for LinkedIn profile URLs, search URLs, and bulk URL lists.
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation middleware for single LinkedIn profile URL.
 * Requires `profile_url` in the request body to be a valid LinkedIn profile URL
 * (must contain "linkedin.com/in/").
 *
 * @type {import('express-validator').ValidationChain[]}
 */
const validateProfileUrl = [
  body('profile_url')
    .notEmpty().withMessage('profile_url is required')
    .isString().withMessage('profile_url must be a string')
    .isURL().withMessage('profile_url must be a valid URL')
    .contains('linkedin.com/in/').withMessage('profile_url must be a valid LinkedIn profile URL (must contain linkedin.com/in/)')
];

/**
 * Validation middleware for LinkedIn search URL.
 * Requires `search_url` in the request body to be a valid LinkedIn search results URL
 * (must contain "linkedin.com/search/").
 *
 * @type {import('express-validator').ValidationChain[]}
 */
const validateSearchUrl = [
  body('search_url')
    .notEmpty().withMessage('search_url is required')
    .isString().withMessage('search_url must be a string')
    .isURL().withMessage('search_url must be a valid URL')
    .contains('linkedin.com/search/').withMessage('search_url must be a valid LinkedIn search URL (must contain linkedin.com/search/)')
];

/**
 * Validation middleware for bulk LinkedIn profile URLs.
 * Requires `profile_urls` in the request body to be an array of 1-50 valid LinkedIn URLs.
 * Each URL must contain "linkedin.com".
 *
 * @type {import('express-validator').ValidationChain[]}
 */
const validateBulkUrls = [
  body('profile_urls')
    .notEmpty().withMessage('profile_urls is required')
    .isArray({ min: 1, max: 50 }).withMessage('profile_urls must be an array with 1 to 50 items'),
  body('profile_urls.*')
    .isString().withMessage('Each profile URL must be a string')
    .isURL().withMessage('Each profile URL must be a valid URL')
    .contains('linkedin.com').withMessage('Each profile URL must be a valid LinkedIn URL (must contain linkedin.com)')
];

/**
 * Middleware that reads the result of express-validator validation chains
 * and returns a 400 response with validation errors if any exist.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 * @returns {void}
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  return next();
}

module.exports = {
  validateProfileUrl,
  validateSearchUrl,
  validateBulkUrls,
  handleValidationErrors
};
