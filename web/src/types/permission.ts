export type PermissionSubjectType = 'ORG' | 'ROLE' | 'USER';
export type PermissionResourceType = 'MENU' | 'BUTTON';
export type PermissionEffect = 'Allow' | 'Deny';
export type PermissionDraftEffect = 'none' | 'Allow' | 'Deny';

export interface PermissionSubject {
  id: string;
  type: PermissionSubjectType;
  name: string;
  code: string;
  description?: string;
  status?: number;
  parentId?: string;
  children?: PermissionSubject[];
}

export interface PermissionButtonResource {
  id: string;
  type: 'BUTTON';
  name: string;
  code: string;
  description?: string;
  menuId: string;
  status?: number;
}

export interface PermissionMenuResource {
  id: string;
  parentId?: string;
  type: 'MENU';
  name: string;
  code: string;
  path?: string;
  description?: string;
  status?: number;
  buttons: PermissionButtonResource[];
  children?: PermissionMenuResource[];
}

export interface PermissionResourceGroup {
  key: string;
  name: string;
  description?: string;
  menus: PermissionMenuResource[];
}

export interface PermissionGrantResp {
  id: string;
  subjectType: PermissionSubjectType;
  subjectId: string;
  resourceType: PermissionResourceType;
  resourceId: string;
  effect: PermissionEffect;
  scope?: string;
}

export interface SaveSubjectPermissionItem {
  resourceType: PermissionResourceType;
  resourceId: string;
  effect: PermissionEffect;
  scope?: string;
}

export interface SaveSubjectPermissionsReq {
  subjectType: PermissionSubjectType;
  subjectId: string;
  permissions: SaveSubjectPermissionItem[];
}

export interface PermissionResourceReq {
  resourceType: PermissionResourceType;
  resourceId: string;
}

export interface CreatePermissionCommand extends SaveSubjectPermissionItem {
  subjectType: PermissionSubjectType;
  subjectId: string;
}

export interface BatchCreatePermissionReq {
  subjectType: PermissionSubjectType;
  subjectId: string;
  resources: PermissionResourceReq[];
  effect?: PermissionEffect;
  scope?: string;
}

export interface BatchUpdatePermissionReq {
  subjectType: PermissionSubjectType;
  subjectId: string;
  resources: PermissionResourceReq[];
  effect?: PermissionEffect;
  scope?: string;
}

export interface UpdatePermissionReq {
  subjectType?: PermissionSubjectType;
  subjectId?: string;
  resourceType?: PermissionResourceType;
  resourceId?: string;
  effect?: PermissionEffect;
  scope?: string;
}

export interface DeletePermissionBySubjectResourceReq {
  subjectType: PermissionSubjectType;
  subjectId: string;
  resources: PermissionResourceReq[];
}

export interface PermissionPageReq {
  pageNo?: number;
  pageSize?: number;
  subjectType?: PermissionSubjectType;
  subjectId?: string;
  resourceType?: PermissionResourceType;
  resourceId?: string;
  effect?: PermissionEffect;
}

export interface PageResp<T> {
  data: T[];
  total: number;
}
