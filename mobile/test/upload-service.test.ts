import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageService, type UploadFileSource } from '../src/storage/upload-service.ts';
import { MB_BYTES, normalizeUploadPolicy } from '../src/storage/upload-policy.ts';
import type { RequestConfig } from '../src/request/types.ts';

const POLICY = normalizeUploadPolicy({ maxFileSize: 100, chunkThreshold: 5, chunkSize: 2 });

function makeFile(name: string, size: number): UploadFileSource {
  return {
    name,
    size,
    async readPart(offset, length) {
      const end = Math.min(offset + length, size);
      return new Uint8Array(Math.max(0, end - offset));
    },
  };
}

interface CapturedCall {
  method: string;
  url: string;
  data?: unknown;
  formData?: Record<string, unknown>;
  headers?: Record<string, string>;
}

function createFakeRequest(options?: { failPartsOnce?: number[] }) {
  const calls: CapturedCall[] = [];
  const failPartsOnce = new Set(options?.failPartsOnce ?? []);
  const request = async <T>(config: RequestConfig): Promise<T> => {
    calls.push({
      method: config.method,
      url: config.url,
      data: config.data,
      formData: config.formData,
      headers: config.headers,
    });

    if (config.url.endsWith('/upload-tasks')) return 'task-1' as T;
    if (config.url.endsWith('/upload')) return { id: 'task-1', taskMode: 'SIMPLE' } as T;

    const partMatch = /\/parts\/(\d+)$/.exec(config.url);
    if (partMatch) {
      const partNo = Number(partMatch[1]);
      if (failPartsOnce.has(partNo)) {
        failPartsOnce.delete(partNo);
        throw new Error('network');
      }
      return {} as T;
    }
    if (config.url.endsWith('/complete')) {
      return { id: 'task-1', taskMode: 'CHUNKED' } as T;
    }
    if (config.url.endsWith('/bind')) return 'file-1' as T;
    return {} as T;
  };
  return { request: request as <T>(config: RequestConfig) => Promise<T>, calls };
}

test('UploadPolicyTest.testPartRetry', async () => {
  const { request, calls } = createFakeRequest({ failPartsOnce: [2] });
  const service = createStorageService({
    request,
    policy: POLICY,
    retry: { maxAttempts: 2, delayMs: 0 },
    sleep: async () => {},
  });

  const ratios: number[] = [];
  const task = await service.upload(makeFile('big.jpg', 6 * MB_BYTES), {
    onProgress: (progress) => ratios.push(progress.ratio),
  });

  assert.equal(task.id, 'task-1');
  const partCalls = calls.filter((call) => call.url.includes('/parts/'));
  assert.equal(partCalls.length, 4); // 3 个分片 + 分片 2 重试 1 次
  assert.equal(calls.filter((call) => call.url.endsWith('/parts/1')).length, 1);
  assert.equal(calls.filter((call) => call.url.endsWith('/parts/2')).length, 2);
  assert.equal(calls.filter((call) => call.url.endsWith('/parts/3')).length, 1);

  // 聚合进度单调递增，最终为 1
  for (let i = 1; i < ratios.length; i += 1) {
    assert.ok(ratios[i]! >= ratios[i - 1]!, `progress must be monotonic: ${ratios.join(',')}`);
  }
  assert.equal(ratios.at(-1), 1);
});

test('UploadPolicyTest.testBindProducesFileId', async () => {
  const { request, calls } = createFakeRequest();
  const service = createStorageService({ request, policy: POLICY });

  const task = await service.upload(makeFile('small.jpg', 1 * MB_BYTES));
  // 上传结束只拿到临时 task，没有正式 fileId
  assert.equal(task.id, 'task-1');
  assert.equal((task as { fileId?: string }).fileId, undefined);

  const fileId = await service.bind('task-1', {
    sourceEntity: 'wms_order',
    sourceId: 'order-1',
    sourceType: 'signature-photo',
  });
  assert.equal(fileId, 'file-1');

  const bindCall = calls.at(-1)!;
  assert.equal(bindCall.method, 'POST');
  assert.equal(bindCall.url, '/api/storage/upload-tasks/task-1/bind');
  assert.deepEqual(bindCall.data, {
    sourceEntity: 'wms_order',
    sourceId: 'order-1',
    sourceType: 'signature-photo',
  });
});

test('UploadPolicyTest.testSimpleRouteWhenBelowThreshold', async () => {
  const { request, calls } = createFakeRequest();
  const service = createStorageService({ request, policy: POLICY });
  await service.upload(makeFile('small.jpg', 1 * MB_BYTES));
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, '/api/storage/upload');
});

test('UploadPolicyTest.testSimpleUploadSendsRnFileObjectNotUriString', async () => {
  const { request, calls } = createFakeRequest();
  const service = createStorageService({ request, policy: POLICY });

  const file = makeFile('photo.jpg', 1 * MB_BYTES);
  file.uri = 'file:///data/user/0/app/photo.jpg';
  file.mimeType = 'image/jpeg';
  await service.upload(file);

  // RN 简单上传的 file 字段必须是 { uri, name, type } 文件对象；
  // 发成 URI 字符串服务端只能收到一段文本而不是文件内容
  const uploadCall = calls[0]!;
  const fileField = uploadCall.formData?.file as { uri?: string; name?: string; type?: string };
  assert.equal(typeof fileField, 'object');
  assert.equal(fileField.uri, 'file:///data/user/0/app/photo.jpg');
  assert.equal(fileField.name, 'photo.jpg');
  assert.equal(fileField.type, 'image/jpeg');
});

test('UploadPolicyTest.testSimpleUploadPrefersBlobWhenProvided', async () => {
  const { request, calls } = createFakeRequest();
  const service = createStorageService({ request, policy: POLICY });

  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
  const file = makeFile('note.png', 1 * MB_BYTES);
  file.uri = 'file:///should-not-be-used.png';
  file.blob = blob;
  await service.upload(file);

  const uploadCall = calls[0]!;
  assert.equal(uploadCall.formData?.file, blob);
});
