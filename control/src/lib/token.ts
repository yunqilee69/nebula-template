const accessTokenKey = 'nebula-control.access-token';
const refreshTokenKey = 'nebula-control.refresh-token';

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

function resolveTokenSource(response: unknown): Record<string, unknown> | null {
  if (!isRecord(response)) return null;
  if (isRecord(response.data)) return response.data;
  if (isRecord(response.loginResult)) return response.loginResult;
  return response;
}

function readString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

export function saveTokens(response: unknown): void {
  const storage = getStorage();
  const source = resolveTokenSource(response);
  if (!storage || !source) return;

  const accessToken = readString(source, ['accessToken', 'access_token', 'token']);
  const refreshToken = readString(source, ['refreshToken', 'refresh_token']);

  if (accessToken) storage.setItem(accessTokenKey, accessToken);
  if (refreshToken) storage.setItem(refreshTokenKey, refreshToken);
}

export function clearTokens(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(accessTokenKey);
  storage.removeItem(refreshTokenKey);
}
