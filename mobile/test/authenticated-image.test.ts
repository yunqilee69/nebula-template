import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthenticatedImageLoader } from '../src/storage/authenticated-image.ts';
import type { RequestConfig } from '../src/request/types.ts';

const DOWNLOAD_LOCATION_URL = '/api/storage/download-location';
const DOWNLOAD_URL = '/api/storage/download';

function createHarness(location: unknown, blob: unknown) {
  const calls: RequestConfig[] = [];
  const created: string[] = [];
  const revoked: string[] = [];
  const loader = createAuthenticatedImageLoader({
    request: async <T>(config: RequestConfig): Promise<T> => {
      calls.push(config);
      return (config.url === DOWNLOAD_LOCATION_URL ? location : blob) as T;
    },
    objectUrlFactory: {
      create: (value) => {
        const url = `blob:fake-${(value as { size: number }).size}`;
        created.push(url);
        return url;
      },
      revoke: (url) => {
        revoked.push(url);
      },
    },
  });
  return { loader, calls, created, revoked };
}

test('AuthenticatedImageTest.proxyModeFetchesBlobWithToken', async () => {
  const { loader, calls } = createHarness([{ mode: 'PROXY', url: DOWNLOAD_URL }], { size: 10, type: 'image/png' });

  const url = await loader.load('file-1', 'photo.png');
  assert.equal(url, 'blob:fake-10');
  assert.equal(calls.length, 2);
  // 第一跳问位置：预览不带 filename
  assert.equal(calls[0]!.url, DOWNLOAD_LOCATION_URL);
  assert.deepEqual(calls[0]!.params, { fileId: 'file-1' });
  // 第二跳走带 token 的 blob 获取（binary 解包旁路），而不是裸图片 URL
  assert.equal(calls[1]!.url, DOWNLOAD_URL);
  assert.equal(calls[1]!.method, 'GET');
  assert.equal(calls[1]!.binary, true);
  assert.deepEqual(calls[1]!.params, { fileId: 'file-1', filename: 'photo.png' });

  // 同一 fileId 复用缓存，不再发请求
  const again = await loader.load('file-1', 'photo.png');
  assert.equal(again, 'blob:fake-10');
  assert.equal(calls.length, 2);

  loader.release();
  const reloaded = await loader.load('file-1');
  assert.equal(reloaded, 'blob:fake-10');
  assert.equal(calls.length, 4);
});

test('AuthenticatedImageTest.directModeReturnsObjectStorageUrlWithoutBlobFetch', async () => {
  const directUrl = 'https://oss.example.com/hash/photo.png?X-Amz-Signature=stub';
  const { loader, calls, created } = createHarness([{ mode: 'DIRECT', url: directUrl, expiresAtEpochSecond: 1760000300 }], { size: 10 });

  const url = await loader.load('file-2');

  assert.equal(url, directUrl);
  // 直链模式只需一次位置请求，不转对象 URL
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, DOWNLOAD_LOCATION_URL);
  assert.equal(created.length, 0);
});

test('AuthenticatedImageTest.releaseDoesNotRevokeDirectLink', async () => {
  const directUrl = 'https://oss.example.com/hash/photo.png?X-Amz-Signature=stub';
  const { loader, revoked } = createHarness([{ mode: 'DIRECT', url: directUrl }], null);

  await loader.load('file-3');
  loader.release();

  // 直链不是对象 URL，release 不应调用 revoke
  assert.deepEqual(revoked, []);
});
