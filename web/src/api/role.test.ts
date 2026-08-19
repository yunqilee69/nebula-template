import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { roleService } from './role';
import type { CreateRoleReq, RoleDetailResp, RolePageReq, RoleResp, UpdateRoleReq } from '@/types/role';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('roleService', () => {
  it('createRole calls POST /api/auth/roles and returns the created role id', async () => {
    mockedRequest.mockResolvedValueOnce('role-1');

    const data: CreateRoleReq = {
      name: '管理员',
      code: 'ADMIN',
      description: '系统管理员角色',
      status: 1,
      permissionIds: ['permission-1'],
    };
    const result = await roleService.createRole(data);

    expect(result).toBe('role-1');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/roles',
      data,
    });
  });

  it('updateRole calls PUT /api/auth/roles/{id} with the id in the body contract', async () => {
    mockedRequest.mockResolvedValueOnce('role-1');

    const data: UpdateRoleReq = {
      id: 'role-1',
      name: '运维管理员',
      code: 'OPS_ADMIN',
      status: 1,
      permissionIds: ['permission-2'],
    };
    const result = await roleService.updateRole('role-1', data);

    expect(result).toBe('role-1');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'PUT',
      url: '/api/auth/roles/role-1',
      data,
    });
  });

  it('removeRole calls DELETE /api/auth/roles/{id}', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    await roleService.removeRole('role-1');

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'DELETE',
      url: '/api/auth/roles/role-1',
    });
  });

  it('getRoleById calls GET /api/auth/roles/{id}', async () => {
    const detail: RoleDetailResp = {
      id: 'role-1',
      name: '管理员',
      code: 'ADMIN',
      description: '系统管理员角色',
      status: 1,
      permissions: [{ id: 'permission-1', name: '用户查看', code: 'user:read' }],
    };
    mockedRequest.mockResolvedValueOnce(detail);

    const result = await roleService.getRoleById('role-1');

    expect(result).toBe(detail);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/auth/roles/role-1',
    });
  });

  it('pageRoles calls POST /api/auth/roles/page with pageNum and pageSize', async () => {
    const page = { data: [{ id: 'role-1', name: '管理员', code: 'ADMIN', status: 1 } satisfies RoleResp], total: 1 };
    mockedRequest.mockResolvedValueOnce(page);

    const data: RolePageReq = {
      pageNum: 1,
      pageSize: 20,
      name: '管理员',
      code: 'ADMIN',
      status: 1,
      orderName: 'createTime',
      orderType: 'desc',
    };
    const result = await roleService.pageRoles(data);

    expect(result).toBe(page);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/roles/page',
      data,
    });
  });

  it('listAllRoles calls GET /api/auth/roles/list', async () => {
    const roles: RoleDetailResp[] = [
      { id: 'role-1', name: '管理员', code: 'ADMIN', description: '系统管理员角色', status: 1, permissions: [] },
    ];
    mockedRequest.mockResolvedValueOnce(roles);

    const result = await roleService.listAllRoles();

    expect(result).toBe(roles);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/auth/roles/list',
    });
  });
});
