export type CacheEntryResp = {
  readonly cacheKey: string;
  readonly cacheValueJson?: string;
  readonly cacheValueType?: string;
  readonly ttlSeconds?: number;
  readonly remainingTtlSeconds?: number;
};

export type CacheResp = {
  readonly cacheName: string;
  readonly defaultTtlSeconds?: number;
  readonly entryCount: number;
  readonly entries: readonly CacheEntryResp[];
};

export type DeleteCacheEntryReq = {
  readonly cacheName: string;
  readonly cacheKey: string;
};
