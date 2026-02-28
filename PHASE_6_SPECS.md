# Phase 6 Specifications: LinkedIn Scraper

## Overview
LinkedIn scraping service on VM2. Authenticates via API keys, fetches li_at cookies
from Supabase, scrapes LinkedIn with Puppeteer.

## Endpoints

### POST /api/linkedin/profile
Scrape single LinkedIn profile.
Auth: X-API-Key header
Body: { "profile_url": "https://www.linkedin.com/in/username/" }
Response: { success, data: { name, headline, location, about, experience[], education[], skills[], profile_url }, scraped_at }
Rate limit: counts toward 100/day

### POST /api/linkedin/search
Scrape all profiles from LinkedIn search results URL.
Auth: X-API-Key header
Body: { "search_url": "https://www.linkedin.com/search/results/people/?keywords=CEO" }
Response: { success, total_scraped, profiles[], scraped_at }
Rate limit: each profile scraped counts toward 100/day

### POST /api/linkedin/bulk
Scrape list of profile URLs.
Auth: X-API-Key header
Body: { "profile_urls": ["https://www.linkedin.com/in/user1/", ...] }
Max: 50 URLs per request
Response: { success, total_requested, total_scraped, failed, profiles[], errors[] }
Rate limit: each profile counts toward 100/day

## Rate Limiting
- 100 profiles/day per user (all endpoints combined)
- Storage: in-memory Map keyed by user_id
- Reset: midnight UTC daily
- Response when exceeded: 429 with { success: false, error, limit, used, reset_at }

## Anti-Detection
- Random delay 2000-5000ms between each profile request
- Max 1 concurrent request per user
- User-agent from user's stored linkedin_user_agent (fallback: default Chrome UA)
- Page timeout: 30 seconds

## Error Handling
- Invalid cookie: return 401 with clear message
- Profile not found: include in errors array (bulk) or 404 (single)
- Timeout: retry up to 3 times with exponential backoff
- Rate limit exceeded: stop and return partial results (bulk/search)
