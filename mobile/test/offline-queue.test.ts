import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAX_ATTEMPTS,
  createOfflineQueue,
} from '../src/offline/offline-queue.ts';

test('OfflineQueueTest.testDedupeByIdempotencyKey', () => {
  let seq = 0;
  const queue = createOfflineQueue({ generateId: () => `id-${++seq}` });
  const first = queue.enqueue({ idempotencyKey: 'sign:order-1', execute: async () => {} });
  const second = queue.enqueue({ idempotencyKey: 'sign:order-1', execute: async () => {} });
  assert.equal(first, 'id-1');
  assert.equal(second, first);
  assert.equal(queue.size(), 1);
});

test('OfflineQueueTest.testFlushReplaysInOrder', async () => {
  const executed: string[] = [];
  const queue = createOfflineQueue();
  queue.enqueue({ idempotencyKey: 'a', execute: async () => executed.push('a') });
  queue.enqueue({ idempotencyKey: 'b', execute: async () => executed.push('b') });

  const result = await queue.flush();
  assert.deepEqual(executed, ['a', 'b']);
  assert.deepEqual(result.succeeded, ['a', 'b']);
  assert.equal(result.remaining, 0);
  assert.equal(queue.size(), 0);
});

test('OfflineQueueTest.testFailureStopsAndRetriesThenDrops', async () => {
  let attempts = 0;
  const queue = createOfflineQueue({ maxAttempts: 2 });
  queue.enqueue({
    idempotencyKey: 'flaky',
    execute: async () => {
      attempts += 1;
      throw new Error('offline');
    },
  });
  queue.enqueue({ idempotencyKey: 'after', execute: async () => {} });

  const first = await queue.flush();
  assert.equal(attempts, 1);
  assert.deepEqual(first.failed, ['flaky']);
  assert.equal(first.remaining, 2, '失败保留在队列，后续动作不越过它执行');

  const second = await queue.flush();
  assert.equal(attempts, 2);
  assert.deepEqual(second.dropped, ['flaky']);
  assert.equal(second.remaining, 0);
  assert.equal(DEFAULT_MAX_ATTEMPTS, 5);
});
