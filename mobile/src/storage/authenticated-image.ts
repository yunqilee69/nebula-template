import { STORAGE_ENDPOINTS } from '../../../packages/client-sdk/index.ts';
import type { StorageDownloadLocation } from '../../../packages/client-sdk/index.ts';
import type { RequestConfig } from '../request/types.ts';

/**
 * 鉴权图片/文件加载。
 *
 * <p>先向后端要"下载位置"，再按返回的 mode 分支：<b>DIRECT</b> 时服务端返回对象存储临时直链，
 * 直接交给 `<Image>` 原生加载（无 blob、无 Authorization）；<b>PROXY</b> 时走带 token 的二进制获取，
 * 转成可渲染的本地对象 URL。两条分支常驻，由服务端配置决定走哪条，filesystem / db 后端永远是 PROXY。</p>
 */

export interface ObjectUrlFactory {
  create(blob: Blob): string;
  revoke(url: string): void;
}

export interface AuthenticatedImageLoader {
  /** 解析并缓存可渲染地址；同一 fileId 复用。 */
  load(fileId: string, filename?: string): Promise<string>;
  /** 释放单个 / 全部对象 URL（直链不是对象 URL，无需释放）。 */
  release(fileId?: string): void;
}

export interface AuthenticatedImageLoaderDeps {
  request: <T>(config: RequestConfig) => Promise<T>;
  objectUrlFactory: ObjectUrlFactory;
}

export function createAuthenticatedImageLoader(
  deps: AuthenticatedImageLoaderDeps,
): AuthenticatedImageLoader {
  const cache = new Map<string, string>();
  /** 只有 blob 转出来的对象 URL 需要 revoke；直链不能 revoke。 */
  const revocableKeys = new Set<string>();

  return {
    async load(fileId, filename) {
      const cached = cache.get(fileId);
      if (cached) return cached;

      // 预览不传 filename：避免直链带上 attachment 头
      const locations = await deps.request<StorageDownloadLocation[]>({
        method: 'GET',
        url: STORAGE_ENDPOINTS.downloadLocation,
        params: { fileId },
      });
      const location = locations[0];
      if (location?.mode === 'DIRECT' && location.url) {
        cache.set(fileId, location.url);
        return location.url;
      }

      const params: Record<string, string> = { fileId };
      if (filename !== undefined) params.filename = filename;

      const blob = await deps.request<Blob>({
        method: 'GET',
        url: STORAGE_ENDPOINTS.download,
        params,
        binary: true,
      });
      const url = deps.objectUrlFactory.create(blob);
      cache.set(fileId, url);
      revocableKeys.add(fileId);
      return url;
    },
    release(fileId) {
      if (fileId === undefined) {
        for (const key of revocableKeys) {
          const url = cache.get(key);
          if (url) deps.objectUrlFactory.revoke(url);
        }
        revocableKeys.clear();
        cache.clear();
        return;
      }
      const url = cache.get(fileId);
      if (url && revocableKeys.has(fileId)) {
        deps.objectUrlFactory.revoke(url);
      }
      cache.delete(fileId);
      revocableKeys.delete(fileId);
    },
  };
}
