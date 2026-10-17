import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLoginService,
  getEnabledFormLoginMethods,
  isEmailLoginEnabled,
  isEmailRegisterAllowed,
  isPhoneLoginEnabled,
  isPhoneRegisterAllowed,
  isUsernameLoginEnabled,
  isUsernameRegisterAllowed,
  validateEmailLoginInput,
  validateLoginInput,
  validatePhoneLoginInput,
  validateRegisterInput,
  validateSendEmailCodeInput,
  validateSendPhoneCodeInput,
  type LoginSessionStore,
} from '../src/auth/login-service.ts';
import { createSessionManager } from '../src/session/session-manager.ts';
import { createInMemoryTokenStorage } from '../src/session/secure-storage.ts';
import type { AuthTokenSession, LoginResp } from '../../packages/client-sdk/index.ts';
import type { RequestConfig } from '../src/request/types.ts';

const LOGIN_RESP: LoginResp = {
  accessToken: 'at-1',
  refreshToken: 'rt-1',
  accessTokenExpiresIn: Date.now() + 60_000,
  refreshTokenExpiresIn: Date.now() + 600_000,
};

/** 记录调用并返回预设结果的假 request。 */
function fakeRequest(handler: (config: RequestConfig) => unknown) {
  const calls: RequestConfig[] = [];
  const request = async <T>(config: RequestConfig): Promise<T> => {
    calls.push(config);
    return handler(config) as T;
  };
  return { request, calls };
}

