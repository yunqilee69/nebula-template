import { request } from '@/request/request';
import type { OrgTreeResp, RoleOptionResp, UserResp } from '@/types/auth-management';
import type { ButtonPageReq, ButtonResp, MenuPageResp, MenuTreeResp } from '@/types/menu';
import type {
  BatchCreatePermissionReq,
  BatchUpdatePermissionReq,
  CreatePermissionCommand,
  DeletePermissionBySubjectResourceReq,
  PageResp,
  PermissionGrantResp,
  PermissionPageReq,
  PermissionSubject,
  UpdatePermissionReq,
} from '@/types/permission';

export interface PermissionSubjectBundle {
  orgs: PermissionSubject[];
  roles: PermissionSubject[];
  users: PermissionSubject[];
}

export interface PermissionService {
  listSubjects: () => Promise<PermissionSubjectBundle>;
  listMenuTree: () => Promise<MenuTreeResp[]>;
  pageButtons: (params: ButtonPageReq) => Promise<MenuPageResp<ButtonResp>>;
  pageSubjectPermissions: (params: PermissionPageReq) => Promise<PageResp<PermissionGrantResp>>;
  createPermissions: (data: BatchCreatePermissionReq) => Promise<string[]>;
  createPermissionItems: (data: CreatePermissionCommand[]) => Promise<string[]>;
  updatePermissions: (data: BatchUpdatePermissionReq) => Promise<string[]>;
  updatePermission: (id: string, data: UpdatePermissionReq) => Promise<string>;
  removePermissionsBySubjectAndResources: (data: DeletePermissionBySubjectResourceReq) => Promise<void>;
}

function mapOrgSubject(org: OrgTreeResp): PermissionSubject {
  return {
    id: org.id,
    type: 'ORG',
    name: org.name,
    code: org.code,
    status: org.status,
    parentId: org.parentId,
    children: org.children?.map(mapOrgSubject),
  };
}

function mapRoleSubject(role: RoleOptionResp): PermissionSubject {
  return {
    id: role.id,
    type: 'ROLE',
    name: role.name,
    code: role.code,
  };
}

function mapUserSubject(user: UserResp): PermissionSubject {
  return {
    id: user.id,
    type: 'USER',
    name: user.nickname || user.username,
    code: user.username,
    status: user.status,
  };
}

export const permissionService: PermissionService = {
  async listSubjects() {
    const [orgs, roles, usersPage] = await Promise.all([
      request<OrgTreeResp[]>({ url: '/api/auth/orgs/tree', method: 'GET' }),
      request<RoleOptionResp[]>({ url: '/api/auth/roles/list', method: 'GET' }),
      request<PageResp<UserResp>>({
        url: '/api/auth/users/page',
        method: 'POST',
        data: { pageNum: 1, pageSize: 500 },
      }),
    ]);

    return {
      orgs: orgs.map(mapOrgSubject),
      roles: roles.map(mapRoleSubject),
      users: usersPage.data.map(mapUserSubject),
    };
  },

  listMenuTree() {
    return request<MenuTreeResp[]>({ url: '/api/auth/menus/tree', method: 'GET' });
  },

  pageButtons(params) {
    return request<MenuPageResp<ButtonResp>>({
      url: '/api/auth/buttons/page',
      method: 'POST',
      data: params,
    });
  },

  pageSubjectPermissions(params) {
    return request<PageResp<PermissionGrantResp>>({
      url: '/api/auth/permissions/page',
      method: 'POST',
      data: {
        pageNum: params.pageNo ?? 1,
        pageSize: params.pageSize ?? 500,
        ...params,
      },
    });
  },

  createPermissionItems(data) {
    return request<string[]>({
      url: '/api/auth/permissions/batch-items',
      method: 'POST',
      data,
    });
  },

  createPermissions(data) {
    return request<string[]>({
      url: '/api/auth/permissions/batch',
      method: 'POST',
      data,
    });
  },

  updatePermissions(data) {
    return request<string[]>({
      url: '/api/auth/permissions/batch',
      method: 'PUT',
      data,
    });
  },

  updatePermission(id, data) {
    return request<string>({
      url: `/api/auth/permissions/${id}`,
      method: 'PUT',
      data,
    });
  },

  removePermissionsBySubjectAndResources(data) {
    return request<void>({
      url: '/api/auth/permissions/by-subject-resource',
      method: 'DELETE',
      data,
    });
  },
};
