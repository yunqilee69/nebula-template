import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  FrontendInitResp,
  FrontendPushInitResp,
} from '../index.ts';

/**
 * push 节点契约测试：类型层面保证 `FrontendInitResp.push` 存在，
 * 运行层面锁定字段名与取值形状，避免后端下发后被客户端链路静默丢弃。
 */
test('FrontendPushTest.initCarriesPushNode', () => {
  const push: FrontendPushInitResp = { enabled: true, vendors: ['APNS', 'AGGREGATOR'] };
  const init: FrontendInitResp = { push };

  assert.equal(init.push?.enabled, true);
  assert.deepEqual(init.push?.vendors, ['APNS', 'AGGREGATOR']);
});

test('FrontendPushTest.pushIsOptionalAndMayBeAbsent', () => {
  const init: FrontendInitResp = {};
  assert.equal(init.push, undefined);
});
