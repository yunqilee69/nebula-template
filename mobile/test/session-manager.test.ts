import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryTokenStorage } from '../src/session/secure-storage.ts';
import { createSessionManager } from '../src/session/session-manager.ts';
import type { LoginResp } from '../../packages/client-sdk/index.ts';

function loginResp(overrides: Partial<LoginResp> = {}): LoginResp {
  const now = Date.now();
  return {
    accessToken: 'access-token-1',
    refreshToken: 'refresh-token-1',
    accessTokenExpiresIn: now + 3_600_000,
    refreshTokenExpiresIn: now + 86_400_000,
    ...overrides,
  };
}

test('TokenSessionTest.testPersistAndRestore', async () => {
  const storage = createInMemoryTokenStorage();
  const first = createSessionManager(storage);
  const saved = await first.save(loginResp());
  assert.equal(saved?.accessToken, 'access-token-1');

  const second = createSessionManager(storage);
  const restored = await second.restore();
  assert.equal(restored?.accessToken, 'access-token-1');
  assert.equal(restored?.refreshToken, 'refresh-token-1');

  await second.clear();
  const third = createSessionManager(storage);
  assert.equal(await third.restore(), null);
});

test('TokenSessionTest.testExpiryIsAbsoluteTimestamp', async () => {
  const storage = createInMemoryTokenStorage();
  const manager = createSessionManager(storage);
  // 3600 若被当作「剩余秒数」会被算成 1970 年附近的时间戳（过去），
  // 正确语义是「绝对毫秒时间戳」——同样在过去，因此必须视为已过期、需要刷新。
  await manager.save(
    loginResp({
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: Date.now() + 86_400_000,
    }),
  );
  assert.equal(manager.shouldRefresh(), true);
  // refreshToken 仍有效，会话整体仍可用
  assert.equal(manager.isUsable(), true);
  assert.equal(manager.canRefresh(), true);
});

test('TokenSessionTest.testSaveRejectsMissingTokens', async () => {
  const manager = createSessionManager(createInMemoryTokenStorage());
  assert.equal(await manager.save({ accessToken: 'a', refreshToken: '' } as LoginResp), null);
  assert.equal(manager.getAccessToken(), null);
});
