import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProfileService,
  formatAccountStatus,
  formatBindingStatus,
  formatClientType,
  formatDateTime,
  formatLoginResult,
  formatLoginType,
} from '../src/auth/profile-service.ts';
import type { RequestConfig } from '../src/request/types.ts';

function fakeRequest(handler: (config: RequestConfig) => unknown) {
  const calls: RequestConfig[] = [];
  const request = async <T>(config: RequestConfig): Promise<T> => {
    calls.push(config);
    return handler(config) as T;
  };
  return { request, calls };
}

test('ProfileServiceTest.testLoadsProfileBindingsAndLoginRecords', async () => {
  const { request, calls } = fakeRequest((config) => {
    if (config.url === '/api/auth/profile') {
      return { id: 'u1', username: 'admin', phone: '13800138000' };
    }
    if (config.url === '/api/auth/profile/oauth2/bindings') {
      return { providers: [{ providerId: 'github', providerName: 'GitHub', bound: true }] };
    }
    if (config.url === '/api/auth/profile/login-records/page') {
      return { data: [{ id: 'r1', loginType: 'PHONE', loginResult: 'SUCCESS' }], total: 1 };
    }
    return undefined;
  });
  const service = createProfileService({ request });

  const profile = await service.getProfile();
  const bindings = await service.listOAuth2Bindings();
  const records = await service.pageLoginRecords(2, 10);

  assert.equal(profile.username, 'admin');
  assert.equal(bindings.providers[0]?.providerId, 'github');
  assert.equal(records.total, 1);
  assert.equal(records.data[0]?.loginType, 'PHONE');

  assert.deepEqual(
    calls.map((call) => [call.method, call.url]),
    [
      ['GET', '/api/auth/profile'],
      ['GET', '/api/auth/profile/oauth2/bindings'],
      ['POST', '/api/auth/profile/login-records/page'],
    ],
  );
  assert.deepEqual(calls[2]!.data, { pageNum: 2, pageSize: 10 });
});

test('ProfileServiceTest.testFormatsLoginRecordFields', () => {
  assert.equal(formatLoginType('PASSWORD'), '账号密码');
  assert.equal(formatLoginType('PHONE'), '手机号');
  assert.equal(formatLoginType('EMAIL'), '邮箱');
  assert.equal(formatLoginType('OAUTH2'), '第三方');
  assert.equal(formatLoginType('UNKNOWN_TYPE'), 'UNKNOWN_TYPE');
  assert.equal(formatLoginType(undefined), '-');

  assert.equal(formatLoginResult('SUCCESS'), '成功');
  assert.equal(formatLoginResult('FAILED'), '失败');
  assert.equal(formatLoginResult(undefined), '-');

  assert.equal(formatClientType('WEB'), '浏览器');
  assert.equal(formatClientType('APP'), 'App');
  assert.equal(formatClientType('UNKNOWN'), '未知');
  assert.equal(formatClientType(undefined), '-');

  assert.equal(formatAccountStatus(1), '正常');
  assert.equal(formatAccountStatus(0), '已禁用');
  assert.equal(formatAccountStatus(undefined), '-');

  assert.equal(formatBindingStatus(true), '已绑定');
  assert.equal(formatBindingStatus(false), '未绑定');

  assert.equal(formatDateTime('2026-01-01T10:00:00'), '2026-01-01 10:00:00');
  assert.equal(formatDateTime(undefined), '-');
});
