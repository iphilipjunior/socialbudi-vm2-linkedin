# SocialBudi VM2 - LinkedIn Scraper

LinkedIn profile scraping service for the SocialBudi platform. Runs on VM2 (`socialbudi-li.int.yt`) and authenticates requests via API keys stored in Supabase.

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/iphilipjunior/socialbudi-vm2-linkedin.git
cd socialbudi-vm2-linkedin

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in your SUPABASE_URL and SUPABASE_SERVICE_KEY

# 4. Start with PM2
pm2 start ecosystem.config.js
```

## API Endpoints

All endpoints require an `X-API-Key` header with a valid API key.

### Health Check

```
GET /health
```

Returns service status. No authentication required.

### Scrape Single Profile

```
POST /api/linkedin/profile
Content-Type: application/json
X-API-Key: your-api-key

{
  "profile_url": "https://www.linkedin.com/in/username/"
}
```

### Search Export

```
POST /api/linkedin/search-export
Content-Type: application/json
X-API-Key: your-api-key

{
  "search_url": "https://www.linkedin.com/search/results/people/?keywords=CEO"
}
```

### Bulk Profile Scrape

```
POST /api/linkedin/bulk
Content-Type: application/json
X-API-Key: your-api-key

{
  "profile_urls": [
    "https://www.linkedin.com/in/user1/",
    "https://www.linkedin.com/in/user2/"
  ]
}
```

Maximum 50 URLs per request.

## Authentication

All scraping endpoints require an `X-API-Key` header. The key must exist in the `api_keys` table in Supabase with `is_active = true` and `service` set to `'linkedin'` or `'all'`.

## Rate Limits

- **100 profiles per day** per user (all endpoints combined)
- Resets at **midnight UTC**
- Exceeding the limit returns HTTP 429

## Deployment

```bash
# Deploy latest changes
./deploy.sh

# View logs
pm2 logs socialbudi-linkedin

# Monitor
pm2 monit
```
