/**
 * @fileoverview Supabase client configuration.
 * Uses the service role key to bypass Row Level Security for backend operations.
 * SECURITY: Never log the SUPABASE_SERVICE_KEY value.
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  logger.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

logger.info('Supabase client initialized', { url: SUPABASE_URL });

module.exports = supabase;
