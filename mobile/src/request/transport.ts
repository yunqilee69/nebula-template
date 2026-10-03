import { createHttpError, createNetworkError } from './errors.ts';
import type { HttpTransport, QueryParams, TransportRequest, HttpResponse } from './types.ts';

/**
 * RN 上传的文件字段形态（React Native 的 FormData 约定）。
 *
 * <p>独立成类型并在 transport 里识别、原样交给 FormData：若走 `String(value)` 会把对象
 * 序列化成 "[object Object]"，服务端收到的"文件"只是一段文本。</p>
 */
export interface RnFilePart {
  uri: string;
  name?: string;
  type?: string;
}

function isRnFilePart(value: unknown): value is RnFilePart {
  return typeof value === 'object' && value !== null
    && typeof (value as { uri?: unknown }).uri === 'string';
}

/** fetch 传输适配器选项。 */
export interface FetchTransportOptions {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  /** 便于测试替换；默认用全局 fetch。 */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function buildUrl(baseURL: string | undefined, url: string, params?: QueryParams): string {
  const base = baseURL ? `${baseURL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}` : url;
  if (!params) return base;
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  if (!query) return base;
  return base.includes('?') ? `${base}&${query}` : `${base}?${query}`;
}

function collectResponseHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: unknown };
        if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message.trim();
      } catch {
        return text.trim();
      }
    }
  } catch {
    // 忽略读取失败，回落默认文案
  }
  return `请求失败（HTTP ${response.status}）`;
}

/**
 * 基于 fetch 的传输适配器（RN 新架构下 fetch 可用）。
 *
 * <p>只负责「发出去、收回来」，不做 envelope 解包、不做 401 刷新——那些属于请求客户端。</p>
 */
export function createFetchTransport(options: FetchTransportOptions = {}): HttpTransport {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async request<T>(request: TransportRequest): Promise<HttpResponse<T>> {
      const url = buildUrl(options.baseURL, request.url, request.params);
      const headers: Record<string, string> = { ...options.defaultHeaders, ...request.headers };

      let body: BodyInit | undefined;
      if (request.formData) {
        const form = new FormData();
        for (const [key, value] of Object.entries(request.formData)) {
          if (value === undefined || value === null) continue;
          if (value instanceof Blob) form.append(key, value);
          else if (isRnFilePart(value)) form.append(key, value as unknown as Blob);
          else form.append(key, String(value));
        }
        body = form;
      } else if (request.binaryBody) {
        body = request.binaryBody as BodyInit;
      } else if (request.body !== undefined) {
        if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        body = JSON.stringify(request.body);
      }

      const timeoutMs = request.timeoutMs ?? options.timeoutMs;
      const controller = timeoutMs ? new AbortController() : undefined;
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: request.method,
          headers,
          body,
          ...(controller ? { signal: controller.signal } : {}),
        });
      } catch (error) {
        throw createNetworkError('网络异常，请重试', error);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }

      if (response.status === 401) {
        throw createHttpError(401, '登录状态已失效');
      }
      if (!response.ok) {
        throw createHttpError(response.status, await readErrorMessage(response));
      }

      const data = request.binary ? await response.blob() : await response.json().catch(() => null);
      return { status: response.status, data: data as T, headers: collectResponseHeaders(response) };
    },
  };
}
