import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { permissionService } from './permission';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('permissionService', () => {
  it('loads permissions for a selected subject', async () => {
    mockedRequest.mockResolvedValue({ data: [], total: 0 });

    await permissionService.pageSubjectPermissions({ subjectType: 'ROLE', subjectId: 'role-admin' });

    expect(mockedRequest).toHaveBeenCalledWith({
      url: '/api/auth/permissions/page',
      method: 'POST',
      data: {
        pageNum: 1,
        pageSize: 500,
        subjectType: 'ROLE',
        subjectId: 'role-admin',
      },
    });
  });

  it('creates permissions through the documented batch endpoint', async () => {
    mockedRequest.mockResolvedValue(['permission-1']);

    await permissionService.createPermissions({
      subjectType: 'ORG',
      subjectId: 'org-rd',
      effect: 'Allow',
      scope: 'ALL',
      resources: [
        { resourceType: 'MENU', resourceId: 'menu-user' },
        { resourceType: 'BUTTON', resourceId: 'btn-user-delete' },
      ],
    });

    expect(mockedRequest).toHaveBeenCalledWith({
      url: '/api/auth/permissions/batch',
      method: 'POST',
      data: {
        subjectType: 'ORG',
        subjectId: 'org-rd',
        effect: 'Allow',
        scope: 'ALL',
        resources: [
          { resourceType: 'MENU', resourceId: 'menu-user' },
          { resourceType: 'BUTTON', resourceId: 'btn-user-delete' },
        ],
      },
    });
  });

  it('batch-updates and deletes permissions through documented endpoints', async () => {
    mockedRequest.mockResolvedValueOnce(['permission-1']).mockResolvedValueOnce(undefined);

    await permissionService.updatePermissions({
      subjectType: 'ORG',
      subjectId: 'org-rd',
      effect: 'Deny',
      scope: 'ALL',
      resources: [{ resourceType: 'MENU', resourceId: 'menu-user' }],
    });
    await permissionService.removePermissionsBySubjectAndResources({
      subjectType: 'ORG',
      subjectId: 'org-rd',
      resources: [{ resourceType: 'MENU', resourceId: 'menu-user' }],
    });

    expect(mockedRequest).toHaveBeenNthCalledWith(1, {
      url: '/api/auth/permissions/batch',
      method: 'PUT',
      data: {
        subjectType: 'ORG',
        subjectId: 'org-rd',
        effect: 'Deny',
        scope: 'ALL',
        resources: [{ resourceType: 'MENU', resourceId: 'menu-user' }],
      },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, {
      url: '/api/auth/permissions/by-subject-resource',
      method: 'DELETE',
      data: {
        subjectType: 'ORG',
        subjectId: 'org-rd',
        resources: [{ resourceType: 'MENU', resourceId: 'menu-user' }],
      },
    });
  });

  it('lists subjects by fetching orgs, roles, and users in parallel', async () => {
    const orgs = [{ id: 'org-rd', type: 'DEPARTMENT' as const, name: '研发中心', code: 'ORG_RD', status: 1 }];
    const roles = [{ id: 'role-admin', name: '超级管理员', code: 'ADMIN' }];
    const users = [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }];

    mockedRequest
      .mockResolvedValueOnce(orgs)
      .mockResolvedValueOnce(roles)
      .mockResolvedValueOnce({ data: users, total: 1 });

    const result = await permissionService.listSubjects();

    expect(result.orgs).toEqual([{ id: 'org-rd', type: 'ORG', name: '研发中心', code: 'ORG_RD', status: 1 }]);
    expect(result.roles).toEqual([{ id: 'role-admin', type: 'ROLE', name: '超级管理员', code: 'ADMIN' }]);
    expect(result.users).toEqual([{ id: 'user-1', type: 'USER', name: '云起', code: 'yunqi', status: 1 }]);

    expect(mockedRequest).toHaveBeenCalledTimes(3);
    expect(mockedRequest).toHaveBeenNthCalledWith(1, { url: '/api/auth/orgs/tree', method: 'GET' });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, { url: '/api/auth/roles/list', method: 'GET' });
    expect(mockedRequest).toHaveBeenNthCalledWith(3, {
      url: '/api/auth/users/page',
      method: 'POST',
      data: { pageNum: 1, pageSize: 500 },
    });
  });

  it('normalizes auth-management org, role, and user records into permission subject types', async () => {
    mockedRequest
      .mockResolvedValueOnce([
        {
          id: 'org-root',
          type: 'COMPANY',
          name: 'Cludix Nebula',
          code: 'CLUDIX',
          status: 1,
          children: [{ id: 'org-rd', type: 'DEPARTMENT', name: '研发中心', code: 'RND', status: 1 }],
        },
      ])
      .mockResolvedValueOnce([{ id: 'role-admin', name: '管理员', code: 'ADMIN' }])
      .mockResolvedValueOnce({ data: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }], total: 1 });

    const result = await permissionService.listSubjects();

    expect(result.orgs[0]).toMatchObject({ id: 'org-root', type: 'ORG', name: 'Cludix Nebula', code: 'CLUDIX' });
    expect(result.orgs[0].children?.[0]).toMatchObject({ id: 'org-rd', type: 'ORG', name: '研发中心', code: 'RND' });
    expect(result.roles[0]).toMatchObject({ id: 'role-admin', type: 'ROLE', name: '管理员', code: 'ADMIN' });
    expect(result.users[0]).toMatchObject({ id: 'user-1', type: 'USER', name: '云起', code: 'yunqi' });
  });

  it('lists menu tree records from the menu tree endpoint', async () => {
    const menus = [{ id: 'menu-auth', name: '系统权限', code: 'AUTH', type: 'MENU', status: 1 }];

    mockedRequest.mockResolvedValue(menus);

    const result = await permissionService.listMenuTree();

    expect(result).toEqual(menus);
    expect(mockedRequest).toHaveBeenCalledWith({ url: '/api/auth/menus/tree', method: 'GET' });
  });
});
