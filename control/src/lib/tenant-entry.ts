const template = (import.meta.env.VITE_TENANT_ENTRY_URL_TEMPLATE ?? '').trim();

/**
 * 构造数据平面企业入口地址。控制平面不参与数据平面路由，只提供跳转。
 */
export function buildTenantEntryUrl(code?: string): string | null {
  if (!template || !code) return null;
  return template.replaceAll('{code}', encodeURIComponent(code));
}

export function tenantHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
