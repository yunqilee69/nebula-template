import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canRefreshSession,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  isSessionUsable,
  parseAuthTokenSession,
  serializeAuthTokenSession,
  shouldRefreshAccessToken,
  toAuthTokenSession,
  type AuthTokenSession,
} from '../token-session.ts';

const NOW = 1_700_000_000_000; // 绝对毫秒时间戳

function session(overrides: Partial<AuthTokenSession> = {}): AuthTokenSession {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    accessTokenExpiresIn: NOW + 3_600_000,
    refreshTokenExpiresIn: NOW + 86_400_000,
    ...overrides,
  };
}

test('TokenSessionTest.testExpiryIsAbsoluteTimestamp', () => {
  // 若把 *ExpiresIn 误当「剩余秒数」，3600 会被当作 1970 年附近的时间戳，
  // 在本断言里表现为「已过期」；正确的绝对毫秒语义下 3600 同样是过去时间（1970），
  // 所以用一个「秒数会被误判为未来、毫秒会被判为过去」的值来区分：
  // 1_700_000_000_000ms（绝对毫秒）= 2023 年；若当秒数则远超年份 9999（未来）。
  const absolutePast = session({ accessTokenExpiresIn: NOW });
  assert.equal(isAccessTokenExpired(absolutePast, NOW), true);

  const future = session({ accessTokenExpiresIn: NOW + 3_600_000 });
  assert.equal(isAccessTokenExpired(future, NOW), false);

  // refreshToken 同样按绝对毫秒处理
  const refreshExpired = session({ refreshTokenExpiresIn: NOW - 1 });
  assert.equal(isRefreshTokenExpired(refreshExpired, NOW), true);
  assert.equal(canRefreshSession(refreshExpired, NOW), false);
});

test('TokenSessionTest.testPersistAndRestore', () => {
  const original = session();
  const raw = serializeAuthTokenSession(original);
  const restored = parseAuthTokenSession(raw);
  assert.deepEqual(restored, original);
});

test('TokenSessionTest.parseRejectsPartialOrInvalid', () => {
  assert.equal(parseAuthTokenSession(null), null);
  assert.equal(parseAuthTokenSession('not-json'), null);
  assert.equal(parseAuthTokenSession('{"accessToken":"a"}'), null);
  assert.equal(parseAuthTokenSession('{"accessToken":"a","refreshToken":"b"}')?.accessToken, 'a');
});

test('TokenSessionTest.toAuthTokenSessionRequiresBothTokens', () => {
  assert.equal(toAuthTokenSession(null), null);
  assert.equal(toAuthTokenSession({ accessToken: 'a', refreshToken: '' }), null);
  const s = toAuthTokenSession({
    accessToken: 'a',
    refreshToken: 'b',
    accessTokenExpiresIn: NOW,
    refreshTokenExpiresIn: NOW,
  });
  assert.equal(s?.accessToken, 'a');
  assert.equal(s?.accessTokenExpiresIn, NOW);
});

test('TokenSessionTest.sessionUsableUsesRefreshFallback', () => {
  const accessExpired = session({ accessTokenExpiresIn: NOW - 1 });
  assert.equal(isSessionUsable(accessExpired, NOW), true); // 仍可刷新
  assert.equal(shouldRefreshAccessToken(accessExpired, NOW), true);

  const bothExpired = session({ accessTokenExpiresIn: NOW - 1, refreshTokenExpiresIn: NOW - 1 });
  assert.equal(isSessionUsable(bothExpired, NOW), false);
  assert.equal(canRefreshSession(bothExpired, NOW), false);
});
