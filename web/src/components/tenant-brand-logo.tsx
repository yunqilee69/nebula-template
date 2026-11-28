import { useEffect, useState } from 'react';
import NebulaLogoSvg from '@/assets/brand/nebula-logo.svg?react';
import { useStoragePreviewUrl } from '@/hooks/use-storage-preview-url';

interface TenantBrandLogoProps {
  src?: string;
  alt: string;
  height?: number;
  className?: string;
  /** 登录页在未登录时不能通过带认证的存储接口解析图片。 */
  resolveStorage?: boolean;
}

const publicBrandAssetPath = '/api/frontend/brand-assets/';

function isPublicBrandAssetUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;

  try {
    return new URL(value, 'http://nebula.local').pathname.startsWith(publicBrandAssetPath);
  } catch {
    return false;
  }
}

/** 租户品牌图片：普通/公开地址直接渲染，存储下载地址按需解析预览地址。 */
export function TenantBrandLogo({ src, alt, height = 26, className, resolveStorage = true }: TenantBrandLogoProps) {
  const previewUrl = useStoragePreviewUrl(
    resolveStorage && !isPublicBrandAssetUrl(src) ? src : undefined,
  );
  const resolvedSrc = previewUrl ?? src;
  const [failedSrc, setFailedSrc] = useState<string>();

  useEffect(() => {
    setFailedSrc((current) => current === resolvedSrc ? current : undefined);
  }, [resolvedSrc]);

  if (!resolvedSrc) return null;

  if (failedSrc === resolvedSrc) {
    return (
      <NebulaLogoSvg
        role="img"
        aria-label={alt}
        className={className}
        style={{ height, width: height, maxWidth: height * 6, objectFit: 'contain' }}
      />
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={{ height, width: 'auto', maxWidth: height * 6, objectFit: 'contain' }}
      onError={() => setFailedSrc(resolvedSrc)}
    />
  );
}
