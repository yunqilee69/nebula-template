import type { AxiosError, AxiosProgressEvent } from 'axios';
import type { ClientType } from '@/types/client-type';

export interface NebulaRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  data?: unknown;
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  responseType?: 'blob';
  /** 上传进度回调，直接透传给 axios（分片/整文件上传的真实进度） */
  onUploadProgress?: ((progressEvent: AxiosProgressEvent) => void) | undefined;
  _nebulaSkipAuthRefresh?: boolean;
}

export interface NebulaRequestFn {
  <T>(config: NebulaRequestConfig): Promise<T>;
}

export interface RequestClientOptions {
  baseURL?: string;
  timeout?: number;
  /**
   * 端类型标识，随请求头 `X-Client-Type` 上报，供后端区分 Web / H5 / 小程序 / App 登录来源。
   * 单个请求已显式设置该头时以请求头为准。
   */
  clientType?: ClientType;
  getToken?: () => string | null | undefined;
  refreshToken?: () => Promise<string | null | undefined>;
  onRefreshFailed?: (error: unknown) => void;
  onUnauthorized?: () => void;
  onError?: (error: AxiosError) => void;
  onBusinessError?: (message: string) => void;
}
