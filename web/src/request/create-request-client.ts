import axios, { AxiosHeaders } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { RequestClientOptions } from './types';
import { NebulaBusinessError } from './business-error';

export { NebulaBusinessError, isNebulaBusinessError } from './business-error';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _nebulaRetry?: boolean;
  _nebulaSkipAuthRefresh?: boolean;
  _nebulaSilent?: boolean;
}

interface ApiResultPayload {
  readonly code: string | number;
  readonly message?: string;
  readonly msg?: string;
  readonly data?: unknown;
}

const defaultBusinessErrorMessage = '接口请求出错，请联系管理员';

const CLIENT_TYPE_HEADER = 'X-Client-Type';
const TENANT_CODE_HEADER = 'X-Tenant-Code';
const DEFAULT_CLIENT_TYPE = 'WEB';

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

function rejectBusinessError(
  response: AxiosResponse,
  payload: ApiResultPayload,
  options: RequestClientOptions,
) {
  const code = getApiResultCode(payload);
  const message = getApiResultMessage(payload);

  console.error('Nebula request business error', {
    code,
    message,
    url: response.config.url,
  });

  if (!(response.config as RetriableRequestConfig)._nebulaSilent) {
    showBusinessError(message, options);
  }

  return Promise.reject(new NebulaBusinessError(code, message));
}

/**
 * blob 响应也可能承载业务错误。
 *
 * <p>下载类接口（`/api/storage/download*`）的失败走统一异常出口，返回 HTTP 200 +
 * `ApiResult` JSON；而 `responseType=blob` 会把这份 JSON 当二进制收下来，
 * 结果是"图片空白 / 下载到一个坏文件"且用户看不到任何错误提示。
 * 这里按 Content-Type 判定并把内容还原成业务错误，与 JSON 响应共用同一套处理。</p>
 */
async function readBlobBusinessError(response: AxiosResponse): Promise<ApiResultPayload | null> {
  const data: unknown = response.data;
  if (typeof Blob === 'undefined' || !(data instanceof Blob)) return null;

  const contentType = (data.type || String(response.headers?.['content-type'] ?? '')).toLowerCase();
  if (!contentType.includes('json')) return null;

  try {
    const parsed: unknown = JSON.parse(await readBlobText(data));
    if (!isApiResult(parsed) || getApiResultCode(parsed) === '0') return null;
    return parsed;
  } catch {
    // 不是合法 JSON 时按普通二进制处理，交给调用方
    return null;
  }
}

/**
 * 读取 Blob 的文本内容。
 *
 * <p>优先用 {@code Blob.text()}；测试环境（jsdom）与老浏览器没有该 API 时退回 {@code FileReader}，
 * 否则会把"读不出来"误判成"不是业务错误"。</p>
 */
function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text();
  if (typeof FileReader === 'undefined') return Promise.reject(new Error('当前环境不支持读取 Blob'));

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('读取 Blob 失败'));
    reader.readAsText(blob);
  });
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

    const headers = AxiosHeaders.from(config.headers);

    const token = options.getToken?.();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      const tenantCode = options.getTenantCode?.();
      if (tenantCode) {
        headers.set(TENANT_CODE_HEADER, tenantCode);
      }
    }

    if (!headers.has(CLIENT_TYPE_HEADER)) {
      headers.set(CLIENT_TYPE_HEADER, options.clientType ?? DEFAULT_CLIENT_TYPE);
    }

    config.headers = headers;
    return config;
  });

  client.interceptors.response.use(
    (async (response: AxiosResponse) => {
      if (response.config.responseType === 'blob') {
        const errorPayload = await readBlobBusinessError(response);
        if (errorPayload) {
          return rejectBusinessError(response, errorPayload, options);
        }
        return response.data;
      }

      if (!isApiResult(response.data)) {
        return response;
      }

      const code = getApiResultCode(response.data);

      if (code === '0') {
        return response.data.data;
      }

      return rejectBusinessError(response, response.data, options);
    }) as unknown as (response: AxiosResponse) => AxiosResponse,
    async (error) => {
      if (!axios.isAxiosError(error)) {
        return Promise.reject(error);
      }

      const originalConfig: RetriableRequestConfig | undefined = error.config;
      const silent = Boolean(originalConfig?._nebulaSilent);

      if (error.response?.status !== 401) {
        if (!silent) {
          options.onError?.(error);
        }
        return Promise.reject(error);
      }

      if (!options.refreshToken || !originalConfig || originalConfig._nebulaRetry || originalConfig._nebulaSkipAuthRefresh) {
        if (!silent) {
          options.onUnauthorized?.();
          options.onError?.(error);
        }
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
