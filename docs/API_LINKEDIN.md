# LinkedIn Scraper API Reference

Base URL: `https://socialbudi-li.int.yt`

All endpoints (except `/health`) require the `X-API-Key` header.

---

## Authentication

```
X-API-Key: <your-api-key>
```

| Status | Meaning |
|--------|---------|
| `401` | Missing or invalid API key |
| `429` | Daily rate limit exceeded (100 profiles/day) |

---

## POST /api/linkedin/profile

Scrape a single LinkedIn profile page and return structured data.

### Request

```http
POST /api/linkedin/profile
Content-Type: application/json
X-API-Key: your-api-key
```

```json
{
  "profile_url": "https://www.linkedin.com/in/satya-nadella"
}
```

### Validation

| Field | Rule |
|-------|------|
| `profile_url` | Required. Must contain `linkedin.com/in/`. |

### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "name": "Satya Nadella",
    "headline": "Chairman and CEO at Microsoft",
    "location": "Redmond, Washington, United States",
    "about": "In everything I do, I seek to build clarity, energy, and success...",
    "experience": [
      {
        "title": "Chairman and CEO",
        "company": "Microsoft",
        "duration": "Feb 2014 – Present · 10 yrs",
        "location": "Redmond, Washington, United States"
      }
    ],
    "education": [
      {
        "school": "University of Chicago Booth School of Business",
        "degree": "Master of Business Administration - MBA",
        "years": "1997"
      }
    ],
    "skills": ["Cloud Computing", "Strategy", "Leadership"],
    "profile_url": "https://www.linkedin.com/in/satya-nadella"
  },
  "scraped_at": "2025-01-15T10:30:00.000Z"
}
```

### Response — 400 Bad Request

```json
{
  "success": false,
  "errors": [
    {
      "field": "profile_url",
      "message": "profile_url must be a valid LinkedIn profile URL"
    }
  ]
}
```

### Response — 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to scrape profile"
}
```

---

## POST /api/linkedin/search-export

Scrape all visible profile cards from a LinkedIn people-search results page.

### Request

```http
POST /api/linkedin/search-export
Content-Type: application/json
X-API-Key: your-api-key
```

```json
{
  "search_url": "https://www.linkedin.com/search/results/people/?keywords=software+engineer&location=Nigeria"
}
```

### Validation

| Field | Rule |
|-------|------|
| `search_url` | Required. Must contain `linkedin.com/search/`. |

### Response — 200 OK

```json
{
  "success": true,
  "data": [
    {
      "name": "Alice Smith",
      "headline": "Senior Software Engineer at Paystack",
      "location": "Lagos, Nigeria",
      "profile_url": "https://www.linkedin.com/in/alice-smith"
    },
    {
      "name": "Bob Jones",
      "headline": "Backend Engineer at Flutterwave",
      "location": "Abuja, Nigeria",
      "profile_url": "https://www.linkedin.com/in/bob-jones"
    }
  ],
  "count": 2,
  "scraped_at": "2025-01-15T10:31:00.000Z"
}
```

Returns an empty `data` array (not an error) if no profile cards are found.

### Response — 400 Bad Request

```json
{
  "success": false,
  "errors": [
    {
      "field": "search_url",
      "message": "search_url must be a valid LinkedIn search URL"
    }
  ]
}
```

---

## POST /api/linkedin/bulk

Scrape up to 50 LinkedIn profiles in a single request. Profiles are scraped
sequentially to respect LinkedIn rate limits. Partial success is supported —
failed profiles are reported in `errors` without failing the whole request.

### Request

```http
POST /api/linkedin/bulk
Content-Type: application/json
X-API-Key: your-api-key
```

```json
{
  "profile_urls": [
    "https://www.linkedin.com/in/satya-nadella",
    "https://www.linkedin.com/in/jeff-weiner-b36c"
  ]
}
```

### Validation

| Field | Rule |
|-------|------|
| `profile_urls` | Required array. Min 1, max 50 items. Each must contain `linkedin.com/in/`. |

### Response — 200 OK

```json
{
  "success": true,
  "total_requested": 2,
  "total_scraped": 2,
  "failed": 0,
  "data": [
    {
      "name": "Satya Nadella",
      "headline": "Chairman and CEO at Microsoft",
      "location": "Redmond, Washington, United States",
      "about": "",
      "experience": [],
      "education": [],
      "skills": [],
      "profile_url": "https://www.linkedin.com/in/satya-nadella"
    }
  ],
  "errors": [],
  "scraped_at": "2025-01-15T10:32:00.000Z"
}
```

When some profiles fail:

```json
{
  "success": true,
  "total_requested": 2,
  "total_scraped": 1,
  "failed": 1,
  "data": [ ... ],
  "errors": [
    {
      "url": "https://www.linkedin.com/in/jeff-weiner-b36c",
      "error": "Navigation timeout exceeded"
    }
  ],
  "scraped_at": "2025-01-15T10:33:00.000Z"
}
```

### Response — 400 Bad Request (empty array)

```json
{
  "success": false,
  "errors": [
    {
      "field": "profile_urls",
      "message": "profile_urls must be a non-empty array"
    }
  ]
}
```

### Response — 400 Bad Request (exceeds limit)

```json
{
  "success": false,
  "errors": [
    {
      "field": "profile_urls",
      "message": "profile_urls must contain at most 50 URLs"
    }
  ]
}
```

### Response — 429 Too Many Requests

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "limit": 100,
  "used": 100,
  "remaining": 0,
  "reset_at": "2025-01-16T00:00:00.000Z"
}
```

---

## GET /health

Health check endpoint. No authentication required.

### Request

```http
GET /health
```

### Response — 200 OK

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Error Reference

| HTTP Status | `success` | Meaning |
|-------------|-----------|---------|
| 200 | `true` | Request succeeded |
| 400 | `false` | Validation error — check `errors` array |
| 401 | `false` | Missing or invalid `X-API-Key` |
| 429 | `false` | Daily rate limit exceeded |
| 500 | `false` | Server-side scraping failure |

---

## Notes

- All timestamps are ISO 8601 UTC strings.
- Profile fields (`about`, `experience`, `education`, `skills`) may be empty strings
  or empty arrays if LinkedIn did not render that section.
- Profile URLs returned in search results have tracking query parameters stripped
  (everything after `?` is removed).
- The service uses a mobile iPhone user-agent; LinkedIn renders a text-heavy mobile
  layout which is more stable for automated extraction than the desktop SPA.
