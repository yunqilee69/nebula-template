export interface PageResp<T> {
  data: T[];
  total: number;
}

export interface PageReq {
  pageNum: number;
  pageSize: number;
  orderName?: string;
  orderType?: 'asc' | 'desc';
}

export type EnableStatus = 0 | 1;

export interface RoleOptionResp {
  id: string;
  name: string;
  code: string;
  status?: EnableStatus;
}

export interface OrgOptionResp {
  id: string;
  name: string;
  code: string;
  type?: OrgType;
  parentId?: string;
}

export interface UserPageReq extends PageReq {
  username?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  status?: EnableStatus;
  orgId?: string;
  roleId?: string;
  withRole?: boolean;
  withoutRole?: boolean;
  withoutOrg?: boolean;
}

export type BatchAssignmentOperation = 'ADD' | 'REMOVE';

export interface BatchUpdateUserAssignmentsReq {
  readonly userIds: readonly string[];
  readonly roleIds?: readonly string[] | null;
  readonly orgIds?: readonly string[] | null;
  readonly operation?: BatchAssignmentOperation;
}

export interface UserResp {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status: EnableStatus;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface UserDetailResp extends UserResp {
  roles?: RoleOptionResp[];
  organizations?: OrgOptionResp[];
}

export interface CreateUserReq {
  username: string;
  password: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status?: EnableStatus;
  remark?: string;
  roleIds?: string[];
  orgIds?: string[];
}

export interface UpdateUserReq {
  id: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status?: EnableStatus;
  remark?: string;
  roleIds?: string[];
  orgIds?: string[];
}

export interface ChangePasswordReq {
  oldPassword: string;
  newPassword: string;
}

export type OrgType = 'COMPANY' | 'DEPARTMENT' | 'TEAM';

export interface OrgPageReq extends PageReq {
  name?: string;
  code?: string;
  parentId?: string;
  status?: EnableStatus;
}

export interface OrgResp {
  id: string;
  name: string;
  code: string;
  type: OrgType;
  status: EnableStatus;
  parentId?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface OrgDetailResp extends OrgResp {}

export interface OrgTreeResp extends OrgResp {
  children?: OrgTreeResp[];
}

export interface CreateOrgReq {
  name: string;
  code: string;
  parentId?: string;
  type: OrgType;
  status?: EnableStatus;
}

export interface UpdateOrgReq {
  id: string;
  name?: string;
  code?: string;
  parentId?: string;
  type?: OrgType;
  status?: EnableStatus;
}
