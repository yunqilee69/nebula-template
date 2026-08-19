import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { cacheService } from './cache';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cacheService', () => {
  it('calls GET /api/frontend/caches to list dynamic caches', async () => {
    mockedRequest.mockResolvedValue([]);

    await cacheService.listCaches();

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/frontend/caches',
    });
  });

  it('calls DELETE /api/frontend/caches/entries with cache identifiers', async () => {
    mockedRequest.mockResolvedValue(undefined);

    await cacheService.deleteCacheEntry({ cacheName: 'login-lock', cacheKey: 'lock:alice' });

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/api/frontend/caches/entries',
      params: { cacheName: 'login-lock', cacheKey: 'lock:alice' },
    });
  });
});
