import { afterEach, describe, expect, it } from 'vitest';
import { clearAuthTokens, getStoredAccessToken, getStoredRefreshToken, getStoredTenantCode, saveAuthTokens } from './token-session';
import type { GitHubLoginStatusResp, LoginResp } from '@/types/auth';

describe('token session storage', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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

  it('stores the tenant code returned by tenant login', () => {
    saveAuthTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
      tenantCode: 'acme',
    });

    expect(getStoredTenantCode()).toBe('acme');
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
    expect(getStoredTenantCode()).toBeNull();
  });

  it('stores tokens in session storage when auto login is disabled', () => {
    saveAuthTokens(
      {
        accessToken: 'session-access',
        refreshToken: 'session-refresh',
      },
      { persist: false },
    );

    expect(getStoredAccessToken()).toBe('session-access');
    expect(getStoredRefreshToken()).toBe('session-refresh');
    expect(localStorage.getItem('nebula-web.access-token')).toBeNull();
    expect(sessionStorage.getItem('nebula-web.access-token')).toBe('session-access');
  });

  it('removes the previous storage location when the auto login choice changes', () => {
    saveAuthTokens({ accessToken: 'local-access', refreshToken: 'local-refresh' });

    saveAuthTokens({ accessToken: 'session-access', refreshToken: 'session-refresh' }, { persist: false });

    expect(localStorage.getItem('nebula-web.access-token')).toBeNull();
    expect(localStorage.getItem('nebula-web.refresh-token')).toBeNull();
    expect(getStoredAccessToken()).toBe('session-access');
    expect(getStoredRefreshToken()).toBe('session-refresh');
  });

  it('keeps the session storage choice when tokens are saved without an explicit preference', () => {
    saveAuthTokens({ accessToken: 'session-access', refreshToken: 'session-refresh' }, { persist: false });

    // 刷新令牌等后台流程不传 persist：必须沿用会话级存储，不能悄悄升级为持久登录
    saveAuthTokens({ accessToken: 'refreshed-access', refreshToken: 'refreshed-refresh' });

    expect(getStoredAccessToken()).toBe('refreshed-access');
    expect(sessionStorage.getItem('nebula-web.access-token')).toBe('refreshed-access');
    expect(localStorage.getItem('nebula-web.access-token')).toBeNull();
  });

  it('clears tokens from both storage locations', () => {
    saveAuthTokens({ accessToken: 'session-access', refreshToken: 'session-refresh' }, { persist: false });

    clearAuthTokens();

    expect(getStoredAccessToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
    expect(sessionStorage.getItem('nebula-web.access-token')).toBeNull();
    expect(localStorage.getItem('nebula-web.token-persistence')).toBeNull();
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
