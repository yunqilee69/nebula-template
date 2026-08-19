import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

vi.mock('@/utils/auth/token-session', () => ({
  getStoredAccessToken: vi.fn(() => null),
  getStoredRefreshToken: vi.fn(() => null),
  saveAuthTokens: vi.fn(),
  clearAuthTokens: vi.fn(),
}));

vi.mock('@/utils/auth/session-expired', () => ({
  notifySessionExpired: vi.fn(),
}));

vi.mock('@/providers/notice', () => ({
  notice: {
    error: vi.fn(),
  },
}));

import { getStoredAccessToken, getStoredRefreshToken, saveAuthTokens, clearAuthTokens } from '@/utils/auth/token-session';
import { notifySessionExpired } from '@/utils/auth/session-expired';
import { notice } from '@/providers/notice';
import { useAuthStore } from '@/stores/auth-store';
import { request, requestClient } from './request';

function mockAdapter(
  handler: (config: InternalAxiosRequestConfig) => AxiosResponse | Promise<AxiosResponse>,
) {
  return (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const result = handler(config);
    return result instanceof Promise ? result : Promise.resolve(result);
  };
}

function makeResponse(
  config: InternalAxiosRequestConfig,
  status = 200,
  data: unknown = {},
): AxiosResponse {
  return { data, status, statusText: 'OK', headers: {}, config };
}

function make401Error(config: InternalAxiosRequestConfig, message = 'Unauthorized') {
  return Object.assign(
    new Error(message),
    { response: makeResponse(config, 401), config, isAxiosError: true, toJSON: () => ({}) },
  );
}

function makeStatusError(config: InternalAxiosRequestConfig, status: number, message: string) {
  return Object.assign(
    new Error(message),
    { response: makeResponse(config, status), isAxiosError: true, toJSON: () => ({}) },
  );
}

