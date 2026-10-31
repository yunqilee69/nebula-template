import { request } from '@/request/request';

export interface TenantOAuth2Provider {
  id: string;
  tenantId: string;
  providerId: string;
  channel: string;
  enabled: boolean;
  clientId?: string;
  hasClientSecret?: boolean;
  redirectUri?: string;
  frontendCallbackUri?: string;
  frontendCallbackAllowlist?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  scope?: string;
  configJson?: string;
}

export const tenantOAuthService = {
  list: () => request<TenantOAuth2Provider[]>({ method: 'GET', url: '/api/auth/tenant/oauth2-providers' }),
  upsert: (data: Partial<TenantOAuth2Provider> & { providerId: string; channel: string }) =>
    request<TenantOAuth2Provider>({ method: 'POST', url: '/api/auth/tenant/oauth2-providers', data }),
  remove: (id: string) =>
    request<void>({ method: 'DELETE', url: `/api/auth/tenant/oauth2-providers/${id}` }),
};
