const accessTokenKey = 'nebula-web.access-token';
const refreshTokenKey = 'nebula-web.refresh-token';
const tenantCodeKey = 'nebula-web.tenant-code';
/** 自动登录偏好：local 表示持久登录，session 表示关闭浏览器后失效。 */
const persistenceKey = 'nebula-web.token-persistence';

export type TokenPersistence = 'local' | 'session';

interface SaveAuthTokensOptions {
  /**
   * 是否持久登录（勾选「自动登录」）。
   *
   * <p>不传时沿用上一次的选择，避免刷新令牌等后台流程把会话级登录悄悄升级为持久登录。</p>
   */
  persist?: boolean;
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function resolvePersistence(persist: boolean | undefined): TokenPersistence {
  if (persist === true) return 'local';
  if (persist === false) return 'session';
  // 偏好存在 localStorage：即使当前是会话级登录，关闭浏览器后仍能记住默认值。
  return getLocalStorage()?.getItem(persistenceKey) === 'session' ? 'session' : 'local';
}

function getWriteStorage(persistence: TokenPersistence): Storage | null {
  return persistence === 'session' ? getSessionStorage() : getLocalStorage();
}

function readToken(key: string): string | null {
  return getSessionStorage()?.getItem(key) ?? getLocalStorage()?.getItem(key) ?? null;
}

export function getStoredAccessToken(): string | null {
  return readToken(accessTokenKey);
}

export function getStoredRefreshToken(): string | null {
  return readToken(refreshTokenKey);
}

export function getStoredTenantCode(): string | null {
  return getLocalStorage()?.getItem(tenantCodeKey) ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function getStringField(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

function resolveTokenSource(response: unknown): Record<string, unknown> | null {
  if (!isRecord(response)) return null;

  if (isRecord(response.data)) {
    return response.data;
  }

  if (isRecord(response.loginResult)) {
    return response.loginResult;
  }

  return response;
}

export function saveAuthTokens(response: unknown, options: SaveAuthTokensOptions = {}): void {
  const tokenSource = resolveTokenSource(response);
  if (!tokenSource) return;

  const persistence = resolvePersistence(options.persist);
  const storage = getWriteStorage(persistence);
  if (!storage) return;
  const otherStorage = persistence === 'session' ? getLocalStorage() : getSessionStorage();

  const accessToken = getStringField(tokenSource, ['accessToken', 'access_token', 'token']);
  const refreshToken = getStringField(tokenSource, ['refreshToken', 'refresh_token']);

  // 两种存储互斥：切换自动登录选择后旧令牌不能留在另一处，否则读取顺序会读到过期值。
  otherStorage?.removeItem(accessTokenKey);
  otherStorage?.removeItem(refreshTokenKey);
  // 偏好固定存 localStorage：会话级登录关闭浏览器后令牌失效，但下次仍默认不勾选自动登录。
  getLocalStorage()?.setItem(persistenceKey, persistence);

  if (accessToken) {
    storage.setItem(accessTokenKey, accessToken);
  }

  if (refreshToken) {
    storage.setItem(refreshTokenKey, refreshToken);
  }

  const tenantCode = getStringField(tokenSource, ['tenantCode']);
  if (tenantCode) {
    getLocalStorage()?.setItem(tenantCodeKey, tenantCode);
  }
}

export function clearAuthTokens(): void {
  for (const storage of [getLocalStorage(), getSessionStorage()]) {
    if (!storage) continue;
    storage.removeItem(accessTokenKey);
    storage.removeItem(refreshTokenKey);
    storage.removeItem(tenantCodeKey);
  }
  getLocalStorage()?.removeItem(persistenceKey);
}