describe('global request instance', () => {
  afterEach(async () => {
    vi.clearAllMocks();
    vi.mocked(getStoredAccessToken).mockReturnValue(null);
    vi.mocked(getStoredRefreshToken).mockReturnValue(null);
    useAuthStore.getState().clearUser();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('returns null from refresh callback when no refresh token is stored', async () => {
    vi.mocked(getStoredRefreshToken).mockReturnValue(null);

    const requestedUrls: string[] = [];

    requestClient.defaults.adapter = mockAdapter((config) => {
      requestedUrls.push(config.url ?? '');
      return Promise.reject(make401Error(config));
    });

    await expect(requestClient.get('/protected')).rejects.toThrow('Unauthorized');

    expect(requestedUrls).toEqual(['/protected']);
    expect(getStoredRefreshToken).toHaveBeenCalled();
    expect(clearAuthTokens).not.toHaveBeenCalled();
    expect(notifySessionExpired).not.toHaveBeenCalled();
  });

  it('saves new tokens and retries the original request on successful refresh', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue('old-access-token');
    vi.mocked(getStoredRefreshToken).mockReturnValue('old-refresh-token');

    let callIndex = 0;

    requestClient.defaults.adapter = mockAdapter((config) => {
      callIndex++;
      const url = config.url ?? '';

      if (url === '/protected' && callIndex === 1) {
        return Promise.reject(make401Error(config));
      }

      if (url === '/api/auth/refresh') {
        return makeResponse(config, 200, {
          code: '0',
          message: 'success',
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            accessTokenExpiresIn: 3600,
            refreshTokenExpiresIn: 86400,
          },
        });
      }

      return makeResponse(config, 200, {
        code: '0',
        message: 'success',
        data: { ok: true },
      });
    });

    const result = await request<{ ok: boolean }>({ method: 'GET', url: '/protected' });

    expect(result).toEqual({ ok: true });
    expect(saveAuthTokens).toHaveBeenCalledWith({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 86400,
    });
    expect(clearAuthTokens).not.toHaveBeenCalled();
    expect(notifySessionExpired).not.toHaveBeenCalled();
  });

  it('clears tokens once and notifies once when refresh endpoint returns 401', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue('old-access-token');
    vi.mocked(getStoredRefreshToken).mockReturnValue('old-refresh-token');

    requestClient.defaults.adapter = mockAdapter((config) => {
      return Promise.reject(make401Error(config));
    });

    await expect(request({ method: 'GET', url: '/protected' })).rejects.toThrow();

    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    expect(notifySessionExpired).toHaveBeenCalledTimes(1);
  });

  it('clears tokens once and notifies once on non-401 refresh failure', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue('old-access-token');
    vi.mocked(getStoredRefreshToken).mockReturnValue('old-refresh-token');

    requestClient.defaults.adapter = mockAdapter((config) => {
      const url = config.url ?? '';

      if (url === '/protected') {
        return Promise.reject(make401Error(config));
      }

      return Promise.reject(makeStatusError(config, 500, 'Internal Server Error'));
    });

    await expect(request({ method: 'GET', url: '/protected' })).rejects.toThrow();

    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    expect(notifySessionExpired).toHaveBeenCalledTimes(1);
  });

  it('clears tokens once and notifies once when refresh response has no accessToken', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue('old-access-token');
    vi.mocked(getStoredRefreshToken).mockReturnValue('old-refresh-token');

    requestClient.defaults.adapter = mockAdapter((config) => {
      const url = config.url ?? '';

      if (url === '/protected') {
        return Promise.reject(make401Error(config));
      }

      if (url === '/api/auth/refresh') {
        return makeResponse(config, 200, {
          code: '0',
          message: 'success',
          data: {
            accessToken: '',
            refreshToken: 'new-refresh-token',
            accessTokenExpiresIn: 3600,
            refreshTokenExpiresIn: 86400,
          },
        });
      }

      return makeResponse(config, 200, { code: '0', message: 'success', data: {} });
    });

    await expect(request({ method: 'GET', url: '/protected' })).rejects.toThrow();

    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    expect(notifySessionExpired).toHaveBeenCalledTimes(1);
    expect(saveAuthTokens).not.toHaveBeenCalled();
  });

  it('surfaces refresh business errors and notifies session expired when refresh token is stored', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue('old-access-token');
    vi.mocked(getStoredRefreshToken).mockReturnValue('stale-refresh-token');

    requestClient.defaults.adapter = mockAdapter((config) => {
      const url = config.url ?? '';

      if (url === '/api/auth/refresh') {
        return makeResponse(config, 200, {
          code: 'AUTH_EXPIRED',
          message: '未登录或登录已过期',
          data: null,
        });
      }

      return Promise.reject(make401Error(config));
    });

    await expect(request({ method: 'GET', url: '/protected' })).rejects.toThrow('Unauthorized');

    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    expect(notifySessionExpired).toHaveBeenCalledTimes(1);
    expect(notice.error).toHaveBeenCalledWith('未登录或登录已过期');
  });

  it('skips session-expired notification when no access or refresh token is stored', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue(null);
    vi.mocked(getStoredRefreshToken).mockReturnValue(null);

    requestClient.defaults.adapter = mockAdapter((config) => {
      return Promise.reject(make401Error(config));
    });

    await expect(request({ method: 'GET', url: '/any' })).rejects.toThrow('Unauthorized');

    expect(clearAuthTokens).not.toHaveBeenCalled();
    expect(notifySessionExpired).not.toHaveBeenCalled();
  });

  it('silently clears active user when a business-page request returns 401 after stored tokens are removed', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue(null);
    vi.mocked(getStoredRefreshToken).mockReturnValue(null);
    useAuthStore.getState().setUser({
      id: 'active-user',
      name: 'Active User',
      roles: [],
      permissions: [],
    });

    requestClient.defaults.adapter = mockAdapter((config) => {
      return Promise.reject(make401Error(config));
    });

    await expect(request({ method: 'GET', url: '/business/page' })).rejects.toThrow('Unauthorized');

    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();
    expect(notifySessionExpired).not.toHaveBeenCalled();
  });

  it('silently clears tokens when only access token is stored and refresh fails', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue('expired-access-token');
    vi.mocked(getStoredRefreshToken).mockReturnValue(null);

    requestClient.defaults.adapter = mockAdapter((config) => {
      return Promise.reject(make401Error(config));
    });

    await expect(request({ method: 'GET', url: '/protected' })).rejects.toThrow('Unauthorized');

    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    expect(notifySessionExpired).not.toHaveBeenCalled();
  });

  it('notifies session expired when only refresh token is stored and refresh fails', async () => {
    vi.mocked(getStoredAccessToken).mockReturnValue(null);
    vi.mocked(getStoredRefreshToken).mockReturnValue('stale-refresh-token');

    requestClient.defaults.adapter = mockAdapter((config) => {
      const url = config.url ?? '';
      if (url === '/protected') {
        return Promise.reject(make401Error(config));
      }
      return Promise.reject(makeStatusError(config, 401, 'Refresh Unauthorized'));
    });

    await expect(request({ method: 'GET', url: '/protected' })).rejects.toThrow();

    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    expect(notifySessionExpired).toHaveBeenCalledTimes(1);
  });

  it('shows business errors through Ant Design notice instead of browser alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    requestClient.defaults.adapter = mockAdapter((config) => makeResponse(config, 200, {
      code: 'SYS_500',
      message: '请求失败',
      data: null,
    }));

    await expect(request({ method: 'GET', url: '/fail' })).rejects.toThrow('请求失败');

    expect(notice.error).toHaveBeenCalledWith('请求失败');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('Nebula request business error', {
      code: 'SYS_500',
      message: '请求失败',
      url: '/fail',
    });
  });

  it('shows HTTP 500 errors through Ant Design notice', async () => {
    requestClient.defaults.adapter = mockAdapter((config) => {
      return Promise.reject(makeStatusError(config, 500, 'Internal Server Error'));
    });

    await expect(request({ method: 'GET', url: '/crash' })).rejects.toThrow('Internal Server Error');

    expect(notice.error).toHaveBeenCalledWith('Internal Server Error');
  });
});
