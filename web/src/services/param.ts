import { request } from '@/request/request';
import type { NebulaPageResp } from '@/components/nebula-pro-table/params';
import type {
  BatchUpdateResultResp,
  CreateSystemParamReq,
  GeneralConfigDTO,
  ParamValueUpdateReq,
  SystemParamDetailResp,
  SystemParamPageReq,
  SystemParamResp,
  UpdateSystemParamReq,
} from '@/types/param';

export type SaveOrUpdateSystemParamByKeyReq = Partial<Pick<
  CreateSystemParamReq,
  'paramName' | 'paramValue' | 'dataType' | 'moduleCode'
>>;

export interface ParamService {
  pageParams: (data: SystemParamPageReq) => Promise<NebulaPageResp<SystemParamResp>>;
  getParam: (id: string) => Promise<SystemParamDetailResp>;
  createParam: (data: CreateSystemParamReq) => Promise<string>;
  updateParam: (id: string, data: UpdateSystemParamReq) => Promise<string>;
  deleteParam: (id: string) => Promise<void>;
  getValueByKey: (paramKey: string) => Promise<string>;
  saveOrUpdateByKey: (paramKey: string, data: SaveOrUpdateSystemParamByKeyReq) => Promise<string>;
  getByKey: (paramKey: string) => Promise<SystemParamDetailResp>;
  getIntegerValue: (paramKey: string) => Promise<number>;
  getBooleanValue: (paramKey: string) => Promise<boolean>;
  listByModule: (moduleCode: string) => Promise<SystemParamResp[]>;
  batchUpdateValues: (data: readonly ParamValueUpdateReq[]) => Promise<BatchUpdateResultResp>;
  getGeneralConfig: () => Promise<GeneralConfigDTO>;
  updateGeneralConfig: (data: GeneralConfigDTO) => Promise<void>;
}

export const paramService: ParamService = {
  pageParams: (data) => request<NebulaPageResp<SystemParamResp>>({ method: 'POST', url: '/api/param/page', data }),
  getParam: (id) => request<SystemParamDetailResp>({ method: 'GET', url: `/api/param/${id}` }),
  createParam: (data) => request<string>({ method: 'POST', url: '/api/param', data }),
  updateParam: (id, data) => request<string>({ method: 'PUT', url: `/api/param/${id}`, data }),
  deleteParam: (id) => request<void>({ method: 'DELETE', url: `/api/param/${id}` }),
  getValueByKey: (paramKey) => request<string>({ method: 'GET', url: `/api/param/key/${paramKey}` }),
  saveOrUpdateByKey: (paramKey, data) => request<string>({ method: 'PUT', url: `/api/param/key/${paramKey}`, data }),
  getByKey: (paramKey) => request<SystemParamDetailResp>({ method: 'GET', url: `/api/param/key/${paramKey}/detail` }),
  getIntegerValue: (paramKey) => request<number>({ method: 'GET', url: `/api/param/key/${paramKey}/integer` }),
  getBooleanValue: (paramKey) => request<boolean>({ method: 'GET', url: `/api/param/key/${paramKey}/boolean` }),
  listByModule: (moduleCode) => request<SystemParamResp[]>({ method: 'GET', url: `/api/param/module/${moduleCode}` }),
  batchUpdateValues: (data) =>
    request<BatchUpdateResultResp>({ method: 'POST', url: '/api/param/batch-update-values', data }),
  getGeneralConfig: () => request<GeneralConfigDTO>({ method: 'GET', url: '/api/general-config' }),
  updateGeneralConfig: (data) => request<void>({ method: 'PUT', url: '/api/general-config', data }),
};
