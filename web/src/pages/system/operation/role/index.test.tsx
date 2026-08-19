import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { AuthManagementService } from '@/api/auth-management';
import { useLocaleStore } from '@/stores/locale-store';
import { clearAuthForTest, echoAuthAdapter, signInAsAdminForTest } from '@/test/auth-test-helpers';
import type { RoleService } from '@/api/role';
import type { PageResp as AuthPageResp, UserResp } from '@/types/auth-management';
import { RoleManagementPage } from './index';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createRoleService(overrides: Partial<RoleService> = {}): RoleService {
  return {
    createRole: overrides.createRole ?? vi.fn(),
    updateRole: overrides.updateRole ?? vi.fn(),
    removeRole: overrides.removeRole ?? vi.fn(),
    getRoleById: overrides.getRoleById ?? vi.fn(),
    pageRoles: overrides.pageRoles ?? vi.fn(),
    listAllRoles: overrides.listAllRoles ?? vi.fn(),
  };
}

function createAuthService(overrides: Partial<AuthManagementService> = {}): AuthManagementService {
  return {
    pageUsers: vi.fn().mockResolvedValue({ data: [], total: 0 } satisfies AuthPageResp<UserResp>),
    createUser: vi.fn().mockResolvedValue(undefined),
    updateUser: vi.fn().mockResolvedValue(undefined),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    getUserDetail: vi.fn().mockResolvedValue({ id: 'user-1', username: 'yunqi', status: 1 }),
    resetUserPassword: vi.fn().mockResolvedValue(undefined),
    changeUserPassword: vi.fn().mockResolvedValue(undefined),
    batchUpdateUserAssignments: vi.fn().mockResolvedValue(undefined),
    listRoles: vi.fn().mockResolvedValue([{ id: 'role-1', name: '管理员', code: 'ADMIN', status: 1 }]),
    listOrgs: vi.fn().mockResolvedValue([{ id: 'org-1', name: '研发中心', code: 'RND' }]),
    pageOrgs: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getOrgTree: vi.fn().mockResolvedValue([]),
    createOrg: vi.fn().mockResolvedValue(undefined),
    updateOrg: vi.fn().mockResolvedValue(undefined),
    deleteOrg: vi.fn().mockResolvedValue(undefined),
    getOrgDetail: vi.fn().mockResolvedValue({ id: 'org-1', name: '研发中心', code: 'RND', type: 'DEPARTMENT', status: 1 }),
    ...overrides,
  };
}

function renderRoleManagementPage(roleService: RoleService, authService = createAuthService()) {
  signInAsAdminForTest();
  return render(
    <NebulaProvider authAdapter={echoAuthAdapter}>
      <RoleManagementPage roleService={roleService} authService={authService} />
    </NebulaProvider>,
  );
}

function getButtonContainingText(container: HTMLElement, text: string) {
  const button = within(container).getAllByRole('button').find((item) => item.textContent?.includes(text));
  if (!button) {
    throw new Error(`Expected button containing ${text}`);
  }
  return button;
}

