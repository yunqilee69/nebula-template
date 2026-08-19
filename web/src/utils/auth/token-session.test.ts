import { afterEach, describe, expect, it } from 'vitest';
import { clearAuthTokens, getStoredAccessToken, getStoredRefreshToken, saveAuthTokens } from './token-session';
import type { GitHubLoginStatusResp, LoginResp } from '@/types/auth';

describe('token session storage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('stores and reads access and refresh tokens from login responses', () => {
    const response: LoginResp = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
    };

    saveAuthTokens(response);

    expect(getStoredAccessToken()).toBe('access-token');
    expect(getStoredRefreshToken()).toBe('refresh-token');
  });

  it('clears both stored tokens', () => {
    saveAuthTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
    });

    clearAuthTokens();

    expect(getStoredAccessToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
  });

  it('supports optional tokens returned by OAuth login status', () => {
    const response: GitHubLoginStatusResp = {
      loginId: 'github-login-id',
      status: 'SUCCESS',
      state: 'github-state',
      loginResult: {
        accessToken: 'github-access',
        refreshToken: 'github-refresh',
        accessTokenExpiresIn: 7200,
        refreshTokenExpiresIn: 604800,
      },
    };

    saveAuthTokens(response);

    expect(getStoredAccessToken()).toBe('github-access');
    expect(getStoredRefreshToken()).toBe('github-refresh');
  });

  it('stores tokens from snake_case login response fields', () => {
    saveAuthTokens({
      access_token: 'snake-access',
      refresh_token: 'snake-refresh',
    });

    expect(getStoredAccessToken()).toBe('snake-access');
    expect(getStoredRefreshToken()).toBe('snake-refresh');
  });

  it('stores tokens from nested API response data', () => {
    saveAuthTokens({
      data: {
        token: 'nested-access',
        refreshToken: 'nested-refresh',
      },
    });

    expect(getStoredAccessToken()).toBe('nested-access');
    expect(getStoredRefreshToken()).toBe('nested-refresh');
  });
});
