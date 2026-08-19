import { request } from '@/request/request';
import type {
  BatchUpdateUserAssignmentsReq,
  ChangePasswordReq,
  CreateOrgReq,
  CreateUserReq,
  OrgDetailResp,
  OrgOptionResp,
  OrgPageReq,
  OrgResp,
  OrgTreeResp,
  PageResp,
  RoleOptionResp,
  UpdateOrgReq,
  UpdateUserReq,
  UserDetailResp,
  UserPageReq,
  UserResp,
} from '@/types/auth-management';

export interface AuthManagementService {
  pageUsers: (data: UserPageReq) => Promise<PageResp<UserResp>>;
  createUser: (data: CreateUserReq) => Promise<void>;
  updateUser: (data: UpdateUserReq) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  getUserDetail: (id: string) => Promise<UserDetailResp>;
  resetUserPassword: (id: string) => Promise<void>;
  changeUserPassword: (id: string, data: ChangePasswordReq) => Promise<void>;
  batchUpdateUserAssignments: (data: BatchUpdateUserAssignmentsReq) => Promise<void>;
  listRoles: () => Promise<RoleOptionResp[]>;
  listOrgs: () => Promise<OrgOptionResp[]>;
  pageOrgs: (data: OrgPageReq) => Promise<PageResp<OrgResp>>;
  getOrgTree: () => Promise<OrgTreeResp[]>;
  createOrg: (data: CreateOrgReq) => Promise<void>;
  updateOrg: (data: UpdateOrgReq) => Promise<void>;
  deleteOrg: (id: string) => Promise<void>;
  getOrgDetail: (id: string) => Promise<OrgDetailResp>;
}

export const authManagementService: AuthManagementService = {
  pageUsers: (data) => request<PageResp<UserResp>>({ method: 'POST', url: '/api/auth/users/page', data }),
  createUser: (data) => request<void>({ method: 'POST', url: '/api/auth/users', data }),
  updateUser: (data) => request<void>({ method: 'PUT', url: `/api/auth/users/${data.id}`, data }),
  deleteUser: (id) => request<void>({ method: 'DELETE', url: `/api/auth/users/${id}` }),
  getUserDetail: (id) => request<UserDetailResp>({ method: 'GET', url: `/api/auth/users/${id}` }),
  resetUserPassword: (id) => request<void>({ method: 'PUT', url: `/api/auth/users/${id}/reset-password` }),
  changeUserPassword: (id, data) => request<void>({ method: 'PUT', url: `/api/auth/users/${id}/password`, data }),
  batchUpdateUserAssignments: (data) => request<void>({ method: 'POST', url: '/api/auth/users/batch-assignments', data }),
  listRoles: () => request<RoleOptionResp[]>({ method: 'GET', url: '/api/auth/roles/list' }),
  listOrgs: () => request<OrgOptionResp[]>({ method: 'GET', url: '/api/auth/orgs/list' }),
  pageOrgs: (data) => request<PageResp<OrgResp>>({ method: 'POST', url: '/api/auth/orgs/page', data }),
  getOrgTree: () => request<OrgTreeResp[]>({ method: 'GET', url: '/api/auth/orgs/tree' }),
  createOrg: (data) => request<void>({ method: 'POST', url: '/api/auth/orgs', data }),
  updateOrg: (data) => request<void>({ method: 'PUT', url: `/api/auth/orgs/${data.id}`, data }),
  deleteOrg: (id) => request<void>({ method: 'DELETE', url: `/api/auth/orgs/${id}` }),
  getOrgDetail: (id) => request<OrgDetailResp>({ method: 'GET', url: `/api/auth/orgs/${id}` }),
};
