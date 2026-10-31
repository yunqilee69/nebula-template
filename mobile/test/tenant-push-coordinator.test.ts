import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTenantPushCoordinator, type PushTokenProvider } from '../src/push/tenant-push-coordinator.ts';
import type { PushService, RegisterPushDeviceInput } from '../src/push/push-service.ts';
import { createLogger, type LogRecord } from '../src/diagnostics/logger.ts';

function snapshot(overrides: Partial<RegisterPushDeviceInput> = {}): RegisterPushDeviceInput {
  return {
    deviceId: 'dev-1',
    platform: 'ANDROID',
    vendor: 'AGGREGATOR',
    pushToken: 'token-1',
    notificationEnabled: true,
    ...overrides,
  };
}

function fakePushService(events: string[]): PushService {
  return {
    async register(input) {
      events.push(`register:${input.deviceId}:${input.pushToken}`);
      return { id: 'device-row-1' } as never;
    },
    async unregister(deviceId) {
      events.push(`unregister:${deviceId}`);
    },
    async heartbeat() {},
  };
}

function provider(value: RegisterPushDeviceInput | null): PushTokenProvider {
  return { async getRegistration() { return value; } };
}

test('TenantPushTest.registersForCurrentTenantAndUnregistersBeforeSwitch', async () => {
  const events: string[] = [];
  const coordinator = createTenantPushCoordinator({
    pushService: fakePushService(events),
    tokenProvider: provider(snapshot()),
  });

  assert.equal(await coordinator.registerForCurrentTenant('acme'), true);
  await coordinator.unregisterCurrentTenant();

  assert.deepEqual(events, ['register:dev-1:token-1', 'unregister:dev-1']);
});

test('TenantPushTest.reRegistersUnderNewTenantAfterExplicitUnregister', async () => {
  const events: string[] = [];
  const coordinator = createTenantPushCoordinator({
    pushService: fakePushService(events),
    tokenProvider: provider(snapshot()),
  });

  await coordinator.registerForCurrentTenant('acme');
  await coordinator.unregisterCurrentTenant();
  await coordinator.registerForCurrentTenant('globex');

  assert.deepEqual(events, [
    'register:dev-1:token-1',
    'unregister:dev-1',
    'register:dev-1:token-1',
  ]);
});

test('TenantPushTest.unregistersOldDeviceWhenDeviceIdChanges', async () => {
  const events: string[] = [];
  let current = snapshot();
  const coordinator = createTenantPushCoordinator({
    pushService: fakePushService(events),
    tokenProvider: { async getRegistration() { return current; } },
  });

  await coordinator.registerForCurrentTenant('acme');
  current = snapshot({ deviceId: 'dev-2' });
  await coordinator.registerForCurrentTenant('acme');

  assert.deepEqual(events, [
    'register:dev-1:token-1',
    'unregister:dev-1',
    'register:dev-2:token-1',
  ]);
});

test('TenantPushTest.skipsWhenNoNativeTokenAndSwallowsRegisterFailure', async () => {
  const records: LogRecord[] = [];
  const logger = createLogger({ sink: { log: (record) => records.push(record) } });
  const noToken = createTenantPushCoordinator({
    pushService: fakePushService([]),
    tokenProvider: provider(null),
    logger,
  });
  assert.equal(await noToken.registerForCurrentTenant('acme'), false);

  const failing = createTenantPushCoordinator({
    pushService: {
      async register() { throw new Error('push disabled'); },
      async unregister() {},
      async heartbeat() {},
    },
    tokenProvider: provider(snapshot()),
    logger,
  });
  assert.equal(await failing.registerForCurrentTenant('acme'), false);
  assert.equal(records.some((record) => record.message === 'push register failed'), true);
});
