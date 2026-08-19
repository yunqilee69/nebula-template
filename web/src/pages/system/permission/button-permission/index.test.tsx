import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PermissionService } from '@/api/permission';
import { clearAuthForTest, signInAsAdminForTest } from '@/test/auth-test-helpers';
import type { ButtonResp, MenuPageResp } from '@/types/menu';
import { ButtonPermissionPage } from './index';

vi.mock('@/hooks/use-nebula-i18n', () => ({
  useNebulaI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/use-notice', () => ({
  useNotice: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock('@/api/permission', () => ({
  permissionService: {
    listSubjects: vi.fn().mockResolvedValue({
      orgs: [{ id: '1', type: 'ORG', name: 'Org 1', code: 'ORG1' }],
      roles: [{ id: '2', type: 'ROLE', name: 'Role 1', code: 'ROLE1' }],
      users: [],
    }),
    listMenuTree: vi.fn().mockResolvedValue([
      {
        id: 'menu1',
        type: 'MENU',
        name: 'Menu 1',
        code: 'MENU1',
        path: '/menu1',
        status: 1,
        buttons: [
          { id: 'btn1', type: 'BUTTON', name: 'Button 1', code: 'BTN1', menuId: 'menu1' },
        ],
      },
    ]),
    pageButtons: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    pageSubjectPermissions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    createPermissions: vi.fn().mockResolvedValue([]),
    createPermissionItems: vi.fn().mockResolvedValue([]),
    updatePermissions: vi.fn().mockResolvedValue([]),
    updatePermission: vi.fn().mockResolvedValue('permission-id'),
    removePermissionsBySubjectAndResources: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ButtonPermissionPage', () => {
  afterEach(() => {
    clearAuthForTest();
  });

  it('renders without crashing', async () => {
    signInAsAdminForTest();
    render(<ButtonPermissionPage />);
    // Wait for loading to complete
    expect(await screen.findByText('auth.buttonPermission.title')).toBeInTheDocument();
  });

  it('renders loaded denied button permissions as tri-state controls', async () => {
    const service = {
      listSubjects: vi.fn().mockResolvedValue({
        orgs: [{ id: 'org1', type: 'ORG', name: 'Org 1', code: 'ORG1' }],
        roles: [],
        users: [],
      }),
      listMenuTree: vi.fn().mockResolvedValue([
        {
          id: 'menu-parent',
          type: 'CATALOG',
          name: 'Parent Menu',
          code: 'PARENT_MENU',
          path: '/parent',
          status: 1,
          children: [
            {
              id: 'menu1',
              parentId: 'menu-parent',
              type: 'MENU',
              name: 'Menu 1',
              code: 'MENU1',
              path: '/parent/menu1',
              status: 1,
              buttons: [
                { id: 'btn1', type: 'BUTTON', name: 'Button 1', code: 'BTN1', menuId: 'menu1' },
              ],
            },
          ],
        },
      ]),
      pageSubjectPermissions: vi.fn().mockResolvedValue({
        data: [{ id: 'grant1', subjectType: 'ORG', subjectId: 'org1', resourceType: 'BUTTON', resourceId: 'btn1', effect: 'Deny', scope: 'ALL' }],
        total: 1,
      }),
      pageButtons: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      createPermissions: vi.fn().mockResolvedValue([]),
      createPermissionItems: vi.fn().mockResolvedValue([]),
      updatePermissions: vi.fn().mockResolvedValue([]),
      updatePermission: vi.fn().mockResolvedValue('permission-id'),
      removePermissionsBySubjectAndResources: vi.fn().mockResolvedValue(undefined),
    } satisfies PermissionService;

    signInAsAdminForTest();
    render(<ButtonPermissionPage service={service} />);

    expect(await screen.findByText('Parent Menu')).toBeInTheDocument();
    expect(screen.getByText('Menu 1')).toBeInTheDocument();
    expect(screen.queryByText('菜单资源')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Parent Menu/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Menu 1/ })).not.toBeInTheDocument();

    const permissionToggle = await screen.findByRole('checkbox', { name: 'Button 1 auth.buttonPermission.effects.deny' });

    expect(permissionToggle).toHaveAttribute('aria-checked', 'mixed');
    expect(permissionToggle).toHaveAttribute('data-permission-effect', 'Deny');
  });

  it('loads button resources from button pagination when menu tree omits buttons', async () => {
    const pageButtons = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'btn-create-user', name: '新增', code: 'CREATE_USER', status: 1 }],
      total: 1,
    } as MenuPageResp<ButtonResp>);
    const service: PermissionService = {
      listSubjects: vi.fn().mockResolvedValue({
        orgs: [{ id: 'org1', type: 'ORG', name: 'Org 1', code: 'ORG1' }],
        roles: [],
        users: [],
      }),
      listMenuTree: vi.fn().mockResolvedValue([
        {
          id: 'menu-user',
          type: 'MENU',
          name: '用户管理',
          code: 'USER_MANAGEMENT',
          path: '/system/users',
          status: 1,
        },
      ]),
      pageButtons,
      pageSubjectPermissions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      createPermissions: vi.fn().mockResolvedValue([]),
      createPermissionItems: vi.fn().mockResolvedValue([]),
      updatePermissions: vi.fn().mockResolvedValue([]),
      updatePermission: vi.fn().mockResolvedValue('permission-id'),
      removePermissionsBySubjectAndResources: vi.fn().mockResolvedValue(undefined),
    };

    signInAsAdminForTest();
    render(<ButtonPermissionPage service={service} />);

    expect(await screen.findByText('新增')).toBeInTheDocument();
    expect(screen.getByText('CREATE_USER')).toBeInTheDocument();
    expect(pageButtons).toHaveBeenCalledWith({ menuId: 'menu-user', pageNum: 1, pageSize: 500 });
  });
});
