import { request } from '@/request/request';
import type { StorageSettings, UpdateStorageSettingsRequest } from '@/types/storage-settings';

export interface StorageSettingsService {
  getSettings: () => Promise<StorageSettings>;
  updateSettings: (data: UpdateStorageSettingsRequest) => Promise<void>;
}

/**
 * 存储配置：两层配置（application.yml 只读 + 参数中心可写）的读取与一次提交。
 */
export const storageSettingsService: StorageSettingsService = {
  getSettings: () => request<StorageSettings>({ method: 'GET', url: '/api/storage/settings' }),
  updateSettings: (data) =>
    request<void>({ method: 'PUT', url: '/api/storage/settings', data }),
};
