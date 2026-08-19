import { request } from '@/request/request';
import type { CreateRoleReq, PageResp, RoleDetailResp, RolePageReq, RoleResp, UpdateRoleReq } from '@/types/role';

export interface RoleService {
  createRole: (data: CreateRoleReq) => Promise<string>;
  updateRole: (id: string, data: UpdateRoleReq) => Promise<string>;
  removeRole: (id: string) => Promise<void>;
  getRoleById: (id: string) => Promise<RoleDetailResp>;
  pageRoles: (data: RolePageReq) => Promise<PageResp<RoleResp>>;
  listAllRoles: () => Promise<RoleDetailResp[]>;
}

export const roleService: RoleService = {
  createRole: (data: CreateRoleReq) =>
    request<string>({
      method: 'POST',
      url: '/api/auth/roles',
      data,
    }),

  updateRole: (id: string, data: UpdateRoleReq) =>
    request<string>({
      method: 'PUT',
      url: `/api/auth/roles/${id}`,
      data,
    }),

  removeRole: (id: string) =>
    request<void>({
      method: 'DELETE',
      url: `/api/auth/roles/${id}`,
    }),

  getRoleById: (id: string) =>
    request<RoleDetailResp>({
      method: 'GET',
      url: `/api/auth/roles/${id}`,
    }),

  pageRoles: (data: RolePageReq) =>
    request<PageResp<RoleResp>>({
      method: 'POST',
      url: '/api/auth/roles/page',
      data,
    }),

  listAllRoles: () =>
    request<RoleDetailResp[]>({
      method: 'GET',
      url: '/api/auth/roles/list',
    }),
};
