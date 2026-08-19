import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { menuService } from './menu';
import type { ButtonPageReq, CreateButtonReq, CreateMenuReq, MenuPageReq, UpdateButtonReq, UpdateMenuReq } from '@/types/menu';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('menuService', () => {
  it('createMenu calls POST /api/auth/menus', async () => {
  const data: CreateMenuReq = { code: 'system:user', name: '用户管理', type: 'MENU', status: 1 };
    mockedRequest.mockResolvedValueOnce('menu-1');

    await expect(menuService.createMenu(data)).resolves.toBe('menu-1');

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'POST', url: '/api/auth/menus', data });
  });

  it('updateMenu calls PUT /api/auth/menus/{id}', async () => {
    const data: UpdateMenuReq = { id: 'menu-1', name: '用户中心', status: 1 };
    mockedRequest.mockResolvedValueOnce('menu-1');

    await expect(menuService.updateMenu('menu-1', data)).resolves.toBe('menu-1');

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'PUT', url: '/api/auth/menus/menu-1', data });
  });

  it('removeMenu calls DELETE /api/auth/menus/{id}', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    await menuService.removeMenu('menu-1');

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'DELETE', url: '/api/auth/menus/menu-1' });
  });

  it('getMenuById calls GET /api/auth/menus/{id}', async () => {
  const detail = { id: 'menu-1', code: 'system:user', name: '用户管理', type: 'MENU', status: 1 };
    mockedRequest.mockResolvedValueOnce(detail);

    await expect(menuService.getMenuById('menu-1')).resolves.toBe(detail);

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'GET', url: '/api/auth/menus/menu-1' });
  });

  it('pageMenus calls POST /api/auth/menus/page', async () => {
    const data: MenuPageReq = { pageNum: 1, pageSize: 20, name: '用户', code: 'user', status: 1 };
    const page = { data: [], total: 0 };
    mockedRequest.mockResolvedValueOnce(page);

    await expect(menuService.pageMenus(data)).resolves.toBe(page);

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'POST', url: '/api/auth/menus/page', data });
  });

  it('getMenuTree calls GET /api/auth/menus/tree', async () => {
  const tree = [{ id: 'menu-1', code: 'system', name: '系统管理', type: 'CATALOG', status: 1, children: [] }];
    mockedRequest.mockResolvedValueOnce(tree);

    await expect(menuService.getMenuTree()).resolves.toBe(tree);

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'GET', url: '/api/auth/menus/tree' });
  });

  it('createButton calls POST /api/auth/buttons', async () => {
    const data: CreateButtonReq = { menuId: 'menu-1', code: 'user:add', name: '新增用户', type: 'add', status: 1 };
    mockedRequest.mockResolvedValueOnce('button-1');

    await expect(menuService.createButton(data)).resolves.toBe('button-1');

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'POST', url: '/api/auth/buttons', data });
  });

  it('updateButton calls PUT /api/auth/buttons/{id}', async () => {
    const data: UpdateButtonReq = { id: 'button-1', name: '新增', status: 1 };
    mockedRequest.mockResolvedValueOnce('button-1');

    await expect(menuService.updateButton('button-1', data)).resolves.toBe('button-1');

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'PUT', url: '/api/auth/buttons/button-1', data });
  });

  it('removeButton calls DELETE /api/auth/buttons/{id}', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    await menuService.removeButton('button-1');

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'DELETE', url: '/api/auth/buttons/button-1' });
  });

  it('getButtonById calls GET /api/auth/buttons/{id}', async () => {
    const detail = { id: 'button-1', menuId: 'menu-1', code: 'user:add', name: '新增用户', type: 'add', status: 1 };
    mockedRequest.mockResolvedValueOnce(detail);

    await expect(menuService.getButtonById('button-1')).resolves.toBe(detail);

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'GET', url: '/api/auth/buttons/button-1' });
  });

  it('pageButtons calls POST /api/auth/buttons/page', async () => {
    const data: ButtonPageReq = { pageNum: 1, pageSize: 10, menuId: 'menu-1', name: '新增', status: 1 };
    const page = { data: [], total: 0 };
    mockedRequest.mockResolvedValueOnce(page);

    await expect(menuService.pageButtons(data)).resolves.toBe(page);

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'POST', url: '/api/auth/buttons/page', data });
  });
});