describe('RoleManagementPage', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
  });

  afterEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
    clearAuthForTest();
  });

  it('loads roles into the workspace tree and starts from the global role-users scope', async () => {
    const roleService = createRoleService();
    const authService = createAuthService({
      pageUsers: vi.fn().mockResolvedValue({
        data: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }],
        total: 1,
      } satisfies AuthPageResp<UserResp>),
    });

    renderRoleManagementPage(roleService, authService);

    expect(await screen.findByRole('treeitem', { name: /全部角色用户\s*1\s*个角色/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /管理员\s*启用/ })).toBeInTheDocument();
    expect(await screen.findByText('yunqi')).toBeInTheDocument();
    expect(screen.getAllByText('启用').length).toBeGreaterThan(0);
    expect(authService.listRoles).toHaveBeenCalledTimes(1);
    expect(authService.pageUsers).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10, withRole: true });
  });

  it('filters role tree records with one keyword input matching role name or code', async () => {
    const user = userEvent.setup();
    const roleService = createRoleService();
    const authService = createAuthService({
      listRoles: vi.fn().mockResolvedValue([
        { id: 'role-1', name: '管理员', code: 'ADMIN', status: 1 },
        { id: 'role-2', name: '审计员', code: 'AUDITOR', status: 0 },
      ]),
    });

    renderRoleManagementPage(roleService, authService);

    expect(await screen.findByRole('treeitem', { name: /管理员\s*启用/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /审计员\s*禁用/ })).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('搜索角色');
    expect(screen.queryByLabelText('角色名称')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('角色编码')).not.toBeInTheDocument();

    await user.type(searchInput, 'AUD');

    expect(screen.queryByRole('treeitem', { name: /管理员\s*启用/ })).not.toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /审计员\s*禁用/ })).toBeInTheDocument();
  });

  it('renders create role in the role tree title action area instead of the selected scope tag', async () => {
    const user = userEvent.setup();
    const roleService = createRoleService();
    const authService = createAuthService();

    renderRoleManagementPage(roleService, authService);

    const treeTitle = await screen.findByText('角色树');
    const treeHeader = treeTitle.closest('div');
    if (!(treeHeader instanceof HTMLElement)) {
      throw new Error('Expected role tree header');
    }
    expect(within(treeHeader).getByRole('button', { name: /新增角色/ })).toBeInTheDocument();

    await user.click(await screen.findByRole('treeitem', { name: /管理员\s*启用/ }));

    expect(screen.queryAllByText('管理员')).toHaveLength(1);
  });

  it('shows role edit and delete buttons only after opening the node action group', async () => {
    const user = userEvent.setup();
    const roleService = createRoleService();
    const authService = createAuthService();

    renderRoleManagementPage(roleService, authService);

    expect(screen.queryByRole('group', { name: '管理员 更多操作' })).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '管理员 更多操作' }));

    const actionGroup = screen.getByRole('group', { name: '管理员 更多操作' });
    expect(within(actionGroup).getByRole('button', { name: '编辑' })).toBeInTheDocument();
    expect(within(actionGroup).getByRole('button', { name: '删除' })).toBeInTheDocument();
  });

  it('renders the role form without permission ids and uses a status switch', async () => {
    const user = userEvent.setup();
    const roleService = createRoleService();
    const authService = createAuthService();

    renderRoleManagementPage(roleService, authService);

    await user.click(await screen.findByRole('button', { name: /新增角色/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('新增角色')).toBeInTheDocument();
    expect(within(dialog).queryByText('权限 ID')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('switch')).toBeChecked();
  });

  it('renders page labels from the active English locale', async () => {
    useLocaleStore.getState().setLocale('en-US');
    const roleService = createRoleService();
    const authService = createAuthService({
      listRoles: vi.fn().mockResolvedValue([{ id: 'role-1', name: 'Operator', code: 'OPS', status: 1 }]),
    });

    renderRoleManagementPage(roleService, authService);

    expect(screen.getByPlaceholderText('Search roles')).toBeInTheDocument();
    expect(screen.queryByLabelText('Role Name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Role Code')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New\s*Role/ })).toBeInTheDocument();
    expect(await screen.findByRole('treeitem', { name: /All Role Users\s*1\s*roles/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /Operator\s*Enabled/ })).toBeInTheDocument();
  });

  it('loads users without roles from the unassigned tree node', async () => {
    const user = userEvent.setup();
    const roleService = createRoleService();
    const authService = createAuthService({
      pageUsers: vi.fn(async (params) => {
        if (params.withoutRole) {
          return {
            data: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }],
            total: 1,
          } satisfies AuthPageResp<UserResp>;
        }
        return { data: [], total: 0 } satisfies AuthPageResp<UserResp>;
      }),
    });

    renderRoleManagementPage(roleService, authService);

    await user.click(await screen.findByRole('treeitem', { name: '未分配角色用户' }));

    expect(await screen.findByText('yunqi')).toBeInTheDocument();
    expect(authService.pageUsers).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10, withoutRole: true });
  });

  it('requires selecting a role before appending roles to unassigned users', async () => {
    const user = userEvent.setup();
    const roleService = createRoleService();
    const authService = createAuthService({
      pageUsers: vi.fn(async (params) => {
        if (params.withoutRole) {
          return {
            data: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }],
            total: 1,
          } satisfies AuthPageResp<UserResp>;
        }
        return { data: [], total: 0 } satisfies AuthPageResp<UserResp>;
      }),
    });

    renderRoleManagementPage(roleService, authService);

    await user.click(await screen.findByRole('treeitem', { name: '未分配角色用户' }));
    const userRow = (await screen.findByText('yunqi')).closest('tr');
    if (!userRow) {
      throw new Error('Expected unassigned role user row');
    }

    await user.click(within(userRow).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /追加角色/ }));

    const dialogTitle = await screen.findByText('批量设置用户归属');
    const dialog = dialogTitle.closest('.ant-modal');
    if (!(dialog instanceof HTMLElement)) {
      throw new Error('Expected assignment modal');
    }
    await user.click(getButtonContainingText(dialog, '追加归属'));

    expect(await within(dialog).findByText('请选择要追加的角色')).toBeInTheDocument();
    expect(authService.batchUpdateUserAssignments).not.toHaveBeenCalled();
  });

  it('loads role-scoped users when a role tree node is selected', async () => {
    const user = userEvent.setup();
    const roleService = createRoleService();
    const authService = createAuthService({
      pageUsers: vi.fn(async (params) => {
        if (params.roleId === 'role-1') {
          return {
            data: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }],
            total: 1,
          } satisfies AuthPageResp<UserResp>;
        }
        return { data: [], total: 0 } satisfies AuthPageResp<UserResp>;
      }),
    });

    renderRoleManagementPage(roleService, authService);

    await user.click(await screen.findByRole('treeitem', { name: /管理员\s*启用/ }));

    expect(await screen.findByText('yunqi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /添加用户/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /移除用户/ })).toBeInTheDocument();
    expect(authService.pageUsers).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10, roleId: 'role-1' });
  });

  it('binds selected users to the selected role from the add users modal', async () => {
    const user = userEvent.setup();
    const roleService = createRoleService();
    const authService = createAuthService({
      pageUsers: vi.fn().mockResolvedValue({
        data: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }],
        total: 1,
      } satisfies AuthPageResp<UserResp>),
    });

    renderRoleManagementPage(roleService, authService);

    await user.click(await screen.findByRole('treeitem', { name: /管理员\s*启用/ }));
    await waitFor(() => {
      expect(authService.pageUsers).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10, roleId: 'role-1' });
    });
    await user.click(await screen.findByRole('button', { name: /添加用户/ }));

    const dialogTitle = await screen.findByText('添加用户到角色');
    const dialog = dialogTitle.closest('.ant-modal');
    if (!(dialog instanceof HTMLElement)) {
      throw new Error('Expected role binding modal');
    }
    expect(within(dialog).getByText('yunqi')).toBeInTheDocument();
    const userRow = within(dialog).getByText('yunqi').closest('tr');
    if (!userRow) {
      throw new Error('Expected user row in role binding modal');
    }

    await user.click(within(userRow).getByRole('checkbox'));
    await user.click(getButtonContainingText(dialog, '确认'));

    await waitFor(() => {
      expect(authService.batchUpdateUserAssignments).toHaveBeenCalledWith({
        userIds: ['user-1'],
        roleIds: ['role-1'],
        orgIds: null,
        operation: 'ADD',
      });
    });
  });

  it('unbinds selected users from the selected role', async () => {
    const user = userEvent.setup();
    const roleService = createRoleService();
    const authService = createAuthService({
      pageUsers: vi.fn().mockResolvedValue({
        data: [{ id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 }],
        total: 1,
      } satisfies AuthPageResp<UserResp>),
    });

    renderRoleManagementPage(roleService, authService);

    await user.click(await screen.findByRole('treeitem', { name: /管理员\s*启用/ }));
    const userRow = (await screen.findByText('yunqi')).closest('tr');
    if (!userRow) {
      throw new Error('Expected selected role user row');
    }

    await user.click(within(userRow).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /移除用户/ }));
    const removeButtons = await screen.findAllByRole('button', { name: /移除用户/ });
    const confirmButton = removeButtons[removeButtons.length - 1];
    if (!confirmButton) {
      throw new Error('Expected remove confirmation button');
    }
    await user.click(confirmButton);

    await waitFor(() => {
      expect(authService.batchUpdateUserAssignments).toHaveBeenCalledWith({
        userIds: ['user-1'],
        roleIds: ['role-1'],
        orgIds: null,
        operation: 'REMOVE',
      });
    });
  });

  it('uses the default role service when roleService is not provided', async () => {
    const authService = createAuthService();

    signInAsAdminForTest();
    render(
      <NebulaProvider authAdapter={echoAuthAdapter}>
        <RoleManagementPage authService={authService} />
      </NebulaProvider>,
    );

    expect(await screen.findByRole('treeitem', { name: /管理员\s*启用/ })).toBeInTheDocument();
    expect(authService.listRoles).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('未配置角色服务')).not.toBeInTheDocument();
  });
});
