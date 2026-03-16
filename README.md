# SocialBudi VM2 — LinkedIn Scraper Service

A production-grade LinkedIn scraping microservice for the SocialBudi platform.
Runs on VM2 (`socialbudi-li.int.yt`), authenticates via API keys stored in Supabase,
and uses Puppeteer with a residential SOCKS5 proxy to render authenticated LinkedIn pages.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/linkedin/profile` | Scrape a single LinkedIn profile |
| POST | `/api/linkedin/search-export` | Export profiles from a LinkedIn search URL |
| POST | `/api/linkedin/bulk` | Scrape up to 50 profiles in one request |
| GET | `/health` | Health check (no auth required) |

All endpoints require the `X-API-Key` header.

---

## Rate Limiting

- **100 profiles per user per day** (resets at midnight UTC)
- Applies to `/profile` (1 per call) and `/bulk` (1 per URL)
- Returns `429 Too Many Requests` when limit is exceeded

---

## Authentication

Every request must include:

```
X-API-Key: <your-api-key>
```

API keys are validated against the `api_keys` table in Supabase.
The associated user record (`users` table) provides the LinkedIn session cookie.

---

## Tech Stack

| Component | Choice |
|-----------|--------|
| Runtime | Node.js 20 |
| HTTP framework | Express 4 |
| Browser automation | Puppeteer-extra + StealthPlugin |
| Proxy | Decodo SOCKS5 (`gate.decodo.com:7000`) |
| Browser | Chromium (snap) |
| Database / Auth | Supabase (PostgreSQL) |
| Logging | Winston (structured JSON) |
| Tests | Jest 29 + Supertest |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values.

```env
# Server
PORT=3000
NODE_ENV=production

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Decodo SOCKS5 Proxy
DECODO_SOCKS5_USER=your-socks5-username
DECODO_SOCKS5_PASS=your-socks5-password
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Start development server (nodemon)
npm run dev

# Start production server
npm start
```

---

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

All 49 tests should pass. No external services are called during tests — all
Supabase and Puppeteer interactions are mocked.

---

## Deployment

```bash
# On VM2 (Ubuntu)
git pull origin master
npm install --omit=dev
pm2 restart socialbudi-linkedin
```

Ensure the following are configured on the VM:
- Chromium installed via snap: `sudo snap install chromium`
- `.env` file present at the project root
- PM2 process manager running the service

---

## Project Structure

```
src/
  config/
    supabase.js          # Supabase client initialisation
  controllers/
    linkedinController.js # Express route handlers
  middleware/
    auth.js              # API key validation middleware
    rateLimiter.js       # Per-user daily rate limit (in-memory)
    validator.js         # express-validator rules
  routes/
    linkedin.js          # Route definitions
  services/
    cookieManager.js     # Fetch LinkedIn cookies from Supabase
    linkedinService.js   # Orchestrates browser + parser per use-case
    parser.js            # Extract structured data from rendered pages
    puppeteerService.js  # Launch browser, create authenticated page
  utils/
    activityLogger.js    # Fire-and-forget Supabase activity logging
    logger.js            # Winston logger
  server.js              # Express app + server startup
tests/
  unit/
    activityLogger.test.js
    parser.test.js
    rateLimiter.test.js
  integration/
    endpoints.test.js
docs/
  API_LINKEDIN.md        # Full API reference
  nginx.conf             # Reverse-proxy config for VM2
```

---

## License

Proprietary — SocialBudi. All rights reserved.
