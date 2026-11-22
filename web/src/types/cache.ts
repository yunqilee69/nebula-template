export type CacheEntryResp = {
  readonly cacheKey: string;
  readonly cacheValueJson?: string;
  readonly cacheValueType?: string;
  readonly ttlSeconds?: number;
  readonly remainingTtlSeconds?: number;
};

export type CacheResp = {
  readonly cacheName: string;
  /** 该命名空间实际生效的缓存模式：redis / caffeine。 */
  readonly cacheMode?: string;
  /** 受保护命名空间：不返回 Key 与值，只能整组清空。 */
  readonly protectedCache?: boolean;
  readonly defaultTtlSeconds?: number;
  /** 条目数；后端无法枚举时为 undefined（未知，不要当成 0）。 */
  readonly entryCount?: number;
  readonly entries: readonly CacheEntryResp[];
};

export type DeleteCacheEntryReq = {
  readonly cacheName: string;
  readonly cacheKey: string;
};

export type ClearCacheReq = {
  readonly cacheName: string;
};