test('LoginServiceTest.testLoginSavesSessionAndTrimsUsername', async () => {
  const storage = createInMemoryTokenStorage();
  const session = createSessionManager(storage);
  const { request, calls } = fakeRequest(() => LOGIN_RESP);

  const service = createLoginService({ request, session });
  const saved = await service.login({ username: '  admin  ', password: '123456' });

  assert.equal(saved.accessToken, 'at-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.method, 'POST');
  assert.equal(calls[0]!.url, '/api/auth/login');
  assert.deepEqual(calls[0]!.data, { username: 'admin', password: '123456' });
  // 必须落盘：重启后仍可恢复
  assert.equal(session.getAccessToken(), 'at-1');
  assert.ok(await storage.getItem('nebula.mobile.token-session'));
});

test('LoginServiceTest.testLoginRejectsEmptyInputWithoutRequest', async () => {
  const session = createSessionManager(createInMemoryTokenStorage());
  const { request, calls } = fakeRequest(() => LOGIN_RESP);
  const service = createLoginService({ request, session });

  await assert.rejects(() => service.login({ username: '', password: 'x' }), /请输入用户名/);
  await assert.rejects(() => service.login({ username: 'admin', password: '' }), /请输入密码/);
  assert.equal(calls.length, 0, '本地校验失败不应发起请求');
});

test('LoginServiceTest.testLoginWithoutTokenFailsClosed', async () => {
  const session = createSessionManager(createInMemoryTokenStorage());
  // 服务端返回缺 token 的响应：不得留下半份会话
  const { request } = fakeRequest(() => ({ accessToken: '', refreshToken: '' }) as LoginResp);
  const service = createLoginService({ request, session });

  await assert.rejects(() => service.login({ username: 'admin', password: '123456' }), /缺少令牌/);
  assert.equal(session.get(), null);
});

test('LoginServiceTest.testLogoutClearsSessionEvenWhenServerFails', async () => {
  const session = createSessionManager(createInMemoryTokenStorage());
  await session.save(LOGIN_RESP);
  assert.equal(session.getAccessToken(), 'at-1');

  const { request, calls } = fakeRequest(() => {
    throw new Error('server down');
  });
  const service = createLoginService({ request, session });

  await service.logout();

  assert.equal(calls[0]!.url, '/api/auth/logout');
  assert.equal(session.get(), null, '服务端登出失败也必须清空本地会话');
});

test('LoginServiceTest.testFetchAuthConfig', async () => {
  const session = createSessionManager(createInMemoryTokenStorage());
  const { request, calls } = fakeRequest(() => ({ usernameEnabled: true, phoneEnabled: false }));
  const service = createLoginService({ request, session });

  const config = await service.fetchAuthConfig();
  assert.equal(calls[0]!.method, 'GET');
  assert.equal(calls[0]!.url, '/api/auth/get-auth-config');
  assert.equal(config?.usernameEnabled, true);
});

test('LoginServiceTest.testUsernameLoginEnabledDefaultsOpen', () => {
  // 配置缺失按开放处理：服务端仍会把关，客户端不要先把自己锁死
  assert.equal(isUsernameLoginEnabled(null), true);
  assert.equal(isUsernameLoginEnabled(undefined), true);
  assert.equal(isUsernameLoginEnabled({}), true);
  assert.equal(isUsernameLoginEnabled({ usernameEnabled: false }), false);
});

test('LoginServiceTest.testValidateLoginInputDoesNotEnforcePasswordLength', () => {
  // 密码长度是注册口径，登录侧不得拦截历史短密码（默认 admin 口令就是 6 位）
  assert.deepEqual(validateLoginInput({ username: 'admin', password: '123456' }), { ok: true });
});

test('LoginServiceTest.testPhoneLoginSavesSession', async () => {
  const storage = createInMemoryTokenStorage();
  const session = createSessionManager(storage);
  const { request, calls } = fakeRequest(() => LOGIN_RESP);
  const service = createLoginService({ request, session });

  const saved = await service.phoneLogin({ phone: ' 13800138000 ', code: ' 123456 ' });

  assert.equal(saved.accessToken, 'at-1');
  assert.equal(calls[0]!.method, 'POST');
  assert.equal(calls[0]!.url, '/api/auth/phone-login');
  assert.deepEqual(calls[0]!.data, { phone: '13800138000', code: '123456' });
  assert.equal(session.getAccessToken(), 'at-1');
});

test('LoginServiceTest.testEmailLoginSavesSession', async () => {
  const session = createSessionManager(createInMemoryTokenStorage());
  const { request, calls } = fakeRequest(() => LOGIN_RESP);
  const service = createLoginService({ request, session });

  const saved = await service.emailLogin({ email: ' user@example.com ', code: ' 654321 ' });

  assert.equal(saved.accessToken, 'at-1');
  assert.equal(calls[0]!.url, '/api/auth/email-login');
  assert.deepEqual(calls[0]!.data, { email: 'user@example.com', code: '654321' });
});

test('LoginServiceTest.testSendCodesAndRegister', async () => {
  const session = createSessionManager(createInMemoryTokenStorage());
  const { request, calls } = fakeRequest((config) =>
    config.url === '/api/auth/register' ? 'user-1' : undefined,
  );
  const service = createLoginService({ request, session });

  await service.sendPhoneCode(' 13800138000 ');
  await service.sendEmailCode(' user@example.com ');
  const userId = await service.register({ username: ' newuser ', password: '12345678' });

  assert.deepEqual(
    calls.map((call) => call.url),
    ['/api/auth/send-phone-code', '/api/auth/send-email-code', '/api/auth/register'],
  );
  assert.deepEqual(calls[0]!.data, { phone: '13800138000' });
  assert.deepEqual(calls[1]!.data, { email: 'user@example.com' });
  assert.deepEqual(calls[2]!.data, { username: 'newuser', password: '12345678' });
  assert.equal(userId, 'user-1');
});

test('LoginServiceTest.testPhoneEmailValidationOnlyRejectsEmpty', () => {
  assert.deepEqual(validatePhoneLoginInput({ phone: '', code: '123456' }), {
    ok: false,
    message: '请输入手机号',
  });
  assert.deepEqual(validatePhoneLoginInput({ phone: '13800138000', code: '' }), {
    ok: false,
    message: '请输入验证码',
  });
  assert.deepEqual(validatePhoneLoginInput({ phone: '13800138000', code: '123456' }), { ok: true });

  assert.deepEqual(validateEmailLoginInput({ email: '', code: '123456' }), {
    ok: false,
    message: '请输入邮箱',
  });
  assert.deepEqual(validateEmailLoginInput({ email: 'user@example.com', code: '' }), {
    ok: false,
    message: '请输入验证码',
  });
  assert.deepEqual(validateEmailLoginInput({ email: 'user@example.com', code: '123456' }), {
    ok: true,
  });

  assert.deepEqual(validateSendPhoneCodeInput('   '), { ok: false, message: '请输入手机号' });
  assert.deepEqual(validateSendEmailCodeInput(null), { ok: false, message: '请输入邮箱' });
});

test('LoginServiceTest.testRegisterValidationUsesServerPasswordLength', () => {
  assert.deepEqual(
    validateRegisterInput({
      username: 'newuser',
      password: '12345678',
      confirmPassword: '12345678',
    }),
    { ok: true },
  );

  assert.deepEqual(
    validateRegisterInput({
      username: 'newuser',
      password: '12345678',
      confirmPassword: 'different',
    }),
    { ok: false, message: '两次密码不一致' },
  );

  assert.deepEqual(
    validateRegisterInput(
      { username: 'newuser', password: '12345678' },
      { usernamePasswordMinLength: 10, usernamePasswordMaxLength: 20 },
    ),
    { ok: false, message: '密码长度不能少于10位' },
  );

  assert.deepEqual(
    validateRegisterInput(
      { username: 'newuser', password: '123456789012345678901' },
      { usernamePasswordMinLength: 8, usernamePasswordMaxLength: 20 },
    ),
    { ok: false, message: '密码长度不能超过20位' },
  );
});

test('LoginServiceTest.testEnabledMethodsFollowConfig', () => {
  // 配置缺失时保守回落到用户名密码，与 createFallbackLoginConfig 一致
  assert.deepEqual(getEnabledFormLoginMethods(null), ['username']);
  assert.deepEqual(getEnabledFormLoginMethods({}), ['username']);

  assert.deepEqual(
    getEnabledFormLoginMethods({
      phoneEnabled: true,
      usernameEnabled: false,
      emailEnabled: true,
    }),
    ['phone', 'email'],
  );
  assert.deepEqual(
    getEnabledFormLoginMethods({
      phoneEnabled: false,
      usernameEnabled: false,
      emailEnabled: false,
    }),
    [],
  );
});

test('LoginServiceTest.testLoginAndRegisterGuardsAreConservative', () => {
  assert.equal(isPhoneLoginEnabled({ phoneEnabled: true }), true);
  assert.equal(isPhoneLoginEnabled({}), false);
  assert.equal(isEmailLoginEnabled({ emailEnabled: true }), true);
  assert.equal(isEmailLoginEnabled({}), false);

  assert.equal(isPhoneRegisterAllowed({ phoneRegisterAllowed: true }), true);
  assert.equal(isPhoneRegisterAllowed({}), false);
  assert.equal(isEmailRegisterAllowed({ emailRegisterAllowed: true }), true);
  assert.equal(isEmailRegisterAllowed({}), false);
  assert.equal(isUsernameRegisterAllowed({ usernameRegisterAllowed: true }), true);
  assert.equal(isUsernameRegisterAllowed({}), false);
  // 用户名登录仍按「缺失即开放」处理，保持既有口径
  assert.equal(isUsernameLoginEnabled({}), true);
});

/** 便于类型检查：确保自定义 session 只需 save/clear 两个方法。 */
const _minimalSession: LoginSessionStore = {
  async save(): Promise<AuthTokenSession | null> {
    return null;
  },
  async clear(): Promise<void> {},
};
void _minimalSession;
