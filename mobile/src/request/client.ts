import {
  CLIENT_TYPE_APP,
  CLIENT_TYPE_HEADER,
  isAnonymousEndpoint,
} from '../../../packages/client-sdk/index.ts';
import { unwrapEnvelope } from './envelope.ts';
import { createHttpError, isUnauthorizedError } from './errors.ts';
import type {
  HttpResponse,
  RequestClient,
  RequestClientOptions,
  RequestConfig,
  TransportRequest,
} from './types.ts';

function buildHeaders(
  config: RequestConfig,
  accessToken: string | null | undefined,
  options: RequestClientOptions,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    [CLIENT_TYPE_HEADER]: options.clientType ?? CLIENT_TYPE_APP,
  };
  if (options.locale) headers['Accept-Language'] = options.locale;
  if (config.headers) Object.assign(headers, config.headers);

  if (accessToken && !isAnonymousEndpoint(config.url)) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
}

/**
 * 创建请求客户端。
 *
 * <p>关键语义（与功能说明书 §5.1 一致）：
 * <ul>
 *   <li><b>单飞刷新</b>：并发 401 只触发一次 `refreshAccessToken`（refreshToken 单次有效）；</li>
 *   <li>刷新请求自身带 `skipAuthRefresh`，<b>不触发递归刷新</b>；</li>
 *   <li>刷新失败 → 调用 `onUnauthorized`（清会话 + 跳登录），原请求 reject；</li>
 *   <li>每个请求都注入 `X-Client-Type: APP`。</li>
 * </ul></p>
 */
export function createRequestClient(options: RequestClientOptions): RequestClient {
  let refreshPromise: Promise<string | null | undefined> | null = null;

  async function singleFlightRefresh(): Promise<string | null | undefined> {
    if (!refreshPromise) {
      refreshPromise = Promise.resolve()
        .then(() => options.refreshAccessToken!())
        .catch(() => null)
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  }

  async function send<T>(config: RequestConfig, accessToken: string | null | undefined): Promise<HttpResponse<T>> {
    const transportRequest: TransportRequest = {
      method: config.method,
      url: config.url,
      headers: buildHeaders(config, accessToken, options),
    };
    if (config.data !== undefined) transportRequest.body = config.data;
    if (config.params !== undefined) transportRequest.params = config.params;
    if (config.formData !== undefined) transportRequest.formData = config.formData;
    if (config.binaryBody !== undefined) transportRequest.binaryBody = config.binaryBody;
    if (config.binary !== undefined) transportRequest.binary = config.binary;
    if (config.timeoutMs !== undefined) transportRequest.timeoutMs = config.timeoutMs;
    return options.transport.request<T>(transportRequest);
  }

  async function raw<T>(config: RequestConfig, retried = false): Promise<HttpResponse<T>> {
    const skipRefresh = config.skipAuthRefresh === true;
    const accessToken = skipRefresh ? undefined : options.getAccessToken?.();

    try {
      return await send<T>(config, accessToken);
    } catch (error) {
      if (isUnauthorizedError(error) && !skipRefresh && options.refreshAccessToken) {
        if (retried) {
          options.onUnauthorized?.(error);
          throw error;
        }
        const token = await singleFlightRefresh();
        if (!token) {
          options.onUnauthorized?.(error);
          throw error;
        }
        return raw<T>(config, true);
      }
      if (!isUnauthorizedError(error)) options.onError?.(error);
      throw error;
    }
  }

  async function request<T>(config: RequestConfig): Promise<T> {
    const response = await raw<T>(config);
    if (response.status < 200 || response.status >= 300) {
      const httpError = createHttpError(response.status, `请求失败（HTTP ${response.status}）`);
      options.onError?.(httpError);
      throw httpError;
    }
    try {
      return unwrapEnvelope<T>(response.data, { binary: config.binary === true });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (typeof code === 'string') {
        options.onBusinessError?.((error as Error).message, code);
      }
      throw error;
    }
  }

  return { request, raw };
}
