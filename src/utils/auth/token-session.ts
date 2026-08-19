const accessTokenKey = 'nebula-web.access-token';
const refreshTokenKey = 'nebula-web.refresh-token';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getStoredAccessToken(): string | null {
  return getStorage()?.getItem(accessTokenKey) ?? null;
}

export function getStoredRefreshToken(): string | null {
  return getStorage()?.getItem(refreshTokenKey) ?? null;
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

export function saveAuthTokens(response: unknown): void {
  const storage = getStorage();
  if (!storage) return;

  const tokenSource = resolveTokenSource(response);
  if (!tokenSource) return;

  const accessToken = getStringField(tokenSource, ['accessToken', 'access_token', 'token']);
  const refreshToken = getStringField(tokenSource, ['refreshToken', 'refresh_token']);

  if (accessToken) {
    storage.setItem(accessTokenKey, accessToken);
  }

  if (refreshToken) {
    storage.setItem(refreshTokenKey, refreshToken);
  }
}

export function clearAuthTokens(): void {
  const storage = getStorage();
  if (!storage) return;

  storage.removeItem(accessTokenKey);
  storage.removeItem(refreshTokenKey);
}
