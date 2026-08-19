import axios, { AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { RequestClientOptions } from './types';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _nebulaRetry?: boolean;
  _nebulaSkipAuthRefresh?: boolean;
}

interface ApiResultPayload {
  readonly code: string | number;
  readonly message?: string;
  readonly msg?: string;
  readonly data?: unknown;
}

const defaultBusinessErrorMessage = '接口请求出错，请联系管理员';

function isApiResult(value: unknown): value is ApiResultPayload {
  if (!value || typeof value !== 'object') return false;
  if (!('code' in value)) return false;
  if (!('message' in value) && !('msg' in value)) return false;

  return (typeof value.code === 'string' || typeof value.code === 'number')
    && (!('message' in value) || typeof value.message === 'string')
    && (!('msg' in value) || typeof value.msg === 'string');
}

function getApiResultCode(result: ApiResultPayload): string {
  return String(result.code);
}

function getApiResultMessage(result: ApiResultPayload): string {
  const rawMessage = result.message ?? result.msg ?? '';
  return rawMessage.trim() || defaultBusinessErrorMessage;
}

function showBusinessError(message: string, options: RequestClientOptions) {
  if (options.onBusinessError) {
    options.onBusinessError(message);
  }
}

export function createRequestClient(options: RequestClientOptions = {}) {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 10000,
  });

  let refreshPromise: Promise<string | null | undefined> | null = null;

  client.interceptors.request.use((config) => {
    const retriableConfig = config as RetriableRequestConfig;

    if (retriableConfig._nebulaRetry) {
      return config;
    }

    const token = options.getToken?.();
    if (token) {
      const headers = AxiosHeaders.from(config.headers);
      headers.set('Authorization', `Bearer ${token}`);
      config.headers = headers;
    }
    return config;
  });

  client.interceptors.response.use(
    ((response: AxiosResponse) => {
      if (response.config.responseType === 'blob') {
        return response.data;
      }

      if (!isApiResult(response.data)) {
        return response;
      }

      const code = getApiResultCode(response.data);

      if (code === '0') {
        return response.data.data;
      }

      const message = getApiResultMessage(response.data);
      console.error('Nebula request business error', {
        code,
        message,
        url: response.config.url,
      });

      showBusinessError(message, options);

      return Promise.reject(new Error(message));
    }) as (response: AxiosResponse) => AxiosResponse,
    async (error) => {
      if (!axios.isAxiosError(error)) {
        return Promise.reject(error);
      }

      if (error.response?.status !== 401) {
        options.onError?.(error);
        return Promise.reject(error);
      }

      const originalConfig: RetriableRequestConfig | undefined = error.config;

      if (!options.refreshToken || !originalConfig || originalConfig._nebulaRetry || originalConfig._nebulaSkipAuthRefresh) {
        options.onUnauthorized?.();
        options.onError?.(error);
        return Promise.reject(error);
      }

      originalConfig._nebulaRetry = true;

      try {
        refreshPromise ??= options.refreshToken();
        const token = await refreshPromise;

        if (!token) {
          options.onRefreshFailed?.(error);
          options.onUnauthorized?.();
          return Promise.reject(error);
        }

        const headers = AxiosHeaders.from(originalConfig.headers);
        headers.set('Authorization', `Bearer ${token}`);
        originalConfig.headers = headers;

        return client.request(originalConfig);
      } catch (refreshError) {
        options.onRefreshFailed?.(refreshError);
        options.onUnauthorized?.();
        return Promise.reject(error);
      } finally {
        refreshPromise = null;
      }
    },
  );

  return client;
}
