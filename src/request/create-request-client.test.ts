import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequestClient } from './create-request-client';
import type { NebulaRequestConfig } from './types';

import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

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

describe('createRequestClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('injects Authorization header when getToken returns a token', async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createRequestClient({
      getToken: () => 'test-token-abc',
      baseURL: 'https://api.example.com',
    });

    client.defaults.adapter = mockAdapter((config) => {
      capturedConfig = config;
      return makeResponse(config);
    });

    await client.get('/me');

    expect(capturedConfig?.headers).toBeDefined();
    expect(capturedConfig!.headers.get('Authorization')).toBe('Bearer test-token-abc');
  });

  it('omits Authorization header when getToken returns null', async () => {
    let capturedConfig: InternalAxiosRequestConfig | undefined;

    const client = createRequestClient({
      getToken: () => null,
    });

    client.defaults.adapter = mockAdapter((config) => {
      capturedConfig = config;
      return makeResponse(config);
    });

    await client.get('/public');

    expect(capturedConfig?.headers).toBeDefined();
    expect(capturedConfig!.headers.get('Authorization')).toBeUndefined();
  });

  it('calls onUnauthorized when response status is 401', async () => {
    const onUnauthorized = vi.fn();
    const onError = vi.fn();

    const client = createRequestClient({ onUnauthorized, onError });

    client.defaults.adapter = mockAdapter((config) => {
      const error = Object.assign(
        new Error('Unauthorized'),
        { response: makeResponse(config, 401), isAxiosError: true, toJSON: () => ({}) },
      );
      return Promise.reject(error);
    });

    await expect(client.get('/protected')).rejects.toThrow('Unauthorized');

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('refreshes the token and retries the original request once when response status is 401', async () => {
    const refreshToken = vi.fn(() => Promise.resolve('new-token'));
    const onUnauthorized = vi.fn();
    const onError = vi.fn();
    const seenTokens: unknown[] = [];

    const client = createRequestClient({
      getToken: () => 'old-token',
      refreshToken,
      onUnauthorized,
      onError,
    });

    client.defaults.adapter = mockAdapter((config) => {
      seenTokens.push(config.headers.get('Authorization'));

      if (seenTokens.length === 1) {
        const error = Object.assign(
          new Error('Unauthorized'),
          { response: makeResponse(config, 401), config, isAxiosError: true, toJSON: () => ({}) },
        );
        return Promise.reject(error);
      }

      return makeResponse(config, 200, { ok: true });
    });

    await expect(client.get('/protected')).resolves.toMatchObject({ data: { ok: true } });

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(seenTokens).toEqual(['Bearer old-token', 'Bearer new-token']);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls refresh failure and unauthorized hooks when refresh returns no token', async () => {
    const refreshToken = vi.fn(() => Promise.resolve(null));
    const onRefreshFailed = vi.fn();
    const onUnauthorized = vi.fn();

    const client = createRequestClient({ refreshToken, onRefreshFailed, onUnauthorized });

    client.defaults.adapter = mockAdapter((config) => {
      const error = Object.assign(
        new Error('Unauthorized'),
        { response: makeResponse(config, 401), config, isAxiosError: true, toJSON: () => ({}) },
      );
      return Promise.reject(error);
    });

    await expect(client.get('/protected')).rejects.toThrow('Unauthorized');

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(onRefreshFailed).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('passes refresh errors to onRefreshFailed when refresh throws', async () => {
    const refreshError = new Error('Refresh failed');
    const refreshToken = vi.fn(() => Promise.reject(refreshError));
    const onRefreshFailed = vi.fn();
    const onUnauthorized = vi.fn();

    const client = createRequestClient({ refreshToken, onRefreshFailed, onUnauthorized });

    client.defaults.adapter = mockAdapter((config) => {
      const error = Object.assign(
        new Error('Unauthorized'),
        { response: makeResponse(config, 401), config, isAxiosError: true, toJSON: () => ({}) },
      );
      return Promise.reject(error);
    });

    await expect(client.get('/protected')).rejects.toThrow('Unauthorized');

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(onRefreshFailed).toHaveBeenCalledWith(refreshError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('shares one refresh call across concurrent 401 responses', async () => {
    let resolveRefresh: (token: string) => void;
    const refreshToken = vi.fn(() => new Promise<string>((resolve) => {
      resolveRefresh = resolve;
    }));
    const attempts = new Map<string, number>();

    const client = createRequestClient({
      getToken: () => 'old-token',
      refreshToken,
    });

    client.defaults.adapter = mockAdapter((config) => {
      const url = config.url ?? '';
      const nextAttempt = (attempts.get(url) ?? 0) + 1;
      attempts.set(url, nextAttempt);

      if (nextAttempt === 1) {
        const error = Object.assign(
          new Error(`Unauthorized ${url}`),
          { response: makeResponse(config, 401), config, isAxiosError: true, toJSON: () => ({}) },
        );
        return Promise.reject(error);
      }

      expect(config.headers.get('Authorization')).toBe('Bearer shared-token');
      return makeResponse(config, 200, { url });
    });

    const first = client.get('/first');
    const second = client.get('/second');

    await vi.waitFor(() => expect(refreshToken).toHaveBeenCalledTimes(1));
    resolveRefresh!('shared-token');

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(attempts.get('/first')).toBe(2);
    expect(attempts.get('/second')).toBe(2);
  });

  it('does not refresh forever when the retried request also returns 401', async () => {
    const refreshToken = vi.fn(() => Promise.resolve('new-token'));
    const onUnauthorized = vi.fn();

    const client = createRequestClient({ refreshToken, onUnauthorized });

    client.defaults.adapter = mockAdapter((config) => {
      const error = Object.assign(
        new Error('Unauthorized'),
        { response: makeResponse(config, 401), config, isAxiosError: true, toJSON: () => ({}) },
      );
      return Promise.reject(error);
    });

    await expect(client.get('/protected')).rejects.toThrow('Unauthorized');

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not call onUnauthorized for non-401 errors', async () => {
    const onUnauthorized = vi.fn();
    const onError = vi.fn();

    const client = createRequestClient({ onUnauthorized, onError });

    client.defaults.adapter = mockAdapter((config) => {
      const error = Object.assign(
        new Error('Server Error'),
        { response: makeResponse(config, 500), isAxiosError: true, toJSON: () => ({}) },
      );
      return Promise.reject(error);
    });

    await expect(client.get('/fail')).rejects.toThrow('Server Error');

    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('uses default timeout of 10000 when not specified', () => {
    const client = createRequestClient({});
    expect(client.defaults.timeout).toBe(10000);
  });

  it('respects custom timeout', () => {
    const client = createRequestClient({ timeout: 5000 });
    expect(client.defaults.timeout).toBe(5000);
  });

  it('sets baseURL when provided', () => {
    const client = createRequestClient({ baseURL: 'https://api.example.com' });
    expect(client.defaults.baseURL).toBe('https://api.example.com');
  });

  it('unwraps ApiResult response data in the response interceptor', async () => {
    const client = createRequestClient({});

    client.defaults.adapter = mockAdapter((config) => makeResponse(config, 200, {
      code: '0',
      message: 'success',
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    }));

    await expect(client.post('/api/auth/login', { username: 'admin' })).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('unwraps void ApiResult responses to undefined', async () => {
    const client = createRequestClient({});

    client.defaults.adapter = mockAdapter((config) => makeResponse(config, 200, {
      code: '0',
      message: 'success',
    }));

    await expect(client.post('/api/auth/send-phone-code', { phone: '13800000000' })).resolves.toBeUndefined();
  });

  it('rejects non-zero ApiResult responses, logs them, and shows the returned message', async () => {
    const onBusinessError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = createRequestClient({ onBusinessError });

    client.defaults.adapter = mockAdapter((config) => makeResponse(config, 200, {
      code: 'AUTH_001',
      message: '验证码错误',
      data: null,
    }));

    await expect(client.post('/api/auth/phone-login', { phone: '13800000000', code: '0000' })).rejects.toThrow('验证码错误');

    expect(consoleError).toHaveBeenCalledWith('Nebula request business error', {
      code: 'AUTH_001',
      message: '验证码错误',
      url: '/api/auth/phone-login',
    });
    expect(onBusinessError).toHaveBeenCalledWith('验证码错误');
  });

  it('uses the default business error message when ApiResult message is empty', async () => {
    const onBusinessError = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = createRequestClient({ onBusinessError });

    client.defaults.adapter = mockAdapter((config) => makeResponse(config, 200, {
      code: 'SYS_500',
      message: '',
    }));

    await expect(client.post('/api/auth/login', { username: 'admin' })).rejects.toThrow('接口请求出错，请联系管理员');

    expect(onBusinessError).toHaveBeenCalledWith('接口请求出错，请联系管理员');
  });

  it('routes auth business ApiResult responses through normal business-error handling', async () => {
    const onBusinessError = vi.fn();
    const onUnauthorized = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = createRequestClient({ onBusinessError, onUnauthorized });

    client.defaults.adapter = mockAdapter((config) => makeResponse(config, 200, {
      code: 'AUTH_EXPIRED',
      message: '未登录或登录已过期',
      data: null,
    }));

    await expect(client.post('/api/auth/refresh', { refreshToken: 'stale-token' })).rejects.toThrow('未登录或登录已过期');

    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onBusinessError).toHaveBeenCalledWith('未登录或登录已过期');
  });

  it('does not fall back to browser alert when no business error handler is provided', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = createRequestClient({});

    client.defaults.adapter = mockAdapter((config) => makeResponse(config, 200, {
      code: 'SYS_500',
      message: '请求失败',
    }));

    await expect(client.get('/fail')).rejects.toThrow('请求失败');

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('accepts refresh token callbacks in request options', () => {
    const client = createRequestClient({
      refreshToken: () => Promise.resolve('refreshed-token'),
      onRefreshFailed: () => undefined,
    });

    expect(client.defaults.timeout).toBe(10000);
  });

  it('does not refresh requests marked to skip auth refresh', async () => {
    const refreshToken = vi.fn<() => Promise<string | null>>().mockResolvedValue('next-token');
    const onUnauthorized = vi.fn();
    const onError = vi.fn();

    const client = createRequestClient({ refreshToken, onUnauthorized, onError });

    client.defaults.adapter = mockAdapter((config) => {
      const error = Object.assign(
        new Error('Unauthorized'),
        { response: makeResponse(config, 401), config, isAxiosError: true, toJSON: () => ({}) },
      );
      return Promise.reject(error);
    });

    const skipRefreshConfig: NebulaRequestConfig = {
      method: 'POST',
      url: '/api/auth/refresh',
      data: { refreshToken: 'old-refresh-token' },
      _nebulaSkipAuthRefresh: true,
    };

    await expect(
      client.request(skipRefreshConfig),
    ).rejects.toThrow('Unauthorized');

    expect(refreshToken).not.toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
