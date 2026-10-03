import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBootstrap } from '../src/bootstrap/bootstrap.ts';
import { mergeInitWithDefaults } from '../src/bootstrap/init-defaults.ts';
import type { CurrentUserResp, FrontendInitResp } from '../../packages/client-sdk/index.ts';

const USER: CurrentUserResp = {
  id: '1',
  username: 'tester',
  roleCodeList: ['OPERATOR'],
  permissionCodeList: ['BUTTON:WMS_X_CREATE:Allow', 'MENU:wms:Allow'],
  menuList: [{ id: 'm1', code: 'wms', name: '仓储', type: 'CATALOG', children: [] }],
};

test('BootstrapTest.testInitThenCurrentUser', async () => {
  const order: string[] = [];
  const result = await runBootstrap({
    fetchInit: async () => {
      order.push('init');
      const init: FrontendInitResp = { frontendConfig: { defaultLocale: 'zh-CN' } };
      return init;
    },
    fetchCurrentUser: async () => {
      order.push('current');
      return USER;
    },
  });

  assert.deepEqual(order, ['init', 'current'], '必须先 init 再 current-user');
  assert.equal(result.initFromFallback, false);
  assert.deepEqual(result.permissionCodes, ['BUTTON:WMS_X_CREATE:Allow', 'MENU:wms:Allow']);
  assert.deepEqual(result.roleCodes, ['OPERATOR']);
  assert.equal(result.menuTree.length, 1);
});

test('BootstrapTest.testInitFailureFallsBackWithoutBlankScreen', async () => {
  let fallbackReason: unknown;
  const result = await runBootstrap({
    fetchInit: async () => {
      throw new Error('init down');
    },
    fetchCurrentUser: async () => USER,
    onInitFallback: (error) => {
      fallbackReason = error;
    },
  });

  assert.equal(result.initFromFallback, true);
  assert.equal((fallbackReason as Error).message, 'init down');
  // 最保守兜底：只放用户名登录，注册与验证码登录关闭
  assert.equal(result.init.loginConfig?.usernameEnabled, true);
  assert.equal(result.init.loginConfig?.usernameRegisterAllowed, false);
  assert.equal(result.init.loginConfig?.phoneEnabled, false);
  // 兜底也给出可用的上传策略默认值
  assert.equal(result.init.storage?.upload?.maxFileSize, 100);
});

test('BootstrapTest.testCurrentUserFailureRejectsForRetry', async () => {
  await assert.rejects(
    () =>
      runBootstrap({
        fetchInit: async () => ({}),
        fetchCurrentUser: async () => {
          throw new Error('network');
        },
      }),
    (error: unknown) => (error as Error).message === 'network',
  );
});

test('BootstrapTest.testServerPushConfigSurvivesMergeAndBootstrap', async () => {
  const merged = mergeInitWithDefaults({
    push: { enabled: true, vendors: ['APNS', 'AGGREGATOR'] },
  });
  assert.deepEqual(merged.push, { enabled: true, vendors: ['APNS', 'AGGREGATOR'] });

  const result = await runBootstrap({
    fetchInit: async () => ({ push: { enabled: true, vendors: ['HMS'] } }),
    fetchCurrentUser: async () => USER,
  });
  assert.deepEqual(result.push, { enabled: true, vendors: ['HMS'] });
  assert.deepEqual(result.init.push, { enabled: true, vendors: ['HMS'] });
});

test('BootstrapTest.testMissingPushMeansNoPushSdk', async () => {
  // 服务端未下发 push（含兜底路径）：必须为 undefined，客户端不得自选厂商通道
  assert.equal(mergeInitWithDefaults({}).push, undefined);
  assert.equal(mergeInitWithDefaults(null).push, undefined);

  const result = await runBootstrap({
    fetchInit: async () => {
      throw new Error('init down');
    },
    fetchCurrentUser: async () => USER,
  });
  assert.equal(result.push, undefined);
});
