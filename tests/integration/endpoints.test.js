'use strict';

// Set port to 0 so the server binds to a random ephemeral port (avoids conflicts)
process.env.PORT = '0';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';

// ── Mocks (jest.mock calls are hoisted before requires) ──────────────────────

jest.mock('../../src/config/supabase', () => ({
  from: jest.fn()
}));

jest.mock('../../src/services/linkedinService', () => ({
  scrapeProfile: jest.fn().mockResolvedValue({
    success: true,
    data: {
      name: 'Test User',
      headline: 'Software Engineer',
      location: 'Lagos, Nigeria',
      about: '',
      experience: [],
      education: [],
      skills: [],
      profile_url: 'https://www.linkedin.com/in/testuser'
    },
    scraped_at: new Date().toISOString()
  }),
  scrapeSearchResults: jest.fn().mockResolvedValue({
    success: true,
    data: [],
    count: 0,
    scraped_at: new Date().toISOString()
  }),
  scrapeBulk: jest.fn().mockResolvedValue({
    success: true,
    total_requested: 1,
    total_scraped: 1,
    failed: 0,
    data: [],
    errors: [],
    scraped_at: new Date().toISOString()
  })
}));

// Fire-and-forget activity logger — don't let it interfere with request flow
jest.mock('../../src/utils/activityLogger', () => ({
  logActivity: jest.fn()
}));

// ── Module imports ────────────────────────────────────────────────────────────

const request = require('supertest');
const server = require('../../src/server');
const supabase = require('../../src/config/supabase');

// ── Helpers ───────────────────────────────────────────────────────────────────

// Builds a supabase chain mock that returns `resolvedValue` from `.single()`
// and handles the fire-and-forget `.update().eq().then().catch()` pattern
function makeChain(resolvedValue) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    single: jest.fn().mockResolvedValue(resolvedValue),
    // Support fire-and-forget: .update().eq().then(cb).catch(cb)
    then: jest.fn((cb) => {
      Promise.resolve({ error: null }).then(cb).catch(() => {});
      return { catch: jest.fn() };
    })
  };
  return chain;
}

const VALID_API_KEY_DATA = {
  id: 'key-id-001',
  user_id: 'user-id-001',
  service: 'linkedin',
  is_active: true,
  api_key: 'test-valid-key'
};

const VALID_USER_DATA = {
  id: 'user-id-001',
  full_name: 'Test User',
  linkedin_cookie: 'AQEDATxxxxxxxx',
  linkedin_user_agent: null
};

// Default mock: valid auth for every request
function setupValidAuth() {
  supabase.from.mockImplementation((table) => {
    if (table === 'api_keys') {
      return makeChain({ data: VALID_API_KEY_DATA, error: null });
    }
    if (table === 'users') {
      return makeChain({ data: VALID_USER_DATA, error: null });
    }
    if (table === 'system_logs') {
      return { insert: jest.fn().mockResolvedValue({ error: null }) };
    }
    return makeChain({ data: null, error: null });
  });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setupValidAuth();
});

afterAll((done) => {
  server.close(done);
});

// ── POST /api/linkedin/profile ────────────────────────────────────────────────

describe('POST /api/linkedin/profile', () => {
  it('returns 401 when X-API-Key header is missing', async () => {
    const res = await request(server)
      .post('/api/linkedin/profile')
      .send({ profile_url: 'https://www.linkedin.com/in/testuser' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when API key is invalid', async () => {
    // Make api_keys lookup return no data
    supabase.from.mockImplementation((table) => {
      if (table === 'api_keys') {
        return makeChain({ data: null, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const res = await request(server)
      .post('/api/linkedin/profile')
      .set('X-API-Key', 'invalid-key-value')
      .send({ profile_url: 'https://www.linkedin.com/in/testuser' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when profile_url is missing', async () => {
    const res = await request(server)
      .post('/api/linkedin/profile')
      .set('X-API-Key', 'test-valid-key')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when profile_url is not a LinkedIn profile URL', async () => {
    const res = await request(server)
      .post('/api/linkedin/profile')
      .set('X-API-Key', 'test-valid-key')
      .send({ profile_url: 'https://www.google.com/profile/someone' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with valid API key and LinkedIn profile URL', async () => {
    const res = await request(server)
      .post('/api/linkedin/profile')
      .set('X-API-Key', 'test-valid-key')
      .send({ profile_url: 'https://www.linkedin.com/in/testuser' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ── POST /api/linkedin/search-export ─────────────────────────────────────────

describe('POST /api/linkedin/search-export', () => {
  it('returns 401 when X-API-Key header is missing', async () => {
    const res = await request(server)
      .post('/api/linkedin/search-export')
      .send({ search_url: 'https://www.linkedin.com/search/results/people/?keywords=engineer' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when search_url is missing', async () => {
    const res = await request(server)
      .post('/api/linkedin/search-export')
      .set('X-API-Key', 'test-valid-key')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when search_url does not contain linkedin.com/search/', async () => {
    const res = await request(server)
      .post('/api/linkedin/search-export')
      .set('X-API-Key', 'test-valid-key')
      .send({ search_url: 'https://www.google.com/search?q=engineers' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with valid API key and LinkedIn search URL', async () => {
    const res = await request(server)
      .post('/api/linkedin/search-export')
      .set('X-API-Key', 'test-valid-key')
      .send({ search_url: 'https://www.linkedin.com/search/results/people/?keywords=engineer' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── POST /api/linkedin/bulk ───────────────────────────────────────────────────

describe('POST /api/linkedin/bulk', () => {
  it('returns 401 when X-API-Key header is missing', async () => {
    const res = await request(server)
      .post('/api/linkedin/bulk')
      .send({ profile_urls: ['https://www.linkedin.com/in/testuser'] });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when profile_urls is an empty array', async () => {
    const res = await request(server)
      .post('/api/linkedin/bulk')
      .set('X-API-Key', 'test-valid-key')
      .send({ profile_urls: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when profile_urls has more than 50 items', async () => {
    const urls = Array.from(
      { length: 51 },
      (_, i) => `https://www.linkedin.com/in/user-${i}`
    );
    const res = await request(server)
      .post('/api/linkedin/bulk')
      .set('X-API-Key', 'test-valid-key')
      .send({ profile_urls: urls });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when profile_urls contains non-LinkedIn URLs', async () => {
    const res = await request(server)
      .post('/api/linkedin/bulk')
      .set('X-API-Key', 'test-valid-key')
      .send({ profile_urls: ['https://www.google.com/profile/someone'] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when profile_urls is missing entirely', async () => {
    const res = await request(server)
      .post('/api/linkedin/bulk')
      .set('X-API-Key', 'test-valid-key')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with valid API key and one LinkedIn profile URL', async () => {
    const res = await request(server)
      .post('/api/linkedin/bulk')
      .set('X-API-Key', 'test-valid-key')
      .send({ profile_urls: ['https://www.linkedin.com/in/testuser'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.total_requested).toBe('number');
    expect(typeof res.body.total_scraped).toBe('number');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('accepts exactly 50 profile URLs (boundary)', async () => {
    const urls = Array.from(
      { length: 50 },
      (_, i) => `https://www.linkedin.com/in/user-${i}`
    );
    const res = await request(server)
      .post('/api/linkedin/bulk')
      .set('X-API-Key', 'test-valid-key')
      .send({ profile_urls: urls });

    expect(res.status).toBe(200);
  });
});

// ── GET /health ───────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with healthy status (no auth required)', async () => {
    const res = await request(server).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
  });
});
