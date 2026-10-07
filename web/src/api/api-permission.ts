import { request } from '@/request/request';
import type { MenuPageResp } from '@/types/menu';
import type {
  ApiDetailResp,
  ApiPageReq,
  ApiRegistryReconciliationResp,
  ApiResp,
  CreateApiReq,
  UpdateApiReq,
} from '@/types/api-permission';

export interface ApiPermissionService {
  createApi: (data: CreateApiReq) => Promise<string>;
  updateApi: (id: string, data: UpdateApiReq) => Promise<string>;
  removeApi: (id: string) => Promise<void>;
  getApiById: (id: string) => Promise<ApiDetailResp>;
  pageApis: (data: ApiPageReq) => Promise<MenuPageResp<ApiResp>>;
  listApis: (data?: ApiListReq) => Promise<ApiResp[]>;
  getReconciliation: () => Promise<ApiRegistryReconciliationResp>;
}

export interface ApiListReq {
  module?: string;
}

export const apiPermissionService: ApiPermissionService = {
  createApi: (data) => request<string>({ method: 'POST', url: '/api/auth/apis', data }),
  updateApi: (id, data) => request<string>({ method: 'PUT', url: `/api/auth/apis/${id}`, data }),
  removeApi: (id) => request<void>({ method: 'DELETE', url: `/api/auth/apis/${id}` }),
  getApiById: (id) => request<ApiDetailResp>({ method: 'GET', url: `/api/auth/apis/${id}` }),
  pageApis: (data) => request<MenuPageResp<ApiResp>>({ method: 'POST', url: '/api/auth/apis/page', data }),
  listApis: (data) =>
    request<ApiResp[]>({
      method: 'GET',
      url: '/api/auth/apis/list',
      params: data?.module ? { module: data.module } : undefined,
    }),
  getReconciliation: () =>
    request<ApiRegistryReconciliationResp>({ method: 'GET', url: '/api/auth/apis/reconciliation' }),
};
