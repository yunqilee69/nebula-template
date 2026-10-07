export type ApiPermissionStatus = 0 | 1;

export interface ApiPageReq {
  pageNum: number;
  pageSize: number;
  orderName?: string;
  orderType?: 'asc' | 'desc';
  code?: string;
  name?: string;
  module?: string;
  status?: ApiPermissionStatus;
}

export interface ApiResp {
  id: string;
  name: string;
  code: string;
  module?: string;
  sort?: number;
  remark?: string;
  status: ApiPermissionStatus;
  createTime?: string;
  updateTime?: string;
}

export interface ApiDetailResp {
  id: string;
  name: string;
  code: string;
  module?: string;
  sort?: number;
  remark?: string;
  status: ApiPermissionStatus;
}

export interface CreateApiReq {
  code: string;
  name: string;
  module?: string;
  sort?: number;
  remark?: string;
  status?: ApiPermissionStatus;
}

export interface UpdateApiReq {
  id: string;
  code?: string;
  name?: string;
  module?: string;
  sort?: number;
  remark?: string;
  status?: ApiPermissionStatus;
}

export interface ApiReconciliationEndpoint {
  httpMethod?: string;
  pathPattern: string;
  handler: string;
}

export interface UnregisteredPermission {
  code: string;
  resourceType: 'BUTTON' | 'API' | string;
  endpoints: ApiReconciliationEndpoint[];
}

export interface UnusedApiPermission {
  id: string;
  code: string;
  name: string;
  module?: string;
}

export interface ApiRegistryReconciliationResp {
  unregisteredPermissions: UnregisteredPermission[];
  unusedApiPermissions: UnusedApiPermission[];
}
