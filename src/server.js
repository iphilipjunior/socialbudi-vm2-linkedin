/**
 * @fileoverview Express server entry point for the SocialBudi LinkedIn Scraper service.
 * Configures middleware, routes, and starts the HTTP server.
 */

const express = require('express');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const linkedinRoutes = require('./routes/linkedin');

const app = express();

// Trust proxy (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Parse JSON bodies with 10mb limit (for bulk requests)
app.use(express.json({ limit: '10mb' }));

// CORS: allow all origins (internal API protected via API key)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  return next();
});

/**
 * Health check endpoint.
 * Returns service status, version, and current timestamp.
 *
 * @route GET /health
 * @returns {object} 200 - Health status object
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'socialbudi-linkedin-scraper',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount LinkedIn API routes
app.use('/api/linkedin', linkedinRoutes);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

/**
 * Starts the Express server on the configured port.
 *
 * @returns {import('http').Server} The HTTP server instance.
 */
const server = app.listen(PORT, () => {
  logger.info(`SocialBudi LinkedIn Scraper started on port ${PORT}`);
});

module.exports = server;
