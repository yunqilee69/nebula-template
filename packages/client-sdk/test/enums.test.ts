import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_TYPE_APP,
  CLIENT_TYPE_HEADER,
  isNotifyCategory,
  isPushPlatform,
  isPushVendor,
  NOTIFY_CATEGORIES,
  NOTIFY_CHANNELS,
  PUSH_PLATFORMS,
  PUSH_VENDORS,
} from '../index.ts';

test('EnumsTest.categoryAndChannelValuesAreFixed', () => {
  assert.deepEqual([...NOTIFY_CATEGORIES], ['SECURITY', 'TODO', 'BUSINESS', 'ANNOUNCEMENT', 'DEFAULT']);
  assert.deepEqual([...NOTIFY_CHANNELS], ['SITE', 'EMAIL', 'PUSH']);
  assert.deepEqual([...PUSH_PLATFORMS], ['IOS', 'ANDROID', 'OHOS']);
  assert.deepEqual(
    [...PUSH_VENDORS],
    ['APNS', 'HMS', 'XIAOMI', 'OPPO', 'VIVO', 'HONOR', 'AGGREGATOR'],
  );
});

test('EnumsTest.guardsRejectUnknownValues', () => {
  assert.equal(isNotifyCategory('BUSINESS'), true);
  assert.equal(isNotifyCategory('MARKETING'), false);
  assert.equal(isPushPlatform('OHOS'), true);
  assert.equal(isPushPlatform('WINDOWS'), false);
  assert.equal(isPushVendor('APNS'), true);
  assert.equal(isPushVendor('FCM'), false);
});

test('EnumsTest.clientTypeContract', () => {
  assert.equal(CLIENT_TYPE_APP, 'APP');
  assert.equal(CLIENT_TYPE_HEADER, 'X-Client-Type');
});
