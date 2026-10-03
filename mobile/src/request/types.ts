import type { ClientType } from '../../../packages/client-sdk/index.ts';

/** 请求方法。 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** 查询参数。 */
export interface QueryParams {
  [key: string]: string | number | boolean | undefined | null;
}

/** 请求配置。 */
export interface RequestConfig {
  method: HttpMethod;
  url: string;
  data?: unknown;
  params?: QueryParams;
  headers?: Record<string, string>;
  /** 二进制响应，不做 envelope 解包（下载/鉴权图片）。 */
  binary?: boolean;
  /** 跳过 401 单飞刷新。刷新请求自身必须带，防止递归。 */
  skipAuthRefresh?: boolean;
  /** multipart 简单上传字段。 */
  formData?: Record<string, unknown>;
  /** 原始二进制请求体（分片上传）。 */
  binaryBody?: Uint8Array | Blob;
  /** 单请求超时（ms）。 */
  timeoutMs?: number;
}

/** 传输层返回。status 为 HTTP 状态码。 */
export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

/** 交给传输层请求（已注入认证与端类型头、已完成 URL 参数拼接的前置信息）。 */
export interface TransportRequest {
  method: HttpMethod;
  url: string;
  body?: unknown;
  formData?: Record<string, unknown>;
  binaryBody?: Uint8Array | Blob;
  params?: QueryParams;
  headers: Record<string, string>;
  binary?: boolean;
  timeoutMs?: number;
}

/**
 * 传输适配器接口（适配器模式）。
 * `web/` 实现 axios，`mobile/` 实现 fetch，共享层只依赖该接口。
 */
export interface HttpTransport {
  request<T = unknown>(request: TransportRequest): Promise<HttpResponse<T>>;
}

/** 客户端选项。 */
export interface RequestClientOptions {
  transport: HttpTransport;
  /** 端类型，移动端恒为 APP。 */
  clientType?: ClientType;
  getAccessToken?: () => string | null | undefined;
  /** 单飞刷新：成功后返回新 accessToken，失败返回 null。 */
  refreshAccessToken?: () => Promise<string | null | undefined>;
  onUnauthorized?: (error: unknown) => void;
  onBusinessError?: (message: string, code: string) => void;
  onError?: (error: unknown) => void;
  locale?: string;
}

/** 对外请求客户端。 */
export interface RequestClient {
  request<T>(config: RequestConfig): Promise<T>;
  raw<T>(config: RequestConfig): Promise<HttpResponse<T>>;
}
