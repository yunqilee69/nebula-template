import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useLocaleStore } from '@/stores/locale-store';
import { clearAuthForTest, echoAuthAdapter, signInAsAdminForTest } from '@/test/auth-test-helpers';
import { menuService as defaultMenuService } from '@/api/menu';
import type { MenuService } from '@/api/menu';
import type { MenuPageResp, MenuTreeResp, ButtonResp } from '@/types/menu';
import { MenuManagementPage } from './index';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/menu', () => ({
  menuService: createMenuService(),
}));

function createMenuService(overrides: Partial<MenuService> = {}): MenuService {
  return {
    createMenu: overrides.createMenu ?? vi.fn(),
    updateMenu: overrides.updateMenu ?? vi.fn(),
    removeMenu: overrides.removeMenu ?? vi.fn(),
    getMenuById: overrides.getMenuById ?? vi.fn(),
    pageMenus: overrides.pageMenus ?? vi.fn(),
    getMenuTree: overrides.getMenuTree ?? vi.fn(),
    createButton: overrides.createButton ?? vi.fn(),
    updateButton: overrides.updateButton ?? vi.fn(),
    removeButton: overrides.removeButton ?? vi.fn(),
    getButtonById: overrides.getButtonById ?? vi.fn(),
    pageButtons: overrides.pageButtons ?? vi.fn(),
  };
}

function renderMenuManagementPage(menuService?: MenuService) {
  signInAsAdminForTest();
  return render(
    <NebulaProvider authAdapter={echoAuthAdapter}>
      <MenuManagementPage menuService={menuService} />
    </NebulaProvider>,
  );
}

async function clickLastTextMatch(user: ReturnType<typeof userEvent.setup>, text: string) {
  const matches = await screen.findAllByText(text);
  await user.click(matches[matches.length - 1]);
}

function getSaveButton() {
  return screen.getByRole('button', { name: /保\s*存/ });
}

const parentMenu: MenuTreeResp = {
  id: 'menu-1',
  name: '系统管理',
  code: 'SYSTEM',
  type: 'CATALOG',
  status: 1,
  sort: 1,
  path: '/system',
  createTime: '2026-06-06T10:00:00',
  updateTime: '2026-06-06T10:00:00',
  children: [
    {
      id: 'menu-2',
      name: '用户管理',
      code: 'USER',
      type: 'MENU',
      status: 1,
      sort: 1,
      path: '/system/user',
      createTime: '2026-06-06T10:01:00',
      updateTime: '2026-06-06T10:01:00',
    },
  ],
};

const directoryRow: MenuTreeResp = {
  id: 'dir-1',
  name: '日志目录',
  code: 'LOG_DIR',
  type: 'CATALOG',
  status: 1,
  sort: 2,
  path: '/log',
};

