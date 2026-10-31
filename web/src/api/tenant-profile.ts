import { request } from '@/request/request';
import type { TenantProfile, UpdateTenantProfileReq } from '@/types/tenant-profile';

export interface TenantProfileService {
  getProfile: () => Promise<TenantProfile>;
  updateProfile: (data: UpdateTenantProfileReq) => Promise<TenantProfile>;
}

export const tenantProfileService: TenantProfileService = {
  getProfile: () => request<TenantProfile>({ method: 'GET', url: '/api/auth/tenant/profile' }),
  updateProfile: (data) => request<TenantProfile>({ method: 'PUT', url: '/api/auth/tenant/profile', data }),
};
