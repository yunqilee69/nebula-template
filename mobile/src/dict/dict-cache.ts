/**
 * 通用「带 in-flight 去重 + TTL 缓存」的键值缓存。
 *
 * <p>字典与系统参数共用（服务端各自缓存 300s，客户端同样做短缓存 + 并发去重）。</p>
 *
 * <p>去重语义：同一个 key 的并发请求只发起一次真实调用，其余等待同一个 Promise。</p>
 */

export interface KeyedCache<T> {
  get(key: string, options?: { force?: boolean }): Promise<T>;
  /** 失效单个 key；不传 key 时清空全部。 */
  invalidate(key?: string): void;
}

export interface KeyedCacheOptions {
  ttlMs?: number;
  now?: () => number;
}

/** 与后端字典/参数缓存一致的默认 TTL：300s。 */
export const DEFAULT_CACHE_TTL_MS = 300_000;

export function createKeyedCache<T>(
  loader: (key: string) => Promise<T>,
  options: KeyedCacheOptions = {},
): KeyedCache<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  const now = options.now ?? Date.now;
  const store = new Map<string, { value: T; expiresAt: number }>();
  const inflight = new Map<string, Promise<T>>();

  return {
    get(key, requestOptions = {}) {
      if (!requestOptions.force) {
        const hit = store.get(key);
        if (hit && hit.expiresAt > now()) return Promise.resolve(hit.value);
      }

      const pending = inflight.get(key);
      if (pending) return pending;

      const promise = loader(key)
        .then((value) => {
          store.set(key, { value, expiresAt: now() + ttlMs });
          return value;
        })
        .finally(() => {
          inflight.delete(key);
        });

      inflight.set(key, promise);
      return promise;
    },
    invalidate(key) {
      if (key === undefined) store.clear();
      else store.delete(key);
    },
  };
}
