import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDictCacheKey,
  createDictService,
  parseDictCacheKey,
} from '../src/dict/dict-service.ts';
import type { DictItemTreeResp } from '../../packages/client-sdk/index.ts';
import type { RequestConfig } from '../src/request/types.ts';

interface Call {
  url: string;
  params: Record<string, unknown> | undefined;
}

function createRecorder() {
  const calls: Call[] = [];
  const request = async <T>(config: RequestConfig): Promise<T> => {
    calls.push({
      url: config.url,
      params: config.params as Record<string, unknown> | undefined,
    });
    return [{ code: 'A', name: '甲' }] as unknown as T;
  };
  return { calls, request };
}

test('DictServiceTest.testUrlIsNotPollutedByCacheKey', async () => {
  const { calls, request } = createRecorder();
  const service = createDictService({ request });

  const items = await service.getItems('order-status');

  assert.equal(items.length, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, '/api/dict/items/dict/order-status');
  assert.ok(!calls[0]?.url.includes('%23'), 'URL 不得含合成缓存键片段');
  assert.deepEqual(calls[0]?.params, { onlyEnabled: true });
});

test('DictServiceTest.testOnlyEnabledFalseIsForwardedAndCachedSeparately', async () => {
  const { calls, request } = createRecorder();
  const service = createDictService({ request });

  await service.getItems('order-status');
  await service.getItems('order-status', { onlyEnabled: false });
  // 再次读取：两份缓存各自命中，不再发请求
  await service.getItems('order-status');
  await service.getItems('order-status', { onlyEnabled: false });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0]?.params, { onlyEnabled: true });
  assert.deepEqual(calls[1]?.params, { onlyEnabled: false });
});

test('DictServiceTest.testForceReloadsAndInvalidateClearsBothVariants', async () => {
  const { calls, request } = createRecorder();
  const service = createDictService({ request });

  await service.getItems('order-status');
  await service.getItems('order-status');
  assert.equal(calls.length, 1, '未 force 时应命中缓存');

  await service.getItems('order-status', { force: true });
  assert.equal(calls.length, 2, 'force 必须穿透缓存');

  // invalidate 必须把 enabled/all 两份都清掉
  await service.getItems('order-status', { onlyEnabled: false });
  assert.equal(calls.length, 3);
  service.invalidate('order-status');
  await service.getItems('order-status');
  await service.getItems('order-status', { onlyEnabled: false });
  assert.equal(calls.length, 5, 'invalidate 后两份缓存都应失效');
});

test('DictServiceTest.testCacheKeyRoundTrips', () => {
  assert.equal(buildDictCacheKey('order-status', true), 'order-status#enabled');
  assert.equal(buildDictCacheKey('order-status', false), 'order-status#all');
  assert.deepEqual(parseDictCacheKey('order-status#enabled'), {
    dictCode: 'order-status',
    onlyEnabled: true,
  });
  assert.deepEqual(parseDictCacheKey('order-status#all'), {
    dictCode: 'order-status',
    onlyEnabled: false,
  });
});

test('DictServiceTest.testInjectedCacheReceivesCompositeKey', async () => {
  const { createKeyedCache } = await import('../src/dict/dict-cache.ts');
  const seenKeys: string[] = [];
  const cache = createKeyedCache<DictItemTreeResp[]>((key) => {
    seenKeys.push(key);
    return Promise.resolve([]);
  });
  const service = createDictService({ request: async <T>() => [] as unknown as T, cache });

  await service.getItems('order-status', { onlyEnabled: false });
  assert.deepEqual(seenKeys, ['order-status#all']);
});
