import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { createRequestClient } from './create-request-client';

function mockAdapter(
  handler: (config: InternalAxiosRequestConfig) => AxiosResponse | Promise<AxiosResponse>,
) {
  return (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const result = handler(config);
    return result instanceof Promise ? result : Promise.resolve(result);
  };
}

function makeResponse(config: InternalAxiosRequestConfig, data: Blob): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

describe('createRequestClient blob downloads', () => {
  it('returns blob response data for authenticated file downloads', async () => {
    const blob = new Blob(['avatar'], { type: 'image/png' });
    let capturedConfig: InternalAxiosRequestConfig | undefined;
    const client = createRequestClient({ getToken: () => 'download-token' });

    client.defaults.adapter = mockAdapter((config) => {
      capturedConfig = config;
      return makeResponse(config, blob);
    });

    await expect(client.get('/api/storage/download', { responseType: 'blob' })).resolves.toBe(blob);
    expect(capturedConfig?.headers.get('Authorization')).toBe('Bearer download-token');
  });
});
