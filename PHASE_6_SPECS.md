# Phase 6: VM2 LinkedIn Scraper — Specifications

## Overview

LinkedIn scraping microservice deployed on VM2 (`socialbudi-li.int.yt`, IP: 35.193.16.129).
Authenticates via API keys, fetches `li_at` cookies from Supabase, and scrapes LinkedIn using Puppeteer with Chromium.

## Endpoints

### POST /api/linkedin/profile
Scrape a single LinkedIn profile.

- **Auth**: `X-API-Key` header
- **Body**: `{ "profile_url": "https://www.linkedin.com/in/username/" }`
- **Response**: `{ success, data: { name, headline, location, about, experience[], education[], skills[], profile_url }, scraped_at }`
- **Rate limit**: counts 1 toward daily limit

### POST /api/linkedin/search-export
Scrape all profiles from a LinkedIn search results page.

- **Auth**: `X-API-Key` header
- **Body**: `{ "search_url": "https://www.linkedin.com/search/results/people/?keywords=CEO" }`
- **Response**: `{ success, total_scraped, profiles[], scraped_at }`
- **Rate limit**: each scraped profile counts toward daily limit

### POST /api/linkedin/bulk
Scrape a list of LinkedIn profile URLs (max 50).

- **Auth**: `X-API-Key` header
- **Body**: `{ "profile_urls": ["https://www.linkedin.com/in/user1/", ...] }`
- **Max**: 50 URLs per request
- **Response**: `{ success, total_requested, total_scraped, failed, profiles[], errors[] }`
- **Rate limit**: each scraped profile counts toward daily limit

## Authentication

API keys are validated against the Supabase `api_keys` table:
- `api_key` must match the `X-API-Key` header value
- `is_active` must be `true`
- `service` must be `'linkedin'` or `'all'`

The associated user must have `linkedin_cookie` configured (non-null, non-empty).

## Rate Limiting

- **Limit**: 100 profiles/day per user (all endpoints combined)
- **Storage**: in-memory `Map` keyed by `user_id`
- **Reset**: midnight UTC daily
- **429 Response**: `{ success: false, error, limit: 100, used, reset_at }`

## Browser Configuration

- **Browser**: Chromium installed via snap at `/snap/bin/chromium`
- **Library**: `puppeteer-core` (browser is pre-installed, NOT bundled)
- **Launch args**: `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-accelerated-2d-canvas`, `--no-first-run`, `--no-zygote`, `--disable-gpu`
- **Page timeout**: 30 seconds
- **Concurrency**: max 1 request per user at a time
- **Delay**: random 2000–5000ms between profile requests

## Database Schema (Supabase)

### users table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| full_name | text | |
| linkedin_cookie | text | nullable — the `li_at` session cookie |
| linkedin_user_agent | text | nullable — stored browser UA |
| cookie_updated_at | timestamptz | |

### api_keys table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | FK → users.id |
| api_key | text | |
| service | text | 'linkedin', 'ytdlp', 'instagram', 'enrichment', 'all' |
| is_active | boolean | |
| last_used_at | timestamptz | |

### system_logs table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | nullable |
| log_level | text | |
| action | text | |
| message | text | |
| metadata | jsonb | nullable |
| created_at | timestamptz | |

## Security Rules

- Never log cookie values (`li_at`)
- Never log API key values
- Never log JWT tokens
- Log user IDs only (not PII)
