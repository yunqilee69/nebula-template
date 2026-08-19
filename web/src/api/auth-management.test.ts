import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { authManagementService } from './auth-management';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authManagementService', () => {
  it('pages users through the auth user endpoint', async () => {
    mockedRequest.mockResolvedValueOnce({ data: [], total: 0 });

    await authManagementService.pageUsers({ pageNum: 1, pageSize: 10, username: 'yunqi', status: 1 });

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/users/page',
      data: { pageNum: 1, pageSize: 10, username: 'yunqi', status: 1 },
    });
  });

  it('creates and updates users through the auth user endpoints', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);
    mockedRequest.mockResolvedValueOnce(undefined);

    await authManagementService.createUser({ username: 'yunqi', password: 'secret123', roleIds: ['role-1'], orgIds: ['org-1'] });
    await authManagementService.updateUser({ id: 'user-1', nickname: '云起', status: 1 });

    expect(mockedRequest).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      url: '/api/auth/users',
      data: { username: 'yunqi', password: 'secret123', roleIds: ['role-1'], orgIds: ['org-1'] },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, {
      method: 'PUT',
      url: '/api/auth/users/user-1',
      data: { id: 'user-1', nickname: '云起', status: 1 },
    });
  });

  it('deletes a user and fetches user detail', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);
    mockedRequest.mockResolvedValueOnce({ id: 'user-1', username: 'yunqi', status: 1 });

    await authManagementService.deleteUser('user-1');
    await authManagementService.getUserDetail('user-1');

    expect(mockedRequest).toHaveBeenNthCalledWith(1, {
      method: 'DELETE',
      url: '/api/auth/users/user-1',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      url: '/api/auth/users/user-1',
    });
  });

  it('resets and changes user password through the auth user endpoints', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);
    mockedRequest.mockResolvedValueOnce(undefined);

    await authManagementService.resetUserPassword('user-1');
    await authManagementService.changeUserPassword('user-1', { oldPassword: 'old-secret', newPassword: 'new-secret' });

    expect(mockedRequest).toHaveBeenNthCalledWith(1, {
      method: 'PUT',
      url: '/api/auth/users/user-1/reset-password',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, {
      method: 'PUT',
      url: '/api/auth/users/user-1/password',
      data: { oldPassword: 'old-secret', newPassword: 'new-secret' },
    });
  });

  it('lists roles and orgs for user form dropdowns', async () => {
    mockedRequest.mockResolvedValueOnce([{ id: 'role-1', name: 'Admin', code: 'ADMIN' }]);
    mockedRequest.mockResolvedValueOnce([{ id: 'org-1', name: 'Engineering', code: 'ENG' }]);

    await authManagementService.listRoles();
    await authManagementService.listOrgs();

    expect(mockedRequest).toHaveBeenNthCalledWith(1, { method: 'GET', url: '/api/auth/roles/list' });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, { method: 'GET', url: '/api/auth/orgs/list' });
  });

  it('loads organization tree and pages organizations', async () => {
    mockedRequest.mockResolvedValueOnce([]);
    mockedRequest.mockResolvedValueOnce({ data: [], total: 0 });

    await authManagementService.getOrgTree();
    await authManagementService.pageOrgs({ pageNum: 1, pageSize: 20, parentId: 'org-1' });

    expect(mockedRequest).toHaveBeenNthCalledWith(1, { method: 'GET', url: '/api/auth/orgs/tree' });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, {
      method: 'POST',
      url: '/api/auth/orgs/page',
      data: { pageNum: 1, pageSize: 20, parentId: 'org-1' },
    });
  });

  it('creates and updates organizations through the auth org endpoints', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);
    mockedRequest.mockResolvedValueOnce(undefined);

    await authManagementService.createOrg({ name: '研发中心', code: 'RND', type: 'DEPARTMENT', parentId: 'root' });
    await authManagementService.updateOrg({ id: 'org-1', name: '平台工程组', status: 1 });

    expect(mockedRequest).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      url: '/api/auth/orgs',
      data: { name: '研发中心', code: 'RND', type: 'DEPARTMENT', parentId: 'root' },
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, {
      method: 'PUT',
      url: '/api/auth/orgs/org-1',
      data: { id: 'org-1', name: '平台工程组', status: 1 },
    });
  });

  it('deletes an org and fetches org detail', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);
    mockedRequest.mockResolvedValueOnce({ id: 'org-1', name: 'RND', code: 'RND', type: 'DEPARTMENT', status: 1 });

    await authManagementService.deleteOrg('org-1');
    await authManagementService.getOrgDetail('org-1');

    expect(mockedRequest).toHaveBeenNthCalledWith(1, {
      method: 'DELETE',
      url: '/api/auth/orgs/org-1',
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      url: '/api/auth/orgs/org-1',
    });
  });
});
