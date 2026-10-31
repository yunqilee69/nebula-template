import { createStorageService } from '@/api/storage';
import type { StorageRequestConfig, StorageRequestFn } from '@/api/storage';
import { request } from '@/request/request';
import type { NebulaRequestConfig } from '@/request/types';

function toNebulaMethod(method: StorageRequestConfig['method']): NebulaRequestConfig['method'] {
  switch (method) {
    case 'post':
      return 'POST';
    case 'put':
      return 'PUT';
    case 'delete':
      return 'DELETE';
    case 'get':
    case undefined:
      return 'GET';
  }
}

const storageRequest: StorageRequestFn = <T,>(config: StorageRequestConfig) => request<T>({
  url: config.url,
  method: toNebulaMethod(config.method),
  data: config.data,
  params: config.params,
  headers: config.headers,
  responseType: config.responseType,
  onUploadProgress: config.onUploadProgress,
});

/** 基于当前请求客户端的通用存储服务。 */
export const appStorageService = createStorageService(storageRequest);
