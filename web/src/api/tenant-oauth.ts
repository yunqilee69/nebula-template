import { request } from '@/request/request';

/** Provider 标识；后端归一化为小写后存储。 */
export type TenantOAuth2ProviderId = 'github' | 'wechat';

/** 渠道标识；请求接受小写 `web` / `mini`，响应由后端返回大写 `WEB` / `MINI`。 */
export type TenantOAuth2Channel = 'web' | 'mini';

/** 企业 OAuth2 配置响应；Client Secret 只返回 `hasClientSecret`，永不回显明文。 */
export interface TenantOAuth2Provider {
  id: string;
  tenantId: string;
  providerId: string;
  channel: string;
  enabled: boolean;
  clientId?: string;
  hasClientSecret?: boolean;
  /**
   * 凭据是否完整：`enabled=true` 且该渠道必填项齐全。
   * 单租户下存在记录即以记录为准、不回退 YAML，因此 `false` 表示该渠道当前不可用。
   */
  credentialComplete: boolean;
  /** 缺失项中文标签，与保存期校验报错文案同源；完整时为空数组（后端保证不返回 null）。 */
  missingFields: string[];
  redirectUri?: string;
  frontendCallbackUri?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  scope?: string;
  configJson?: string;
}

/** 保存请求（对应后端 `UpsertTenantOAuth2ProviderReq`）；`clientSecret` 只写不读。 */
export interface UpsertTenantOAuth2ProviderReq {
  providerId: TenantOAuth2ProviderId;
  channel: TenantOAuth2Channel;
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  frontendCallbackUri?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  scope?: string;
  configJson?: string;
}

export const tenantOAuthService = {
  list: () => request<TenantOAuth2Provider[]>({ method: 'GET', url: '/api/auth/tenant/oauth2-providers' }),
  upsert: (data: UpsertTenantOAuth2ProviderReq) =>
    request<TenantOAuth2Provider>({ method: 'POST', url: '/api/auth/tenant/oauth2-providers', data }),
  remove: (id: string) =>
    request<void>({ method: 'DELETE', url: `/api/auth/tenant/oauth2-providers/${id}` }),
};
