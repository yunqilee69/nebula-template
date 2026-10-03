import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthenticatedImageLoader } from '../src/storage/authenticated-image.ts';
import type { RequestConfig } from '../src/request/types.ts';

test('AuthenticatedImageTest.testImageFetchedWithToken', async () => {
  const calls: RequestConfig[] = [];
  const objectUrls: string[] = [];
  const loader = createAuthenticatedImageLoader({
    request: async <T>(config: RequestConfig): Promise<T> => {
      calls.push(config);
      return { size: 10, type: 'image/png' } as T;
    },
    objectUrlFactory: {
      create: (blob) => {
        const url = `blob:fake-${(blob as { size: number }).size}`;
        objectUrls.push(url);
        return url;
      },
      revoke: () => {},
    },
  });

  const url = await loader.load('file-1', 'photo.png');
  assert.equal(url, 'blob:fake-10');
  assert.equal(calls.length, 1);
  const config = calls[0]!;
  // 走带 token 的 blob 获取（binary 解包旁路），而不是裸图片 URL
  assert.equal(config.method, 'GET');
  assert.equal(config.url, '/api/storage/download');
  assert.equal(config.binary, true);
  assert.deepEqual(config.params, { fileId: 'file-1', filename: 'photo.png' });

  // 同一 fileId 复用缓存，不再发请求
  const again = await loader.load('file-1', 'photo.png');
  assert.equal(again, 'blob:fake-10');
  assert.equal(calls.length, 1);

  loader.release();
  const reloaded = await loader.load('file-1');
  assert.equal(reloaded, 'blob:fake-10');
  assert.equal(calls.length, 2);
});
