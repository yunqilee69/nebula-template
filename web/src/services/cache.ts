import { request } from '@/request/request';
import type { CacheResp, DeleteCacheEntryReq } from '@/types/cache';

export interface CacheService {
  readonly listCaches: () => Promise<CacheResp[]>;
  readonly deleteCacheEntry: (data: DeleteCacheEntryReq) => Promise<void>;
}

export const cacheService: CacheService = {
  listCaches: () => request<CacheResp[]>({ method: 'GET', url: '/api/frontend/caches' }),
  deleteCacheEntry: (data) => request<void>({ method: 'DELETE', url: '/api/frontend/caches/entries', params: data }),
};
