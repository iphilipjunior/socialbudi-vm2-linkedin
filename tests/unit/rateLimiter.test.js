'use strict';

// Use jest.resetModules() in beforeEach to get a fresh Map for every test
// (the rateLimiter keeps state in a module-level Map)
let rateLimiter;

beforeEach(() => {
  jest.resetModules();
  // Mock logger so tests don't write to log files
  jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }));
  rateLimiter = require('../../src/services/rateLimiter');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('rateLimiter.checkRateLimit', () => {
  it('returns allowed:true for a new user', () => {
    const result = rateLimiter.checkRateLimit('user-new');
    expect(result.allowed).toBe(true);
  });

  it('returns used count of 1 on first call', () => {
    const result = rateLimiter.checkRateLimit('user-first-call');
    expect(result.used).toBe(1);
  });

  it('returns correct limit value', () => {
    const result = rateLimiter.checkRateLimit('user-limit-check');
    expect(result.limit).toBe(100);
  });

  it('returns resetAt timestamp in the future', () => {
    const before = Date.now();
    const result = rateLimiter.checkRateLimit('user-reset-time');
    expect(result.resetAt).toBeGreaterThan(before);
  });

  it('increments used count on each call', () => {
    const userId = 'user-increment';
    rateLimiter.checkRateLimit(userId);
    rateLimiter.checkRateLimit(userId);
    const result = rateLimiter.checkRateLimit(userId);
    expect(result.used).toBe(3);
  });

  it('returns allowed:false after 100 requests', () => {
    const userId = 'user-at-limit';
    for (let i = 0; i < 100; i++) {
      rateLimiter.checkRateLimit(userId);
    }
    const result = rateLimiter.checkRateLimit(userId);
    expect(result.allowed).toBe(false);
  });

  it('still returns correct used and limit when blocked', () => {
    const userId = 'user-blocked';
    for (let i = 0; i < 100; i++) {
      rateLimiter.checkRateLimit(userId);
    }
    const result = rateLimiter.checkRateLimit(userId);
    expect(result.used).toBe(100);
    expect(result.limit).toBe(100);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it('allows request again after resetAt has passed', () => {
    const userId = 'user-reset';
    for (let i = 0; i < 50; i++) {
      rateLimiter.checkRateLimit(userId);
    }
    // Advance Date.now() past the resetAt (next midnight)
    const futureMs = Date.now() + 25 * 60 * 60 * 1000; // 25 hours ahead
    jest.spyOn(Date, 'now').mockReturnValue(futureMs);

    const result = rateLimiter.checkRateLimit(userId);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(1); // counter has reset
  });

  it('the 100th request is allowed, the 101st is not', () => {
    const userId = 'user-boundary';
    let last;
    for (let i = 0; i < 100; i++) {
      last = rateLimiter.checkRateLimit(userId);
    }
    expect(last.allowed).toBe(true);
    const blocked = rateLimiter.checkRateLimit(userId);
    expect(blocked.allowed).toBe(false);
  });
});

describe('rateLimiter.getRateLimitStatus', () => {
  it('returns remaining:100 for a user with no requests', () => {
    const status = rateLimiter.getRateLimitStatus('user-status-new');
    expect(status.remaining).toBe(100);
    expect(status.used).toBe(0);
    expect(status.limit).toBe(100);
  });

  it('returns correct remaining after some requests', () => {
    const userId = 'user-status-used';
    rateLimiter.checkRateLimit(userId);
    rateLimiter.checkRateLimit(userId);
    const status = rateLimiter.getRateLimitStatus(userId);
    expect(status.used).toBe(2);
    expect(status.remaining).toBe(98);
  });

  it('returns remaining:0 when limit is exhausted', () => {
    const userId = 'user-status-maxed';
    for (let i = 0; i < 100; i++) {
      rateLimiter.checkRateLimit(userId);
    }
    const status = rateLimiter.getRateLimitStatus(userId);
    expect(status.remaining).toBe(0);
    expect(status.used).toBe(100);
  });

  it('returns resetAt in the future', () => {
    const status = rateLimiter.getRateLimitStatus('user-status-reset');
    expect(status.resetAt).toBeGreaterThan(Date.now());
  });
});
