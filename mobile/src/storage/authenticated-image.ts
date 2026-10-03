import { STORAGE_ENDPOINTS } from '../../../packages/client-sdk/index.ts';
import type { RequestConfig } from '../request/types.ts';

/**
 * 鉴权图片/文件加载。
 *
 * <p>服务端<b>没有直链、没有预览接口</b>；`GET /api/storage/download` 需登录并返回二进制流。
 * 因此必须走带 token 的 blob 获取，再转成可渲染的本地对象 URL，而不是裸 `<Image src>`。</p>
 */

export interface ObjectUrlFactory {
  create(blob: Blob): string;
  revoke(url: string): void;
}

export interface AuthenticatedImageLoader {
  /** 下载并缓存对象 URL；同一 fileId 复用。 */
  load(fileId: string, filename?: string): Promise<string>;
  /** 释放单个 / 全部对象 URL。 */
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

  return {
    async load(fileId, filename) {
      const cached = cache.get(fileId);
      if (cached) return cached;

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
      return url;
    },
    release(fileId) {
      if (fileId === undefined) {
        for (const url of cache.values()) deps.objectUrlFactory.revoke(url);
        cache.clear();
        return;
      }
      const url = cache.get(fileId);
      if (url) {
        deps.objectUrlFactory.revoke(url);
        cache.delete(fileId);
      }
    },
  };
}
