import { beforeEach, describe, expect, it } from 'vitest';
import { clearTokens, getStoredAccessToken, getStoredRefreshToken, saveTokens } from './token';

describe('control token store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and clears tokens', () => {
    saveTokens({ accessToken: 'a', refreshToken: 'b' });

    expect(getStoredAccessToken()).toBe('a');
    expect(getStoredRefreshToken()).toBe('b');

    clearTokens();

    expect(getStoredAccessToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
  });

  it('reads tokens from a nested data payload', () => {
    saveTokens({ data: { access_token: 'c', refresh_token: 'd' } });

    expect(getStoredAccessToken()).toBe('c');
    expect(getStoredRefreshToken()).toBe('d');
  });
});
