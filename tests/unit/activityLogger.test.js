'use strict';

// Mock supabase before requiring activityLogger
const mockInsert = jest.fn();
const mockFrom = jest.fn();

jest.mock('../../src/config/supabase', () => ({ from: mockFrom }));
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { logActivity } = require('../../src/utils/activityLogger');
const logger = require('../../src/utils/logger');

// Helper: flush the microtask queue so fire-and-forget Promises resolve
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();

  // Default: supabase insert succeeds
  mockInsert.mockResolvedValue({ error: null });
  mockFrom.mockReturnValue({
    insert: mockInsert
  });
});

describe('logActivity', () => {
  it('calls supabase.from("system_logs")', async () => {
    logActivity('info', 'scrape_profile', 'Test message', 'user-123', {});
    await flushPromises();
    expect(mockFrom).toHaveBeenCalledWith('system_logs');
  });

  it('calls insert with correct log_level, action, message, user_id, metadata', async () => {
    const metadata = { profile_url: 'https://linkedin.com/in/test', count: 5 };
    logActivity('info', 'search_export', 'Export done', 'user-abc', metadata);
    await flushPromises();

    expect(mockInsert).toHaveBeenCalledWith({
      log_level: 'info',
      action: 'search_export',
      message: 'Export done',
      user_id: 'user-abc',
      metadata
    });
  });

  it('sets user_id to null when not provided', async () => {
    logActivity('warn', 'bulk_scrape', 'Something happened');
    await flushPromises();

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: null })
    );
  });

  it('sets metadata to null when not provided', async () => {
    logActivity('error', 'scrape_profile', 'Failed', 'user-xyz');
    await flushPromises();

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: null })
    );
  });

  it('does NOT throw when supabase insert returns an error', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB write failed' } });

    expect(() => {
      logActivity('error', 'scrape_profile', 'Failed', 'user-1', null);
    }).not.toThrow();

    await flushPromises();
    // Should log a warning via Winston but not throw
    expect(logger.warn).toHaveBeenCalled();
  });

  it('does NOT throw when supabase insert rejects', async () => {
    mockInsert.mockRejectedValue(new Error('Connection refused'));

    expect(() => {
      logActivity('error', 'bulk_scrape', 'Failed', 'user-2', null);
    }).not.toThrow();

    await flushPromises();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('does NOT throw when supabase.from throws synchronously', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Supabase not available');
    });

    // logActivity wraps everything in a Promise chain; a sync throw in from()
    // propagates into the .catch() handler
    expect(() => {
      logActivity('info', 'test_action', 'msg', 'user-3');
    }).not.toThrow();

    await flushPromises();
  });

  it('never includes li_at cookie value in the insert call', async () => {
    const metadata = { profile_url: 'https://linkedin.com/in/johndoe', count: 1 };
    logActivity('info', 'scrape_profile', 'Profile scraped', 'user-secure', metadata);
    await flushPromises();

    const insertArg = mockInsert.mock.calls[0][0];
    const serialized = JSON.stringify(insertArg);
    expect(serialized).not.toContain('li_at');
    expect(serialized).not.toContain('cookie');
  });

  it('returns undefined (fire-and-forget — no return value)', () => {
    const result = logActivity('info', 'test', 'msg', 'user-4', null);
    expect(result).toBeUndefined();
  });
});
