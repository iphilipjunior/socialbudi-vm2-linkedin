/**
 * @fileoverview Supabase client initialization.
 * Reads credentials from environment variables and exits on missing config.
 *
 * SECURITY WARNING: Never log SUPABASE_SERVICE_KEY or any credentials.
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  logger.error('Missing required environment variable: SUPABASE_URL');
  process.exit(1);
}

if (!supabaseServiceKey) {
  logger.error('Missing required environment variable: SUPABASE_SERVICE_KEY');
  process.exit(1);
}

/**
 * Initialized Supabase client using service role credentials.
 * Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from process.env.
 * Exits the process with code 1 if either variable is missing.
 *
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

logger.info('Supabase client initialized');

module.exports = supabase;
