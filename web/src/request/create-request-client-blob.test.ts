import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it, vi } from 'vitest';
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

  it('rejects when a blob download actually carries a business error envelope', async () => {
    const onBusinessError = vi.fn();
    const client = createRequestClient({ getToken: () => 'token', onBusinessError });
    const errorEnvelope = new Blob(
      [JSON.stringify({ code: '24008', message: '当前用户无权下载该文件' })],
      { type: 'application/json' },
    );
    client.defaults.adapter = mockAdapter((config) => makeResponse(config, errorEnvelope));

    // 下载失败时服务端返回 HTTP 200 + ApiResult；responseType=blob 不能把这份 JSON 当成文件交出去
    await expect(client.get('/api/storage/download', { responseType: 'blob' }))
      .rejects.toMatchObject({ name: 'NebulaBusinessError', code: '24008' });
    expect(onBusinessError).toHaveBeenCalledWith('当前用户无权下载该文件');
  });

  it('keeps non-JSON blobs untouched when the body is not a business envelope', async () => {
    const client = createRequestClient({ getToken: () => 'token' });
    const jsonButNotEnvelope = new Blob([JSON.stringify({ detail: 'x' })], { type: 'application/json' });
    client.defaults.adapter = mockAdapter((config) => makeResponse(config, jsonButNotEnvelope));

    await expect(client.get('/api/storage/download', { responseType: 'blob' })).resolves.toBe(jsonButNotEnvelope);
  });
});
