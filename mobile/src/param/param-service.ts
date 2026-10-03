import { PARAM_ENDPOINTS } from '../../../packages/client-sdk/index.ts';
import { createKeyedCache, type KeyedCache } from '../dict/dict-cache.ts';
import type { RequestConfig } from '../request/types.ts';

export interface ParamServiceDeps {
  request: <T>(config: RequestConfig) => Promise<T>;
  cache?: KeyedCache<string>;
}

export interface ParamService {
  /** 读取参数值（字符串）。并发同一 key 只发一次请求。 */
  getValue(key: string, options?: { force?: boolean }): Promise<string>;
  /** 读取布尔参数。 */
  getBoolean(key: string, options?: { force?: boolean }): Promise<boolean>;
  /** 读取整数参数。 */
  getInteger(key: string, options?: { force?: boolean }): Promise<number>;
  invalidate(key?: string): void;
}

export function createParamService(deps: ParamServiceDeps): ParamService {
  const request = deps.request;
  const cache = deps.cache ?? createKeyedCache<string>((key) => request<string>({ method: 'GET', url: PARAM_ENDPOINTS.value(key) }));
  const booleanCache = createKeyedCache<boolean>((key) =>
    request<boolean>({ method: 'GET', url: PARAM_ENDPOINTS.boolean(key) }),
  );
  const integerCache = createKeyedCache<number>((key) =>
    request<number>({ method: 'GET', url: PARAM_ENDPOINTS.integer(key) }),
  );

  return {
    getValue(key, options = {}) {
      return cache.get(key, options.force === true ? { force: true } : {});
    },
    async getBoolean(key, options = {}) {
      const raw = await booleanCache.get(key, options.force === true ? { force: true } : {});
      return raw === true;
    },
    async getInteger(key, options = {}) {
      const raw = await integerCache.get(key, options.force === true ? { force: true } : {});
      const parsed = typeof raw === 'number' ? raw : Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    },
    invalidate(key) {
      cache.invalidate(key);
      booleanCache.invalidate(key);
      integerCache.invalidate(key);
    },
  };
}
