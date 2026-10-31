/**
 * 从深链/二维码 URL 解析企业代码。
 *
 * <p>只接受显式 {@code tenantCode} 查询参数，不做子域名猜测；企业代码统一转小写。</p>
 */
export function extractTenantCode(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const match = /[?&]tenantCode=([^&#]+)/i.exec(url);
  if (!match) return undefined;
  try {
    const value = decodeURIComponent(match[1] ?? '').trim().toLowerCase();
    return value || undefined;
  } catch {
    return undefined;
  }
}
