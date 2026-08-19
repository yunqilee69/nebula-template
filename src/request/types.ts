import type { AxiosError } from 'axios';

export interface NebulaRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  data?: unknown;
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  responseType?: 'blob';
  _nebulaSkipAuthRefresh?: boolean;
}

export interface NebulaRequestFn {
  <T>(config: NebulaRequestConfig): Promise<T>;
}

export interface RequestClientOptions {
  baseURL?: string;
  timeout?: number;
  getToken?: () => string | null | undefined;
  refreshToken?: () => Promise<string | null | undefined>;
  onRefreshFailed?: (error: unknown) => void;
  onUnauthorized?: () => void;
  onError?: (error: AxiosError) => void;
  onBusinessError?: (message: string) => void;
}
