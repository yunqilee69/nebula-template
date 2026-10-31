import { request } from '@/request/request';
import type {
  CompleteBindingReq,
  PersonLink,
  PersonSummary,
  PersonTenant,
  PlatformPerson,
  TenantInvitation,
  TenantDomainSummary,
  TenantSummary,
} from '@/types/auth';

/**
 * 平台账号自助接口。
 *
 * 平台账号不再独立登录，所有请求都复用当前租户会话；personId 由后端从令牌中读取。
 */
export const personService = {
  current: (options?: { silent?: boolean }) =>
    request<PersonSummary>({
      method: 'GET',
      url: '/api/auth/account/person',
      ...(options?.silent ? { _nebulaSilent: true } : {}),
    }),
  updateProfile: (data: { displayName: string }) =>
    request<PersonSummary>({ method: 'PUT', url: '/api/auth/account/person/profile', data }),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    request<void>({ method: 'PUT', url: '/api/auth/account/person/password', data }),
  tenants: () => request<PersonTenant[]>({ method: 'GET', url: '/api/auth/account/person/tenants' }),
  switchableTenants: () => request<PersonTenant[]>({ method: 'GET', url: '/api/auth/my/tenants' }),
  platformPersonsPage: (params: { pageNum: number; pageSize: number; keyword?: string; status?: string }) =>
    request<{ data: PlatformPerson[]; total: number }>({ method: 'GET', url: '/api/auth/persons', params }),
  links: () => request<PersonLink[]>({ method: 'GET', url: '/api/auth/account/person/links' }),
  revokeLink: (id: string) =>
    request<void>({ method: 'DELETE', url: `/api/auth/account/person/links/${id}` }),
  logoutAll: () => request<number>({ method: 'POST', url: '/api/auth/account/person/logout-all' }),
  createTenant: (data: Record<string, unknown>) =>
    request<TenantSummary>({ method: 'POST', url: '/api/auth/tenants', data }),
  updateTenant: (id: string, data: Record<string, unknown>) =>
    request<TenantSummary>({ method: 'PUT', url: `/api/auth/tenants/${id}`, data }),
  tenantsPage: (params: { pageNum: number; pageSize: number; keyword?: string; status?: string }) =>
    request<{ data: TenantSummary[]; total: number }>({ method: 'GET', url: '/api/auth/tenants', params }),
  updateTenantStatus: (id: string, status: string) =>
    request<TenantSummary>({ method: 'PUT', url: `/api/auth/tenants/${id}/status`, data: { status } }),
  deleteTenant: (id: string) =>
    request<TenantSummary>({ method: 'DELETE', url: `/api/auth/tenants/${id}` }),
  listTenantDomains: (id: string) =>
    request<TenantDomainSummary[]>({ method: 'GET', url: `/api/auth/tenants/${id}/domains` }),
  addTenantDomain: (id: string, data: { domain: string; primary?: boolean }) =>
    request<TenantDomainSummary>({ method: 'POST', url: `/api/auth/tenants/${id}/domains`, data }),
  createTenantInvitation: (id: string, data: { email?: string; phone?: string; roleId?: string; orgId?: string }) =>
    request<TenantInvitation>({ method: 'POST', url: `/api/auth/tenants/${id}/invitations`, data }),
  listTenantInvitations: (id: string) =>
    request<TenantInvitation[]>({ method: 'GET', url: `/api/auth/tenants/${id}/invitations` }),
  acceptTenantInvitation: (data: { token: string; username: string; password: string; displayName?: string }) =>
    request<TenantInvitation>({ method: 'POST', url: '/api/auth/invitations/accept', data }),
};

export const bindingService = {
  complete: (data: CompleteBindingReq) =>
    request<import('@/types/auth').LoginResp>({
      method: 'POST',
      url: '/api/auth/login/binding/complete',
      data,
    }),
};
