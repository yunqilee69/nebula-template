import { request } from '@/lib/http';
import type { PageResult, Tenant, TenantBrandingConfig, TenantDomain, TenantInvitation } from '@/types';

export interface TenantPageQuery {
  pageNum: number;
  pageSize: number;
  keyword?: string;
  status?: string;
}

/** 企业资料字段，创建与更新共用。 */
export interface TenantProfilePayload {
  name: string;
  logo?: string;
  contactEmail?: string;
  shortName?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  industry?: string;
  description?: string;
  locale?: string;
  timezone?: string;
  branding?: TenantBrandingConfig;
}

export interface CreateTenantPayload extends TenantProfilePayload {
  code: string;
  subdomain?: string;
  adminUsername?: string;
  adminPassword?: string;
  adminNickname?: string;
  adminEmail?: string;
  adminPhone?: string;
}

export interface UpdateTenantPayload extends Partial<TenantProfilePayload> {
  settingsJson?: string;
}

export interface CreateInvitationPayload {
  email?: string;
  phone?: string;
  roleId?: string;
  orgId?: string;
}

export const tenantApi = {
  page: (query: TenantPageQuery) =>
    request<PageResult<Tenant>>('/api/auth/tenants', { query: { ...query } }),

  create: (payload: CreateTenantPayload) =>
    request<Tenant>('/api/auth/tenants', { method: 'POST', body: payload }),

  update: (id: string, payload: UpdateTenantPayload) =>
    request<Tenant>(`/api/auth/tenants/${id}`, { method: 'PUT', body: payload }),

  updateStatus: (id: string, status: string) =>
    request<Tenant>(`/api/auth/tenants/${id}/status`, { method: 'PUT', body: { status } }),

  remove: (id: string) =>
    request<Tenant>(`/api/auth/tenants/${id}`, { method: 'DELETE' }),

  listDomains: (id: string) =>
    request<TenantDomain[]>(`/api/auth/tenants/${id}/domains`),

  addDomain: (id: string, payload: { domain: string; primary?: boolean }) =>
    request<TenantDomain>(`/api/auth/tenants/${id}/domains`, { method: 'POST', body: payload }),

  listInvitations: (id: string) =>
    request<TenantInvitation[]>(`/api/auth/tenants/${id}/invitations`),

  createInvitation: (id: string, payload: CreateInvitationPayload) =>
    request<TenantInvitation>(`/api/auth/tenants/${id}/invitations`, { method: 'POST', body: payload }),
};
