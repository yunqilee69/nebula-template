import { createRequestClient } from './create-request-client';
import type { NebulaRequestConfig, NebulaRequestFn } from './types';
import type { AxiosError } from 'axios';
import { getStoredAccessToken, getStoredRefreshToken, saveAuthTokens, clearAuthTokens } from '@/utils/auth/token-session';
import { notifySessionExpired } from '@/utils/auth/session-expired';
import { notice } from '@/providers/notice';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginResp } from '@/types/auth';

let notifying = false;
const defaultHttpErrorMessage = '接口请求出错，请稍后重试';

function getHttpErrorMessage(error: AxiosError) {
  const data = error.response?.data;

  if (data && typeof data === 'object') {
    const messageFields = ['message', 'error', 'msg'] as const;
    for (const field of messageFields) {
      if (field in data) {
        const value = (data as Record<string, unknown>)[field];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }
  }

  return error.message.trim() || defaultHttpErrorMessage;
}

function handleSessionExpired() {
  const refreshToken = getStoredRefreshToken();
  const hasStoredTokens = Boolean(getStoredAccessToken() || refreshToken);
  const hasActiveUser = Boolean(useAuthStore.getState().user);

  if (!hasStoredTokens && !hasActiveUser) return;
  if (notifying) return;
  notifying = true;
  clearAuthTokens();
  useAuthStore.getState().clearUser();
  if (refreshToken) {
    notifySessionExpired();
  }
  setTimeout(() => { notifying = false; }, 0);
}

/**
 * 用 refresh token 换取新的 access token。
 *
 * <p>普通请求的 401 自动重试与站内信 SSE 长连接共用这一份刷新逻辑，
 * 避免长连接自己再实现一遍刷新并造成并发刷新。</p>
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await request<LoginResp>({
      method: 'POST',
      url: '/api/auth/refresh',
      data: { refreshToken },
      _nebulaSkipAuthRefresh: true,
    });

    if (!response.accessToken) return null;

    saveAuthTokens(response);
    return response.accessToken;
  } catch {
    return null;
  }
}

export const requestClient = createRequestClient({
  getToken: getStoredAccessToken,
  refreshToken: refreshAccessToken,
  onRefreshFailed: () => {
    handleSessionExpired();
  },
  onUnauthorized: () => {
    handleSessionExpired();
  },
  onError: (error) => {
    if (error.response?.status === 401) return;
    notice.error(getHttpErrorMessage(error));
  },
  onBusinessError: (message) => {
    notice.error(message);
  },
});

export const request: NebulaRequestFn = async <T,>(config: NebulaRequestConfig) => {
  const result: unknown = await requestClient.request(config);
  return result as T;
};
