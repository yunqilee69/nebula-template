import type { PageReq } from './auth-management';

export interface DictTypeDetailResp {
  id: string;
  code: string;
  name: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface DictItemDetailResp {
  id: string;
  dictCode: string;
  name: string;
  parentId?: string;
  path?: string;
  itemValue: string;
  sort: number;
  enabled: boolean;
  tagColor?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface DictItemTreeResp {
  id: string;
  dictCode: string;
  name: string;
  parentId?: string;
  itemValue: string;
  sort: number;
  enabled: boolean;
  tagColor?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
  children?: DictItemTreeResp[];
}

export interface DictTypePageReq extends PageReq {
  code?: string;
  name?: string;
}

export interface DictItemPageReq extends PageReq {
  dictCode?: string;
  name?: string;
  enabled?: boolean;
}

export interface CreateDictTypeReq {
  code: string;
  name: string;
  remark?: string;
}

export interface UpdateDictTypeReq {
  name: string;
  remark?: string;
}

export interface CreateDictItemReq {
  dictCode: string;
  name: string;
  parentId?: string;
  itemValue: string;
  sort?: number;
  enabled?: boolean;
  tagColor?: string;
  remark?: string;
}

export interface UpdateDictItemReq {
  name: string;
  itemValue: string;
  sort?: number;
  enabled?: boolean;
  tagColor?: string;
  remark?: string;
}
