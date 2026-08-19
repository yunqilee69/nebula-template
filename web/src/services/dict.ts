import { request } from '@/request/request';
import type { PageResp } from '@/types/auth-management';
import type {
  CreateDictItemReq,
  CreateDictTypeReq,
  DictItemDetailResp,
  DictItemPageReq,
  DictItemTreeResp,
  DictTypeDetailResp,
  DictTypePageReq,
  UpdateDictItemReq,
  UpdateDictTypeReq,
} from '@/types/dict';

export interface DictService {
  pageTypes: (data: DictTypePageReq) => Promise<PageResp<DictTypeDetailResp>>;
  getType: (id: string) => Promise<DictTypeDetailResp>;
  createType: (data: CreateDictTypeReq) => Promise<void>;
  updateType: (id: string, data: UpdateDictTypeReq) => Promise<void>;
  deleteType: (id: string) => Promise<void>;
  pageItems: (data: DictItemPageReq) => Promise<PageResp<DictItemDetailResp>>;
  getItem: (id: string) => Promise<DictItemDetailResp>;
  createItem: (data: CreateDictItemReq) => Promise<void>;
  updateItem: (id: string, data: UpdateDictItemReq) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  listItemsByCode: (dictCode: string) => Promise<DictItemTreeResp[]>;
}

export const dictService: DictService = {
  pageTypes: (data) => request<PageResp<DictTypeDetailResp>>({ method: 'POST', url: '/api/dict/types/page', data }),
  getType: (id) => request<DictTypeDetailResp>({ method: 'GET', url: `/api/dict/types/${id}` }),
  createType: (data) => request<void>({ method: 'POST', url: '/api/dict/types', data }),
  updateType: (id, data) => request<void>({ method: 'PUT', url: `/api/dict/types/${id}`, data }),
  deleteType: (id) => request<void>({ method: 'DELETE', url: `/api/dict/types/${id}` }),
  pageItems: (data) => request<PageResp<DictItemDetailResp>>({ method: 'POST', url: '/api/dict/items/page', data }),
  getItem: (id) => request<DictItemDetailResp>({ method: 'GET', url: `/api/dict/items/${id}` }),
  createItem: (data) => request<void>({ method: 'POST', url: '/api/dict/items', data }),
  updateItem: (id, data) => request<void>({ method: 'PUT', url: `/api/dict/items/${id}`, data }),
  deleteItem: (id) => request<void>({ method: 'DELETE', url: `/api/dict/items/${id}` }),
  listItemsByCode: (dictCode) => request<DictItemTreeResp[]>({ method: 'GET', url: `/api/dict/items/dict/${dictCode}` }),
};
