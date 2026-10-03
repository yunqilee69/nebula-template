import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createKeyedCache, DEFAULT_CACHE_TTL_MS } from '../src/dict/dict-cache.ts';

test('DictCacheTest.testInFlightDedup', async () => {
  let loadCount = 0;
  const cache = createKeyedCache<string>(async (key) => {
    loadCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return `value:${key}`;
  });

  const results = await Promise.all([
    cache.get('order-status'),
    cache.get('order-status'),
    cache.get('order-status'),
    cache.get('order-status'),
  ]);

  assert.deepEqual(results, ['value:order-status', 'value:order-status', 'value:order-status', 'value:order-status']);
  assert.equal(loadCount, 1);
});

test('DictCacheTest.testCachedHitAndForceReload', async () => {
  let loadCount = 0;
  const cache = createKeyedCache<number>(async () => {
    loadCount += 1;
    return loadCount;
  });

  assert.equal(await cache.get('k'), 1);
  assert.equal(await cache.get('k'), 1); // 命中缓存
  assert.equal(loadCount, 1);

  assert.equal(await cache.get('k', { force: true }), 2);
  assert.equal(loadCount, 2);
});

test('DictCacheTest.testTtlExpiryAndInvalidate', async () => {
  let clock = 0;
  let loadCount = 0;
  const cache = createKeyedCache<string>(
    async () => {
      loadCount += 1;
      return `v${loadCount}`;
    },
    { ttlMs: DEFAULT_CACHE_TTL_MS, now: () => clock },
  );

  assert.equal(await cache.get('k'), 'v1');
  clock += DEFAULT_CACHE_TTL_MS + 1;
  assert.equal(await cache.get('k'), 'v2'); // TTL 过期

  cache.invalidate('k');
  assert.equal(await cache.get('k'), 'v3');
});

test('DictCacheTest.testDifferentKeysAreSeparate', async () => {
  const keys: string[] = [];
  const cache = createKeyedCache<string>(async (key) => {
    keys.push(key);
    return key.toUpperCase();
  });
  assert.equal(await cache.get('a'), 'A');
  assert.equal(await cache.get('b'), 'B');
  assert.deepEqual(keys, ['a', 'b']);
});
