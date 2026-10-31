import type { LoginResponse } from '@/types';
import { clearTokens, getStoredAccessToken, getStoredRefreshToken, saveTokens } from './token';

export class ControlApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = 'UNKNOWN', status = 0) {
    super(message);
    this.name = 'ControlApiError';
    this.code = code;
    this.status = status;
  }
}

type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** 匿名请求（登录、刷新）不携带 Authorization。 */
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  signal?: AbortSignal;
}

interface ApiResult {
  code?: string | number;
  message?: string;
  msg?: string;
  data?: unknown;
}

let unauthorizedHandler: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  if (!query) return path;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }

  const queryString = search.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function buildHeaders(options: RequestOptions): Headers {
  const headers = new Headers({ 'X-Client-Type': 'WEB' });

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const token = options.auth === false ? null : getStoredAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

function readMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const result = payload as ApiResult;
  const message = result.message ?? result.msg;
  return typeof message === 'string' && message.trim() ? message.trim() : fallback;
}

function isApiResult(payload: unknown): payload is ApiResult {
  return payload !== null && typeof payload === 'object' && 'code' in payload;
}

function handleUnauthorized(): void {
  clearTokens();
  unauthorizedHandler?.();
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;

    try {
      const result = await request<LoginResponse>('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
        retryOnUnauthorized: false,
      });

      if (!result.accessToken) return null;
      saveTokens(result);
      return result.accessToken;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function execute<T>(path: string, options: RequestOptions, allowRefresh: boolean): Promise<T> {
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers: buildHeaders(options),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (response.status === 401 && options.auth !== false) {
    if (allowRefresh && options.retryOnUnauthorized !== false && getStoredRefreshToken()) {
      const token = await refreshAccessToken();
      if (token) {
        return execute<T>(path, options, false);
      }
    }
    handleUnauthorized();
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = readMessage(payload, response.statusText || '请求失败');
    throw new ControlApiError(message, `HTTP_${response.status}`, response.status);
  }

  if (isApiResult(payload)) {
    if (String(payload.code) === '0') {
      return payload.data as T;
    }
    throw new ControlApiError(readMessage(payload, '请求失败'), String(payload.code), response.status);
  }

  return payload as T;
}

export function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return execute<T>(path, options, true);
}
