export interface TenantHostInfo {
  hostname: string;
  tenantCode?: string;
  baseDomain?: string;
}

const TENANT_CODE_STORAGE_KEY = 'nebula-web.tenant-code';
const TENANT_CODE_QUERY_KEYS = ['tenantCode', 'tenant_code', 'tenant'];

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

function normalizeTenantCode(code: string | null | undefined): string | undefined {
  const normalized = code?.trim().toLowerCase();
  return normalized || undefined;
}

export function resolveTenantHost(hostname = typeof window === 'undefined' ? '' : window.location.hostname): TenantHostInfo {
  const normalized = normalizeHostname(hostname);
  if (!normalized) {
    return { hostname: '' };
  }

  const labels = normalized.split('.');
  if (labels.length >= 3) {
    return {
      hostname: normalized,
      tenantCode: labels[0],
      baseDomain: labels.slice(1).join('.'),
    };
  }

  if (labels.length === 2 && labels[1] === 'localhost' && labels[0] !== 'www') {
    return {
      hostname: normalized,
      tenantCode: labels[0],
      baseDomain: 'localhost',
    };
  }

  return {
    hostname: normalized,
    baseDomain: normalized === 'localhost' ? 'localhost' : undefined,
  };
}

/** 读取用户手工选择并持久化的企业代码。 */
export function getStoredTenantCode(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return normalizeTenantCode(window.localStorage.getItem(TENANT_CODE_STORAGE_KEY));
  } catch {
    return undefined;
  }
}

/** 持久化企业代码；使用独立 key，避免与登录态、令牌缓存混用。 */
export function saveTenantCode(code: string): string | undefined {
  const normalized = normalizeTenantCode(code);
  if (!normalized || typeof window === 'undefined') return undefined;
  try {
    window.localStorage.setItem(TENANT_CODE_STORAGE_KEY, normalized);
  } catch {
    // 隐私模式或禁用存储时降级为仅当前内存生效（后续请求会读到 URL/子域名）。
  }
  return normalized;
}

export function clearTenantCode(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TENANT_CODE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * 从 URL 中提取企业代码并保存。
 *
 * <p>租户子域名是权威来源：已经在 `acme.example.com` 时忽略 URL 上的覆盖参数，
 * 避免通过链接伪造其他租户。</p>
 */
export function applyTenantCodeFromUrl(url?: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  if (resolveTenantHost().tenantCode) return undefined;

  let searchParams: URLSearchParams;
  try {
    searchParams = new URL(url ?? window.location.href).searchParams;
  } catch {
    return undefined;
  }

  for (const key of TENANT_CODE_QUERY_KEYS) {
    const code = normalizeTenantCode(searchParams.get(key));
    if (code) {
      return saveTenantCode(code);
    }
  }
  return undefined;
}

/**
 * 请求使用的企业代码。
 *
 * <p>优先级：租户子域名 > 用户手工选择（持久化）> 构建期环境变量。
 * 子域名最高，保证部署在租户域名下时不会被本地缓存带到其他租户。</p>
 */
export function getTenantCode(): string | undefined {
  const hostTenantCode = resolveTenantHost().tenantCode;
  if (hostTenantCode) return hostTenantCode;

  const stored = getStoredTenantCode();
  if (stored) return stored;

  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const configured = env?.VITE_TENANT_CODE;
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().toLowerCase();
  }
  return undefined;
}

export function getBaseDomain(): string | undefined {
  return resolveTenantHost().baseDomain;
}

export function buildTenantUrl(tenant: { code?: string; subdomain?: string }): string | null {
  const subdomain = tenant.subdomain?.trim() || tenant.code?.trim();
  if (!subdomain) return null;
  if (typeof window === 'undefined') return null;
  const baseDomain = getBaseDomain();
  if (!baseDomain) return null;
  const port = window.location.port ? `:${window.location.port}` : '';
  // 平台租户列表返回的 subdomain 已是完整域名，个人企业列表返回的是裸标签。
  const host = subdomain.includes('.') ? subdomain : `${subdomain}.${baseDomain}`;
  return `${window.location.protocol}//${host}${port}`;
}

/**
 * 生成邀请链接。
 *
 * <p>租户子域名下直接使用当前域名；裸域名（如 localhost）下把企业代码放进查询参数，
 * 接受邀请页会读取并持久化，后续登录即可带上正确租户。</p>
 */
export function buildInvitationUrl(token: string, tenantCode: string, path = '/invitations/accept'): string {
  if (typeof window === 'undefined') {
    return `${path}?token=${encodeURIComponent(token)}`;
  }
  const params = new URLSearchParams({ token });
  if (!resolveTenantHost().tenantCode && tenantCode) {
    params.set('tenantCode', tenantCode);
  }
  return `${window.location.origin}${path}?${params.toString()}`;
}
