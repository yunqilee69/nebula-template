import { useStoragePreviewUrl } from '@/hooks/use-storage-preview-url';

interface TenantBrandLogoProps {
  src?: string;
  alt: string;
  height?: number;
  className?: string;
  /**
   * 是否通过带登录态的存储接口解析预览地址。
   *
   * <p>登录页在未登录时渲染，不能调用需要 Authorization 的存储接口；此时传 false，
   * 直接使用存储直链或外链，失败时由浏览器按破图处理，不触发全局错误提示。</p>
   */
  resolveStorage?: boolean;
}

/** 租户品牌图片：支持存储下载地址与普通外链，存储地址按需解析预览地址。 */
export function TenantBrandLogo({ src, alt, height = 26, className, resolveStorage = true }: TenantBrandLogoProps) {
  const previewUrl = useStoragePreviewUrl(resolveStorage ? src : undefined);
  const resolvedSrc = previewUrl ?? src;
  if (!resolvedSrc) return null;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={{ height, width: 'auto', maxWidth: height * 6, objectFit: 'contain' }}
    />
  );
}
