import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowTenantCodeInput } from '../src/auth/login-service.ts';
import type { FrontendLoginConfigResp } from '../../packages/client-sdk/index.ts';

/**
 * `shouldShowTenantCodeInput` 的三态真值表。
 *
 * <p>只有后端<b>明确</b>下发 `tenantEnabled === false`（单租户部署）才隐藏；
 * `true` / `null` / `undefined` / 字段缺失 / `loginConfig` 整个缺失一律显示，
 * 否则多租户首启（`init` 被 19001 拦截，`loginConfig` 必然缺失）会形成死路。</p>
 *
 * <p>本文件只验证纯函数规则，<b>不是</b> React Native 渲染测试。</p>
 */

test('LoginConfigTest.testTenantEnabledFalseHidesInput', () => {
  assert.equal(shouldShowTenantCodeInput({ tenantEnabled: false }), false);
});

test('LoginConfigTest.testTenantEnabledTrueShowsInput', () => {
  assert.equal(shouldShowTenantCodeInput({ tenantEnabled: true }), true);
});

test('LoginConfigTest.testTenantEnabledNullShowsInput', () => {
  // 运行期防御：后端可能下发空值。契约类型仍为 `boolean`，这里只验证运行期行为。
  const config = { tenantEnabled: null } as unknown as FrontendLoginConfigResp;
  assert.equal(shouldShowTenantCodeInput(config), true);
});

test('LoginConfigTest.testTenantEnabledUndefinedShowsInput', () => {
  assert.equal(shouldShowTenantCodeInput({ tenantEnabled: undefined }), true);
});

test('LoginConfigTest.testEmptyLoginConfigShowsInput', () => {
  assert.equal(shouldShowTenantCodeInput({}), true);
});

test('LoginConfigTest.testMissingLoginConfigShowsInput', () => {
  assert.equal(shouldShowTenantCodeInput(undefined), true);
  assert.equal(shouldShowTenantCodeInput(null), true);
});
