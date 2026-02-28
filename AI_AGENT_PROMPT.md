# SocialBudi VM2 LinkedIn Scraper - Agent Rules

## Project
LinkedIn scraping service for SocialBudi platform.
VM2: socialbudi-li.int.yt (35.193.16.129)
Deploy path: /var/www/linkedin-scraper

## Completed Phases
- Phase 6 Step 2: Foundation ✅ (Express server, health endpoint, logger, Supabase config)

## In Progress
- Phase 6 Step 3+: Core scraping services

## Critical Rules
1. CHROMIUM_PATH comes from process.env.CHROMIUM_PATH (value: /snap/bin/chromium)
2. Use puppeteer-core (NOT puppeteer) - browser is pre-installed as snap
3. Never log cookie values - log "Fetched cookie for user {user_id}" only
4. Never log API keys or tokens
5. Database primary key in users table is `id` (NOT user_id)
6. API keys validated against api_keys table: check service = 'linkedin' OR service = 'all'
7. Rate limit: 100 profiles/day per user, stored in-memory, resets at midnight UTC
8. Random delay between requests: 2000-5000ms
9. Max retries: 3 with exponential backoff
10. Page timeout: 30 seconds
11. Only 1 concurrent Puppeteer request per user

## Database Schema (Supabase)
Users table key fields:
- id (uuid, primary key)
- full_name (text)
- linkedin_cookie (text, nullable)
- linkedin_user_agent (text, nullable)
- cookie_updated_at (timestamptz)

API Keys table:
- id (uuid)
- user_id (uuid, FK to users.id)
- api_key (text)
- service (text: 'linkedin', 'ytdlp', 'instagram', 'enrichment', 'all')
- is_active (boolean)
- last_used_at (timestamptz)

System Logs table:
- id (uuid)
- user_id (uuid, nullable)
- log_level (text)
- action (text)
- message (text)
- metadata (jsonb, nullable)
- created_at (timestamptz)

## Puppeteer Launch Config (ALWAYS use this)
{
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
  ]
}
