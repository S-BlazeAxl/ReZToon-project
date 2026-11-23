import { describe, expect, it } from 'vitest';
import { isNetworkError } from '../../lib/connectivity';

describe('isNetworkError', () => {
  it('detects supabase retryable fetch errors', () => {
    expect(isNetworkError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 })).toBe(true);
  });

  it('detects browser fetch failures', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError({ message: 'net::ERR_NAME_NOT_RESOLVED' })).toBe(true);
  });

  it('does not treat auth rejections as network errors', () => {
    expect(isNetworkError({ name: 'AuthApiError', message: 'Invalid login credentials', status: 400 })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});