describe('MenuManagementPage', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
  });

  afterEach(() => {
    useLocaleStore.getState().setLocale('zh-CN');
    clearAuthForTest();
  });

  it('loads menu tree through getMenuTree and renders parent and child rows', async () => {
    const menuService = createMenuService({
      getMenuTree: vi.fn().mockResolvedValue([parentMenu, directoryRow]),
    });

    renderMenuManagementPage(menuService);

    expect(await screen.findByText('系统管理')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(within(screen.getByText('系统管理').closest('tr') as HTMLElement).getByText('目录')).toBeInTheDocument();
    expect(within(screen.getByText('用户管理').closest('tr') as HTMLElement).getByText('菜单')).toBeInTheDocument();
    expect(menuService.getMenuTree).toHaveBeenCalledTimes(1);
  });

  it('renders manage-buttons action only for rows with type menu', async () => {
    const menuService = createMenuService({
      getMenuTree: vi.fn().mockResolvedValue([parentMenu]),
    });

    renderMenuManagementPage(menuService);

    await screen.findByText('系统管理');

    const manageButtonsButtons = screen.getAllByRole('button', { name: /管理按钮/ });
    expect(manageButtonsButtons.length).toBe(1);

    const editButtons = screen.getAllByRole('button', { name: /编辑/ });
    const deleteButtons = screen.getAllByRole('button', { name: /删除/ });
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('opens button management modal and calls pageButtons with selected menuId', async () => {
    const user = userEvent.setup();
    const buttonPage: MenuPageResp<ButtonResp> = {
      data: [
        { id: 'btn-1', name: '新增', code: 'USER_ADD', status: 1, createTime: '2026-06-06T11:00:00' },
      ],
      total: 1,
    };
    const menuService = createMenuService({
      getMenuTree: vi.fn().mockResolvedValue([parentMenu]),
      pageButtons: vi.fn().mockResolvedValue(buttonPage),
    });

    renderMenuManagementPage(menuService);

    await screen.findByText('用户管理');

    await user.click(screen.getByRole('button', { name: /管理按钮/ }));

    expect(await screen.findByText(/按钮列表.*用户管理/)).toBeInTheDocument();

    await waitFor(() => {
      expect(menuService.pageButtons).toHaveBeenCalledWith(
        expect.objectContaining({ menuId: 'menu-2' }),
      );
    });
  });

  it('uses the default menu service when menuService is not provided', async () => {
    vi.mocked(defaultMenuService.getMenuTree).mockResolvedValue([parentMenu]);

    renderMenuManagementPage(undefined);

    expect(await screen.findByText('系统管理')).toBeInTheDocument();
    expect(defaultMenuService.getMenuTree).toHaveBeenCalled();
    expect(screen.queryByText('未配置菜单服务')).not.toBeInTheDocument();
  });

  it('collapses and expands tree rows preserving hierarchy', async () => {
    const menuService = createMenuService({
      getMenuTree: vi.fn().mockResolvedValue([parentMenu]),
    });

    renderMenuManagementPage(menuService);

    expect(await screen.findByText('系统管理')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();

    const expandBtn = document.querySelector('.ant-table-row-expand-icon-expanded') as HTMLElement;
    expect(expandBtn).toBeTruthy();

    fireEvent.click(expandBtn);

    await waitFor(() => {
      expect(screen.queryByText('用户管理')).not.toBeInTheDocument();
    });

    const collapsedBtn = document.querySelector('.ant-table-row-expand-icon:not(.ant-table-row-expand-icon-spaced)') as HTMLElement;
    expect(collapsedBtn).toBeTruthy();

    fireEvent.click(collapsedBtn);

    expect(await screen.findByText('用户管理')).toBeInTheDocument();
  });

  it('shows root menu as the default parent when creating a menu and submits root parent id', async () => {
    const user = userEvent.setup();
    const createMenu = vi.fn().mockResolvedValue('menu-3');
    const menuService = createMenuService({
      getMenuTree: vi.fn().mockResolvedValue([parentMenu]),
      createMenu,
    });

    renderMenuManagementPage(menuService);

    await screen.findByRole('button', { name: /新增/ });
    await user.click(screen.getByRole('button', { name: /新增/ }));
    const dialog = within(screen.getByRole('dialog', { name: '新增菜单' }));

    expect(dialog.getByText('根菜单')).toBeInTheDocument();

    await user.type(dialog.getByPlaceholderText('请输入菜单名称'), '角色管理');
    await user.type(dialog.getByPlaceholderText('请输入菜单编码'), 'ROLE_MANAGEMENT');
    await user.click(getSaveButton());

    await waitFor(() => {
      expect(createMenu).toHaveBeenCalledWith(expect.objectContaining({ parentId: '0' }));
    });
  });

  it('submits the selected cascader menu id as parentId', async () => {
    const user = userEvent.setup();
    const createMenu = vi.fn().mockResolvedValue('menu-3');
    const menuService = createMenuService({
      getMenuTree: vi.fn().mockResolvedValue([parentMenu]),
      createMenu,
    });

    renderMenuManagementPage(menuService);

    await screen.findByRole('button', { name: /新增/ });
    await user.click(screen.getByRole('button', { name: /新增/ }));
    const dialog = within(screen.getByRole('dialog', { name: '新增菜单' }));

    await user.click(dialog.getByLabelText('上级菜单'));
    await clickLastTextMatch(user, '根菜单');
    await clickLastTextMatch(user, '系统管理');
    await clickLastTextMatch(user, '用户管理');

    await user.type(dialog.getByPlaceholderText('请输入菜单名称'), '角色管理');
    await user.type(dialog.getByPlaceholderText('请输入菜单编码'), 'ROLE_MANAGEMENT');
    await user.click(getSaveButton());

    await waitFor(() => {
      expect(createMenu).toHaveBeenCalledWith(expect.objectContaining({ parentId: 'menu-2' }));
    });
  });

  it('disables the editing menu subtree in the parent cascader', async () => {
    const user = userEvent.setup();
    const menuService = createMenuService({
      getMenuTree: vi.fn().mockResolvedValue([parentMenu]),
      getMenuById: vi.fn().mockResolvedValue({ ...parentMenu, parentId: '0' }),
    });

    renderMenuManagementPage(menuService);

    await screen.findByText('系统管理');
    await user.click(screen.getAllByRole('button', { name: /编辑/ })[0]);
    const dialog = within(screen.getByRole('dialog', { name: '编辑菜单' }));

    await user.click(dialog.getByLabelText('上级菜单'));
    await clickLastTextMatch(user, '根菜单');

    const systemMatches = await screen.findAllByText('系统管理');
    const systemOption = systemMatches[systemMatches.length - 1].closest('.ant-cascader-menu-item');
    expect(systemOption).toHaveClass('ant-cascader-menu-item-disabled');
  });

  it('uses external menu type instead of an external-link switch and requires external url', async () => {
    const user = userEvent.setup();
    const createMenu = vi.fn().mockResolvedValue('external-menu');
    const menuService = createMenuService({
      getMenuTree: vi.fn().mockResolvedValue([]),
      createMenu,
    });

    renderMenuManagementPage(menuService);

    await screen.findByRole('button', { name: /新增/ });
    await user.click(screen.getByRole('button', { name: /新增/ }));
    const dialog = within(screen.getByRole('dialog', { name: '新增菜单' }));

    expect(dialog.queryByRole('switch', { name: '外链' })).not.toBeInTheDocument();

    await user.click(dialog.getByLabelText('菜单类型'));
    await user.click(await screen.findByText('外链'));
    expect(dialog.getByPlaceholderText('请输入外链地址')).toBeInTheDocument();

    await user.type(dialog.getByPlaceholderText('请输入菜单名称'), '外部系统');
    await user.type(dialog.getByPlaceholderText('请输入菜单编码'), 'EXTERNAL_SYSTEM');
    await user.click(getSaveButton());

    expect(await screen.findByText('请输入外链地址')).toBeInTheDocument();
    expect(createMenu).not.toHaveBeenCalled();

    await user.type(dialog.getByPlaceholderText('请输入外链地址'), 'not-a-url');
    await user.click(getSaveButton());

    expect(await screen.findByText('请输入有效外链地址')).toBeInTheDocument();
    expect(createMenu).not.toHaveBeenCalled();

    await user.clear(dialog.getByPlaceholderText('请输入外链地址'));
    await user.type(dialog.getByPlaceholderText('请输入外链地址'), 'https://example.com/app');
    await user.click(getSaveButton());

    await waitFor(() => {
      expect(createMenu).toHaveBeenCalledWith(expect.objectContaining({
        type: 'EXTERNAL',
        externalFlag: true,
        externalUrl: 'https://example.com/app',
      }));
    });
  });

  it('shows component selector options and fills empty metadata fields from the selected component', async () => {
    const user = userEvent.setup();
    const menuService = createMenuService({
      getMenuTree: vi.fn().mockResolvedValue([]),
      createMenu: vi.fn().mockResolvedValue('menu-1'),
    });

    signInAsAdminForTest();
    render(
      <NebulaProvider authAdapter={echoAuthAdapter}>
        <MenuManagementPage
          menuService={menuService}
          componentOptions={[
            {
              label: '用户管理',
              value: 'UserManagementPage',
              defaultName: '用户管理',
              defaultCode: 'USER_MANAGEMENT',
              defaultPath: '/auth/user',
              defaultIcon: 'UserOutlined',
            },
          ]}
        />
      </NebulaProvider>,
    );

    await screen.findByRole('button', { name: /新增/ });
    await user.click(screen.getByRole('button', { name: /新增/ }));
    const dialog = within(screen.getByRole('dialog', { name: '新增菜单' }));

    await user.click(dialog.getByLabelText('组件'));
    await user.click(await screen.findByText('用户管理'));

    await waitFor(() => {
      expect(dialog.getByPlaceholderText('请输入菜单名称')).toHaveValue('用户管理');
      expect(dialog.getByPlaceholderText('请输入菜单编码')).toHaveValue('USER_MANAGEMENT');
      expect(dialog.getByPlaceholderText('请输入路径')).toHaveValue('/auth/user');
      expect(dialog.getByPlaceholderText('请输入图标')).toHaveValue('UserOutlined');
    });
  });

  it('does not overwrite user-edited metadata when selecting a component', async () => {
    const user = userEvent.setup();
    const menuService = createMenuService({
      getMenuTree: vi.fn().mockResolvedValue([]),
      createMenu: vi.fn().mockResolvedValue('menu-1'),
    });

    signInAsAdminForTest();
    render(
      <NebulaProvider authAdapter={echoAuthAdapter}>
        <MenuManagementPage
          menuService={menuService}
          componentOptions={[
            {
              label: '用户管理',
              value: 'UserManagementPage',
              defaultName: '用户管理',
              defaultCode: 'USER_MANAGEMENT',
              defaultPath: '/auth/user',
              defaultIcon: 'UserOutlined',
            },
          ]}
        />
      </NebulaProvider>,
    );

    await screen.findByRole('button', { name: /新增/ });
    await user.click(screen.getByRole('button', { name: /新增/ }));
    const dialog = within(screen.getByRole('dialog', { name: '新增菜单' }));
    await user.type(dialog.getByPlaceholderText('请输入菜单名称'), 'Users');
    await user.type(dialog.getByPlaceholderText('请输入菜单编码'), 'CUSTOM_USERS');
    await user.type(dialog.getByPlaceholderText('请输入路径'), '/custom/users');
    await user.type(dialog.getByPlaceholderText('请输入图标'), 'CustomIcon');

    await user.click(dialog.getByLabelText('组件'));
    await user.click(await screen.findByText('用户管理'));

    await waitFor(() => {
      expect(dialog.getByPlaceholderText('请输入菜单名称')).toHaveValue('Users');
      expect(dialog.getByPlaceholderText('请输入菜单编码')).toHaveValue('CUSTOM_USERS');
      expect(dialog.getByPlaceholderText('请输入路径')).toHaveValue('/custom/users');
      expect(dialog.getByPlaceholderText('请输入图标')).toHaveValue('CustomIcon');
    });
  });
});
