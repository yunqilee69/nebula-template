import { request } from '@/request/request';
import type {
  ButtonDetailResp,
  ButtonPageReq,
  ButtonResp,
  CreateButtonReq,
  CreateMenuReq,
  MenuDetailResp,
  MenuPageReq,
  MenuPageResp,
  MenuResp,
  MenuTreeResp,
  UpdateButtonReq,
  UpdateMenuReq,
} from '@/types/menu';

export interface MenuService {
  createMenu: (data: CreateMenuReq) => Promise<string>;
  updateMenu: (id: string, data: UpdateMenuReq) => Promise<string>;
  removeMenu: (id: string) => Promise<void>;
  getMenuById: (id: string) => Promise<MenuDetailResp>;
  pageMenus: (data: MenuPageReq) => Promise<MenuPageResp<MenuResp>>;
  getMenuTree: () => Promise<MenuTreeResp[]>;
  createButton: (data: CreateButtonReq) => Promise<string>;
  updateButton: (id: string, data: UpdateButtonReq) => Promise<string>;
  removeButton: (id: string) => Promise<void>;
  getButtonById: (id: string) => Promise<ButtonDetailResp>;
  pageButtons: (data: ButtonPageReq) => Promise<MenuPageResp<ButtonResp>>;
}

export const menuService: MenuService = {
  createMenu: (data) => request<string>({ method: 'POST', url: '/api/auth/menus', data }),
  updateMenu: (id, data) => request<string>({ method: 'PUT', url: `/api/auth/menus/${id}`, data }),
  removeMenu: (id) => request<void>({ method: 'DELETE', url: `/api/auth/menus/${id}` }),
  getMenuById: (id) => request<MenuDetailResp>({ method: 'GET', url: `/api/auth/menus/${id}` }),
  pageMenus: (data) => request<MenuPageResp<MenuResp>>({ method: 'POST', url: '/api/auth/menus/page', data }),
  getMenuTree: () => request<MenuTreeResp[]>({ method: 'GET', url: '/api/auth/menus/tree' }),
  createButton: (data) => request<string>({ method: 'POST', url: '/api/auth/buttons', data }),
  updateButton: (id, data) => request<string>({ method: 'PUT', url: `/api/auth/buttons/${id}`, data }),
  removeButton: (id) => request<void>({ method: 'DELETE', url: `/api/auth/buttons/${id}` }),
  getButtonById: (id) => request<ButtonDetailResp>({ method: 'GET', url: `/api/auth/buttons/${id}` }),
  pageButtons: (data) => request<MenuPageResp<ButtonResp>>({ method: 'POST', url: '/api/auth/buttons/page', data }),
};
