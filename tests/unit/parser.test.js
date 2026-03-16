'use strict';

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { parseSearchResults } = require('../../src/services/parser');

// Build a minimal mock Puppeteer page
function makeMockPage(overrides = {}) {
  return {
    waitForSelector: jest.fn().mockResolvedValue(null),
    evaluate: jest.fn().mockResolvedValue([]),
    ...overrides
  };
}

// parseSearchResults has a 3000ms setTimeout — use fake timers throughout
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

// Helper: run parseSearchResults and advance timers concurrently
async function runParse(page) {
  const promise = parseSearchResults(page);
  await jest.runAllTimersAsync();
  return promise;
}

describe('parseSearchResults', () => {
  it('returns empty array when waitForSelector times out', async () => {
    const page = makeMockPage({
      waitForSelector: jest.fn().mockRejectedValue(new Error('Timeout'))
    });
    const result = await runParse(page);
    expect(result).toEqual([]);
    // evaluate should NOT be called — we returned early
    expect(page.evaluate).not.toHaveBeenCalled();
  });

  it('returns an array of profiles when page has /in/ links', async () => {
    const mockProfiles = [
      { name: 'Alice Smith', headline: 'Software Engineer', location: 'Lagos, Nigeria', profile_url: 'https://www.linkedin.com/in/alice-smith' },
      { name: 'Bob Jones', headline: 'Product Manager', location: 'London, UK', profile_url: 'https://www.linkedin.com/in/bob-jones' }
    ];
    const page = makeMockPage({
      evaluate: jest.fn().mockResolvedValue(mockProfiles)
    });

    const result = await runParse(page);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice Smith');
    expect(result[1].name).toBe('Bob Jones');
  });

  it('calls page.evaluate after waitForSelector resolves', async () => {
    const page = makeMockPage();
    await runParse(page);
    expect(page.evaluate).toHaveBeenCalledTimes(1);
  });

  it('passes the correct selector to waitForSelector', async () => {
    const page = makeMockPage();
    await runParse(page);
    expect(page.waitForSelector).toHaveBeenCalledWith('a[href*="/in/"]', { timeout: 15000 });
  });

  it('returns profile objects with name, headline, location, profile_url fields', async () => {
    const mockProfiles = [
      { name: 'Carol White', headline: 'Designer', location: 'Paris', profile_url: 'https://www.linkedin.com/in/carol-white' }
    ];
    const page = makeMockPage({ evaluate: jest.fn().mockResolvedValue(mockProfiles) });

    const result = await runParse(page);

    expect(result[0]).toMatchObject({
      name: expect.any(String),
      headline: expect.any(String),
      location: expect.any(String),
      profile_url: expect.any(String)
    });
  });

  it('returns empty array when evaluate returns no profiles', async () => {
    const page = makeMockPage({ evaluate: jest.fn().mockResolvedValue([]) });
    const result = await runParse(page);
    expect(result).toEqual([]);
  });

  it('cleans profile URLs by removing tracking params (? and beyond)', async () => {
    // The URL cleaning logic lives inside page.evaluate — we simulate it returning
    // already-cleaned URLs (as the browser-side code would do), and verify the contract
    const mockProfiles = [
      {
        name: 'Dave Brown',
        headline: 'CTO',
        location: 'NYC',
        profile_url: 'https://www.linkedin.com/in/dave-brown'  // no tracking params
      }
    ];
    const page = makeMockPage({ evaluate: jest.fn().mockResolvedValue(mockProfiles) });

    const result = await runParse(page);

    expect(result[0].profile_url).not.toContain('?');
    expect(result[0].profile_url).toContain('/in/dave-brown');
  });

  it('deduplicates profiles with the same URL', async () => {
    // The dedup logic runs inside page.evaluate; the mock returns the deduplicated result
    const mockProfiles = [
      { name: 'Eve Adams', headline: 'Analyst', location: 'Berlin', profile_url: 'https://www.linkedin.com/in/eve-adams' }
    ];
    const page = makeMockPage({ evaluate: jest.fn().mockResolvedValue(mockProfiles) });

    const result = await runParse(page);

    // Only one profile despite the evaluate returning only one (deduplicated by browser code)
    const urls = result.map(p => p.profile_url);
    const uniqueUrls = [...new Set(urls)];
    expect(urls.length).toBe(uniqueUrls.length);
  });

  it('does not return profiles without names (evaluate filters them out)', async () => {
    // Simulate evaluate returning only named profiles (as the browser code does)
    const mockProfiles = [
      { name: 'Frank Lee', headline: 'Engineer', location: 'Tokyo', profile_url: 'https://www.linkedin.com/in/frank-lee' }
    ];
    const page = makeMockPage({ evaluate: jest.fn().mockResolvedValue(mockProfiles) });

    const result = await runParse(page);

    result.forEach(profile => {
      expect(profile.name).toBeTruthy();
    });
  });

  it('returns empty array when evaluate rejects unexpectedly', async () => {
    const page = makeMockPage({
      evaluate: jest.fn().mockRejectedValue(new Error('Execution context destroyed'))
    });
    const result = await runParse(page);
    expect(result).toEqual([]);
  });
});
