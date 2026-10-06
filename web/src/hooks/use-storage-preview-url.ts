import { useEffect, useRef, useState } from 'react';
import { parseStorageDownloadUrl, STORAGE_DOWNLOAD_LOCATION_PATH } from '@/api/storage';
import type { StorageDownloadLocation } from '@/api/storage';
import { request } from '@/request/request';

function normalizeOptionalText(value: string | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

function revokeObjectUrl(objectUrl: string) {
  if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(objectUrl);
}

/**
 * 把存储下载地址解析成可渲染的预览地址。
 *
 * <p>服务端决定取回方式：直链模式直接把对象存储地址交给 `<img src>`（原生加载，不需要 blob 与 Authorization），
 * 代理模式沿用带 token 的 blob 获取再转对象 URL。客户端两条分支都实现，由服务端按配置选择。</p>
 */
export function useStoragePreviewUrl(url: string | undefined) {
  const [previewUrl, setPreviewUrl] = useState<string>();
  const activeObjectUrlRef = useRef<string>();

  const replaceActiveObjectUrl = (nextObjectUrl: string | undefined) => {
    const previousObjectUrl = activeObjectUrlRef.current;
    activeObjectUrlRef.current = nextObjectUrl;
    if (previousObjectUrl && previousObjectUrl !== nextObjectUrl) {
      revokeObjectUrl(previousObjectUrl);
    }
  };

  useEffect(() => () => {
    if (activeObjectUrlRef.current) revokeObjectUrl(activeObjectUrlRef.current);
  }, []);

  useEffect(() => {
    const normalizedUrl = normalizeOptionalText(url);
    if (!normalizedUrl) {
      replaceActiveObjectUrl(undefined);
      setPreviewUrl(undefined);
      return;
    }

    const downloadParams = parseStorageDownloadUrl(normalizedUrl);
    if (!downloadParams) {
      replaceActiveObjectUrl(undefined);
      setPreviewUrl(normalizedUrl);
      return;
    }

    let active = true;
    let objectUrl: string | undefined;

    // 预览不传 filename：避免直链带上 attachment 头；variant 保留，缩略图仍取派生版本
    request<StorageDownloadLocation[]>({
      url: STORAGE_DOWNLOAD_LOCATION_PATH,
      method: 'GET',
      params: { fileId: downloadParams.fileId, variant: downloadParams.variant },
    })
      .then((locations) => {
        const location = locations[0];
        if (location?.mode === 'DIRECT' && location.url) {
          if (!active) return undefined;
          replaceActiveObjectUrl(undefined);
          setPreviewUrl(location.url);
          return undefined;
        }

        if (typeof URL.createObjectURL !== 'function') {
          return undefined;
        }
        return request<Blob>({
          url: location?.url ?? normalizedUrl,
          method: 'GET',
          responseType: 'blob',
        }).then((blob) => {
          objectUrl = URL.createObjectURL(blob);
          if (active) {
            replaceActiveObjectUrl(objectUrl);
            setPreviewUrl(objectUrl);
            return;
          }
          revokeObjectUrl(objectUrl);
        });
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          return;
        }
        throw error;
      });

    return () => {
      active = false;
    };
  }, [url]);

  return previewUrl;
}
