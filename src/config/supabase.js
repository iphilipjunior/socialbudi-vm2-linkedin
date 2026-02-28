/**
 * @fileoverview Supabase client configuration.
 * Reads credentials from environment variables and throws on missing config.
 *
 * SECURITY WARNING: Never log SUPABASE_SERVICE_KEY or any credentials.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing required environment variable: SUPABASE_URL');
}

if (!supabaseServiceKey) {
  throw new Error('Missing required environment variable: SUPABASE_SERVICE_KEY');
}

/**
 * Initialized Supabase client using service role credentials.
 * Uses environment variables SUPABASE_URL and SUPABASE_SERVICE_KEY.
 *
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = supabase;
