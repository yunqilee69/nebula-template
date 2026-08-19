export type RoleStatus = 0 | 1;

export interface PageResp<T> {
  data: T[];
  total: number;
}

export interface BasePageReq {
  pageNum?: number;
  pageSize?: number;
  orderName?: string;
  orderType?: 'asc' | 'desc';
}

export interface RolePageReq extends BasePageReq {
  name?: string;
  code?: string;
  status?: RoleStatus;
}

export interface CreateRoleReq {
  name: string;
  code: string;
  description?: string;
  status?: RoleStatus;
  permissionIds?: string[];
}

export interface UpdateRoleReq {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  status?: RoleStatus;
  permissionIds?: string[];
}

export interface RoleResp {
  id: string;
  name: string;
  code: string;
  status: RoleStatus;
  createTime?: string;
  updateTime?: string;
}

export interface PermissionSimpleResp {
  id: string;
  name: string;
  code: string;
}

export interface RoleDetailResp {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: RoleStatus;
  permissions: PermissionSimpleResp[];
}
