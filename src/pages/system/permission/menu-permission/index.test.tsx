import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { PermissionService } from '@/api/permission';
import { useLocaleStore } from '@/stores/locale-store';
import { clearAuthForTest, echoAuthAdapter, signInAsAdminForTest } from '@/test/auth-test-helpers';
import type { MenuTreeResp } from '@/types/menu';
import { MenuPermissionPage } from './index';

function createPermissionService(overrides: Partial<PermissionService> = {}): PermissionService {
  return {
    listSubjects: overrides.listSubjects ?? vi.fn().mockResolvedValue({
      orgs: [{ id: 'org-1', type: 'ORG', name: '研发中心', code: 'RND' }],
      roles: [],
      users: [],
    }),
    listMenuTree: overrides.listMenuTree ?? vi.fn().mockResolvedValue([]),
    pageButtons: overrides.pageButtons ?? vi.fn().mockResolvedValue({ data: [], total: 0 }),
    pageSubjectPermissions: overrides.pageSubjectPermissions ?? vi.fn().mockResolvedValue({ data: [], total: 0 }),
    createPermissions: overrides.createPermissions ?? vi.fn().mockResolvedValue([]),
    createPermissionItems: overrides.createPermissionItems ?? vi.fn().mockResolvedValue([]),
    updatePermissions: overrides.updatePermissions ?? vi.fn().mockResolvedValue([]),
    updatePermission: overrides.updatePermission ?? vi.fn().mockResolvedValue('permission-id'),
    removePermissionsBySubjectAndResources: overrides.removePermissionsBySubjectAndResources ?? vi.fn().mockResolvedValue(undefined),
  };
}

function renderMenuPermissionPage(service: PermissionService) {
  signInAsAdminForTest();
  return render(
    <NebulaProvider authAdapter={echoAuthAdapter}>
      <MenuPermissionPage service={service} />
    </NebulaProvider>,
  );
}

const nestedMenuTree: MenuTreeResp[] = [
  {
    id: 'menu-system',
    type: 'MENU',
    name: '系统设置',
    code: 'SYSTEM_SETTINGS',
    path: '/system',
    status: 1,
    children: [
      {
        id: 'menu-user',
        type: 'MENU',
        name: '用户管理',
        code: 'USER_MANAGEMENT',
        path: '/system/users',
        status: 1,
        children: [
          {
            id: 'menu-user-list',
            type: 'MENU',
            name: '用户列表',
            code: 'USER_LIST',
            path: '/system/users/list',
            status: 1,
          },
        ],
      },
    ],
  },
];

