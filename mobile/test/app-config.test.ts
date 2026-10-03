import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANDROID_EMULATOR_HOST,
  createAppRuntimeConfig,
  resolveBackendPlatform,
  resolveDefaultBaseURL,
  resolveDevHost,
} from '../src/config/app-config.ts';

test('AppConfigTest.testPlatformMapping', () => {
  assert.equal(resolveBackendPlatform('ios'), 'IOS');
  assert.equal(resolveBackendPlatform('android'), 'ANDROID');
  assert.equal(resolveBackendPlatform('harmony'), 'OHOS');
  assert.equal(resolveBackendPlatform('ohos'), 'OHOS');
  // 未知平台回落到 ANDROID，保证 init 仍带一个服务端认识的 platform
  assert.equal(resolveBackendPlatform('windows'), 'ANDROID');
});

test('AppConfigTest.testAndroidEmulatorUses10_0_2_2', () => {
  // Android 模拟器里 localhost 指向模拟器自身，必须走 10.0.2.2 才能访问宿主机
  assert.equal(resolveDevHost('android'), ANDROID_EMULATOR_HOST);
  assert.equal(resolveDefaultBaseURL('android'), 'http://10.0.2.2:18080');
  // iOS / 鸿蒙模拟器与宿主机共享 loopback
  assert.equal(resolveDefaultBaseURL('ios'), 'http://localhost:18080');
  assert.equal(resolveDefaultBaseURL('harmony'), 'http://localhost:18080');
});

test('AppConfigTest.testCustomPort', () => {
  assert.equal(resolveDefaultBaseURL('ios', 8080), 'http://localhost:8080');
});

test('AppConfigTest.testCreateRuntimeConfigDefaults', () => {
  const config = createAppRuntimeConfig({ os: 'android' });
  assert.equal(config.baseURL, 'http://10.0.2.2:18080');
  assert.equal(config.platform, 'ANDROID');
  assert.equal(config.clientType, 'APP');
  assert.equal(config.appVersion, '0.0.0');
  assert.equal(config.appBuild, 1);
  assert.equal(config.channel, undefined);
});

test('AppConfigTest.testCreateRuntimeConfigOverride', () => {
  const config = createAppRuntimeConfig({
    os: 'ios',
    baseURL: 'https://api.example.com',
    channel: 'appstore',
    appVersion: '1.2.3',
    appBuild: 42,
  });
  assert.equal(config.baseURL, 'https://api.example.com');
  assert.equal(config.platform, 'IOS');
  assert.equal(config.channel, 'appstore');
  assert.equal(config.appVersion, '1.2.3');
  assert.equal(config.appBuild, 42);
});
