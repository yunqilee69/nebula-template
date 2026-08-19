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

export const requestClient = createRequestClient({
  getToken: getStoredAccessToken,
  refreshToken: async () => {
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
  },
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
