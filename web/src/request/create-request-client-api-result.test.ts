import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequestClient } from './create-request-client';

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
  data: unknown,
): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

describe('createRequestClient ApiResult compatibility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects legacy ApiResult responses that use msg instead of message', async () => {
    const onBusinessError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = createRequestClient({ onBusinessError });

    client.defaults.adapter = mockAdapter((config) => makeResponse(config, {
      code: 500,
      msg: 'invalid request, accessToken or appname is empty.',
    }));

    await expect(client.get('/api/frontend/caches')).rejects.toThrow('invalid request, accessToken or appname is empty.');

    expect(consoleError).toHaveBeenCalledWith('Nebula request business error', {
      code: '500',
      message: 'invalid request, accessToken or appname is empty.',
      url: '/api/frontend/caches',
    });
    expect(onBusinessError).toHaveBeenCalledWith('invalid request, accessToken or appname is empty.');
  });
});
