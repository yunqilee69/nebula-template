import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPushService, NOTIFY_INBOX_DEEPLINK, parseDeeplink, resolvePushRoute } from '../src/push/push-service.ts';
import { createLogger, type LogRecord } from '../src/diagnostics/logger.ts';
import type { RequestConfig } from '../src/request/types.ts';

test('PushTest.testRegisterSendsUpsertPayloadWithoutLeakingToken', async () => {
  const calls: RequestConfig[] = [];
  const records: LogRecord[] = [];
  const logger = createLogger({ sink: { log: (record) => records.push(record) } });
  const service = createPushService({
    request: async <T>(config: RequestConfig) => {
      calls.push(config);
      return { id: 'device-1' } as T;
    },
    logger,
  });

  await service.register({
    deviceId: 'dev-1',
    platform: 'ANDROID',
    vendor: 'AGGREGATOR',
    pushToken: 'super-secret-push-token',
    notificationEnabled: true,
    appVersion: '1.0.0',
    appBuild: 10,
  });

  const call = calls[0]!;
  assert.equal(call.method, 'POST');
  assert.equal(call.url, '/api/notify/push-devices');
  assert.equal((call.data as { pushToken: string }).pushToken, 'super-secret-push-token');

  const logRecord = records[0]!;
  assert.equal((logRecord.data as { pushToken: string }).pushToken, '***');
  assert.equal(JSON.stringify(logRecord.data).includes('super-secret-push-token'), false);
});

test('PushTest.testNotificationDisabledStillRegisters', async () => {
  const calls: RequestConfig[] = [];
  const service = createPushService({
    request: async <T>(config: RequestConfig) => {
      calls.push(config);
      return { id: 'device-1' } as T;
    },
  });
  await service.register({
    deviceId: 'dev-1',
    platform: 'IOS',
    vendor: 'APNS',
    pushToken: 'tok',
    notificationEnabled: false,
  });
  assert.equal((calls[0]!.data as { notificationEnabled: boolean }).notificationEnabled, false);
});

test('PushTest.testDeeplinkParse', () => {
  const route = parseDeeplink('wms://delivery/assigned?orderNo=123&x=a%20b');
  assert.equal(route?.scheme, 'wms');
  assert.equal(route?.path, 'delivery/assigned');
  assert.equal(route?.params.orderNo, '123');
  assert.equal(route?.params.x, 'a b');
  assert.equal(parseDeeplink('not-a-link'), null);
  assert.equal(parseDeeplink(''), null);
});

test('PushTest.testDeeplinkFallbackToInbox', () => {
  // 无 payload → 收件箱
  assert.equal(resolvePushRoute(null).raw, NOTIFY_INBOX_DEEPLINK);
  // 深链存在但未识别 → 收件箱，不白屏
  assert.equal(resolvePushRoute({ deeplink: 'wms://unknown/path' }).raw, NOTIFY_INBOX_DEEPLINK);
  // 已识别 → 用原深链
  const known = resolvePushRoute({ deeplink: 'wms://delivery/assigned?orderNo=9' }, (route) =>
    route.path === 'delivery/assigned',
  );
  assert.equal(known.raw, 'wms://delivery/assigned?orderNo=9');
  assert.equal(known.params.orderNo, '9');
});
