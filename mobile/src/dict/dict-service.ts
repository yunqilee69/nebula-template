import { DICT_ENDPOINTS, type DictItemTreeResp } from '../../../packages/client-sdk/index.ts';
import type { RequestConfig } from '../request/types.ts';
import { createKeyedCache, type KeyedCache } from './dict-cache.ts';

export interface DictServiceDeps {
  request: <T>(config: RequestConfig) => Promise<T>;
  /**
   * 可选注入的缓存实例。其 loader 收到的是本模块生成的合成缓存键，
   * 需要用 {@link parseDictCacheKey} 还原出 `dictCode` 与 `onlyEnabled` 再发请求。
   */
  cache?: KeyedCache<DictItemTreeResp[]>;
}

export interface DictService {
  /** 按 dictCode 读取字典项（默认只取启用项）。并发同一 code 只发一次请求。 */
  getItems(dictCode: string, options?: { onlyEnabled?: boolean; force?: boolean }): Promise<DictItemTreeResp[]>;
  invalidate(dictCode?: string): void;
}

/** 缓存键里携带的原始请求参数。 */
export interface DictCacheKeyParams {
  dictCode: string;
  onlyEnabled: boolean;
}

/**
 * 生成字典缓存键。
 *
 * <p>缓存键必须与请求参数分开：键只用来做缓存/去重，绝不能当成 `dictCode` 发请求，
 * 否则 URL 里会出现 `%23enabled` 这类合成片段。</p>
 */
export function buildDictCacheKey(dictCode: string, onlyEnabled: boolean): string {
  return `${dictCode}#${onlyEnabled ? 'enabled' : 'all'}`;
}

/** 从缓存键还原原始请求参数（{@link buildDictCacheKey} 的逆运算）。 */
export function parseDictCacheKey(key: string): DictCacheKeyParams {
  const separatorIndex = key.lastIndexOf('#');
  if (separatorIndex < 0) {
    return { dictCode: key, onlyEnabled: true };
  }
  return {
    dictCode: key.slice(0, separatorIndex),
    onlyEnabled: key.slice(separatorIndex + 1) !== 'all',
  };
}

export function createDictService(deps: DictServiceDeps): DictService {
  const cache =
    deps.cache ??
    createKeyedCache<DictItemTreeResp[]>((key) => {
      const { dictCode, onlyEnabled } = parseDictCacheKey(key);
      return deps.request<DictItemTreeResp[]>({
        method: 'GET',
        url: DICT_ENDPOINTS.itemsByCode(dictCode),
        params: { onlyEnabled },
      });
    });

  return {
    getItems(dictCode, options = {}) {
      const onlyEnabled = options.onlyEnabled ?? true;
      const key = buildDictCacheKey(dictCode, onlyEnabled);
      return cache.get(key, options.force === true ? { force: true } : {});
    },
    invalidate(dictCode) {
      if (dictCode === undefined) {
        cache.invalidate();
        return;
      }
      // 两个变体都要清，否则只改了启用项的那份，全量那份仍是脏的
      cache.invalidate(buildDictCacheKey(dictCode, true));
      cache.invalidate(buildDictCacheKey(dictCode, false));
    },
  };
}