describe('MenuPermissionPage', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
  });

  afterEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
    clearAuthForTest();
  });

  it('renders every nested menu and selects every menu in the hierarchy', async () => {
    const user = userEvent.setup();
    const createPermissions = vi.fn().mockResolvedValue(['permission-1']);
    const service = createPermissionService({
      listMenuTree: vi.fn().mockResolvedValue(nestedMenuTree),
      createPermissions,
    });

    renderMenuPermissionPage(service);

    expect(await screen.findByText('用户列表')).toBeInTheDocument();
    expect(screen.getByText('系统设置')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '全部授权' }));
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(createPermissions).toHaveBeenCalledWith(expect.objectContaining({
        subjectId: 'org-1',
        effect: 'Allow',
        resources: expect.arrayContaining([
          expect.objectContaining({ resourceId: 'menu-system' }),
          expect.objectContaining({ resourceId: 'menu-user' }),
          expect.objectContaining({ resourceId: 'menu-user-list' }),
        ]),
      }));
    });
  });

  it('keeps menu ancestors visible when searching for a descendant', async () => {
    const user = userEvent.setup();
    const service = createPermissionService({
      listMenuTree: vi.fn().mockResolvedValue(nestedMenuTree),
    });

    renderMenuPermissionPage(service);

    const searchInput = await screen.findByPlaceholderText('搜索菜单');
    await user.type(searchInput, '用户列表');

    expect(screen.getByText('用户列表')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('系统设置')).toBeInTheDocument();
    expect(screen.getByText('菜单资源')).toBeInTheDocument();
  });

  it('cycles menu permissions through Allow, Deny, and unset states', async () => {
    const user = userEvent.setup();
    const createPermissions = vi.fn().mockResolvedValue(['permission-new']);
    const removePermissionsBySubjectAndResources = vi.fn().mockResolvedValue(undefined);
    const service = createPermissionService({
      listMenuTree: vi.fn().mockResolvedValue(nestedMenuTree),
      pageSubjectPermissions: vi.fn().mockResolvedValue({
        data: [
          { id: 'grant-allow', subjectType: 'ORG', subjectId: 'org-1', resourceType: 'MENU', resourceId: 'menu-system', effect: 'Allow' },
          { id: 'grant-deny', subjectType: 'ORG', subjectId: 'org-1', resourceType: 'MENU', resourceId: 'menu-user', effect: 'Deny' },
        ],
        total: 2,
      }),
      createPermissions,
      removePermissionsBySubjectAndResources,
    });

    renderMenuPermissionPage(service);

    const allowedMenu = await screen.findByRole('checkbox', { name: /系统设置.*授权权限/ });
    const deniedMenu = screen.getByRole('checkbox', { name: /用户管理.*拒绝权限/ });
    const unsetMenu = screen.getByRole('checkbox', { name: /用户列表.*未设置权限/ });

    expect(allowedMenu).toHaveAttribute('data-permission-effect', 'Allow');
    expect(deniedMenu).toHaveAttribute('data-permission-effect', 'Deny');
    expect(unsetMenu).toHaveAttribute('data-permission-effect', 'none');
    expect(screen.getByText('授权权限')).toBeInTheDocument();
    expect(screen.getByText('拒绝权限')).toBeInTheDocument();
    expect(screen.getByText('未设置权限')).toBeInTheDocument();

    await user.click(deniedMenu);
    await user.click(unsetMenu);
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(createPermissions).toHaveBeenCalledWith(expect.objectContaining({
        effect: 'Allow',
        resources: [expect.objectContaining({ resourceId: 'menu-user-list' })],
      }));
      expect(removePermissionsBySubjectAndResources).toHaveBeenCalledWith(expect.objectContaining({
        subjectId: 'org-1',
        resources: [expect.objectContaining({ resourceId: 'menu-user' })],
      }));
    });
  });

  it('renders bulk actions and cascades parent changes only when child association is enabled', async () => {
    const user = userEvent.setup();
    const service = createPermissionService({
      listMenuTree: vi.fn().mockResolvedValue(nestedMenuTree),
    });

    renderMenuPermissionPage(service);

    const parentMenu = await screen.findByRole('checkbox', { name: /系统设置.*未设置权限/ });
    const childMenu = screen.getByRole('checkbox', { name: /用户管理.*未设置权限/ });

    expect(screen.getByRole('button', { name: '全部授权' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全部拒绝' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '全部取消' })).toBeInTheDocument();

    await user.click(parentMenu);

    expect(await screen.findByRole('checkbox', { name: /系统设置.*授权权限/ })).toHaveAttribute('data-permission-effect', 'Allow');
    expect(childMenu).toHaveAttribute('data-permission-effect', 'none');

    await user.click(screen.getByRole('switch', { name: '关联子级' }));
    await user.click(screen.getByRole('checkbox', { name: /系统设置.*授权权限/ }));

    expect(await screen.findByRole('checkbox', { name: /系统设置.*拒绝权限/ })).toHaveAttribute('data-permission-effect', 'Deny');
    expect(screen.getByRole('checkbox', { name: /用户管理.*拒绝权限/ })).toHaveAttribute('data-permission-effect', 'Deny');
    expect(screen.getByRole('checkbox', { name: /用户列表.*拒绝权限/ })).toHaveAttribute('data-permission-effect', 'Deny');
  });
});
