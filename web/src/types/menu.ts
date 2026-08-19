export interface MenuPageResp<T> {
  data: T[];
  total: number;
}

export interface MenuBasePageReq {
  pageNum: number;
  pageSize: number;
  orderName?: string;
  orderType?: 'asc' | 'desc';
}

export type MenuStatus = 0 | 1;
export type MenuType = 'CATALOG' | 'MENU' | 'IFRAME' | 'EXTERNAL' | string;
export type ButtonStatus = 0 | 1;
export type ButtonType = 'add' | 'edit' | 'delete' | 'export' | string;

export interface MenuPageReq extends MenuBasePageReq {
  name?: string;
  code?: string;
  status?: MenuStatus;
}

export interface MenuResp {
  id: string;
  parentId?: string;
  code: string;
  name: string;
  path?: string;
  icon?: string;
  type: MenuType;
  sort?: number;
  status: MenuStatus;
  createTime?: string;
  updateTime?: string;
}

export interface MenuDetailResp extends MenuResp {
  component?: string;
  hidden?: boolean;
  externalFlag?: boolean;
  externalUrl?: string;
  visibleInBreadcrumb?: boolean;
  visibleInTab?: boolean;
  activeMenuPath?: string;
  remark?: string;
}

export interface MenuTreeResp extends MenuDetailResp {
  children?: MenuTreeResp[];
}

export interface CreateMenuReq {
  parentId?: string;
  code: string;
  name: string;
  path?: string;
  icon?: string;
  component?: string;
  type: MenuType;
  sort?: number;
  status?: MenuStatus;
  hidden?: boolean;
  externalFlag?: boolean;
  externalUrl?: string;
  visibleInBreadcrumb?: boolean;
  visibleInTab?: boolean;
  activeMenuPath?: string;
  remark?: string;
}

export interface UpdateMenuReq {
  id: string;
  parentId?: string;
  code?: string;
  name?: string;
  path?: string;
  icon?: string;
  component?: string;
  type?: MenuType;
  sort?: number;
  status?: MenuStatus;
  hidden?: boolean;
  externalFlag?: boolean;
  externalUrl?: string;
  visibleInBreadcrumb?: boolean;
  visibleInTab?: boolean;
  activeMenuPath?: string;
  remark?: string;
}

export interface ButtonPageReq extends MenuBasePageReq {
  menuId?: string;
  name?: string;
  code?: string;
  status?: ButtonStatus;
}

export interface ButtonResp {
  id: string;
  name: string;
  code: string;
  status: ButtonStatus;
  createTime?: string;
  updateTime?: string;
}

export interface ButtonDetailResp extends ButtonResp {
  menuId: string;
  type?: ButtonType;
  sort?: number;
}

export interface CreateButtonReq {
  menuId: string;
  code: string;
  name: string;
  type?: ButtonType;
  sort?: number;
  status?: ButtonStatus;
}

export interface UpdateButtonReq {
  id: string;
  menuId?: string;
  code?: string;
  name?: string;
  type?: ButtonType;
  sort?: number;
  status?: ButtonStatus;
}
