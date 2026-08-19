import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Grid } from 'antd';
import { NebulaProvider } from '@/providers/nebula-provider';
import { NebulaLayout } from './nebula-layout';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLocaleStore } from '@/stores/locale-store';
import { useNotifyStore } from '@/stores/notify';
import { useThemeStore } from '@/stores/theme-store';
import type { AuthService } from '@/api/auth';
import type { NebulaMenuItem } from '@/route/types';
import type { CurrentAnnouncementResp } from '@/types/notify';
import { clearAuthTokens } from '@/utils/auth/token-session';

const notifyMocks = vi.hoisted(() => ({
  getUnreadSiteMessageCount: vi.fn().mockResolvedValue(0),
  pageSiteMessages: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  listCurrentPopupAnnouncements: vi.fn().mockResolvedValue([]),
  markAnnouncementRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/auth/token-session', () => ({
  saveAuthTokens: vi.fn(),
  getStoredAccessToken: vi.fn(() => null),
  getStoredRefreshToken: vi.fn(() => null),
  clearAuthTokens: vi.fn(),
}));

vi.mock('@/services/notify', () => ({
  notifyService: notifyMocks,
}));

const menuItems: NebulaMenuItem[] = [
  { key: '/', path: '/', name: '工作台' },
  { key: '/ops', path: '/ops', name: '运维中心' },
  {
    key: '/system',
    path: '/system',
    name: '系统管理',
    children: [{ key: '/system/users', path: '/system/users', name: '用户管理' }],
  },
];

function renderLayout(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NebulaLayout title="Nebula Web" menuItems={menuItems} rightContent={<button type="button">Demo User</button>}>
        <Routes>
          <Route path="/" element={<h1>工作台内容</h1>} />
          <Route path="/ops" element={<h1>运维内容</h1>} />
          <Route path="/system/users" element={<h1>用户内容</h1>} />
        </Routes>
      </NebulaLayout>
    </MemoryRouter>,
  );
}

function renderLayoutWithoutRightContent(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NebulaLayout title="Nebula Web" menuItems={menuItems}>
        <Routes>
          <Route path="/" element={<h1>工作台内容</h1>} />
          <Route path="/ops" element={<h1>运维内容</h1>} />
          <Route path="/system/users" element={<h1>用户内容</h1>} />
          <Route path="/profile/info" element={<h1>个人信息内容</h1>} />
          <Route path="/notify/inbox" element={<h1>我的消息内容</h1>} />
        </Routes>
      </NebulaLayout>
    </MemoryRouter>,
  );
}

function createMockAuthService(partial?: Partial<AuthService>): AuthService {
  return {
    getAuthConfig: partial?.getAuthConfig ?? vi.fn(),
    login: partial?.login ?? vi.fn(),
    phoneLogin: partial?.phoneLogin ?? vi.fn(),
    emailLogin: partial?.emailLogin ?? vi.fn(),
    register: partial?.register ?? vi.fn(),
    sendPhoneCode: partial?.sendPhoneCode ?? vi.fn(),
    sendEmailCode: partial?.sendEmailCode ?? vi.fn(),
    sendForgotPasswordCode: partial?.sendForgotPasswordCode ?? vi.fn(),
    verifyForgotPasswordCode: partial?.verifyForgotPasswordCode ?? vi.fn(),
    changeForgottenPassword: partial?.changeForgottenPassword ?? vi.fn(),
    refreshToken: partial?.refreshToken ?? vi.fn(),
    logout: partial?.logout ?? vi.fn(),
    getCurrentUser: partial?.getCurrentUser ?? vi.fn(),
    prepareGitHubRedirect: partial?.prepareGitHubRedirect ?? vi.fn(),
    getGitHubLoginStatus: partial?.getGitHubLoginStatus ?? vi.fn(),
    completeGitHubRedirectCallback: partial?.completeGitHubRedirectCallback ?? vi.fn(),
  };
}

function renderLayoutWithAuthService(authService: AuthService, initialPath = '/', onLogoutSuccess?: () => void) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NebulaProvider
        authAdapter={{
          getCurrentUser: async () => useAuthStore.getState().user,
        }}
        loginBadge={{ authService, onLogoutSuccess }}
      >
        <NebulaLayout title="Nebula Web" menuItems={menuItems}>
          <Routes>
            <Route path="/" element={<h1>工作台内容</h1>} />
            <Route path="/login" element={<h1>登录页面</h1>} />
            <Route path="/profile/info" element={<h1>个人信息内容</h1>} />
          </Routes>
        </NebulaLayout>
      </NebulaProvider>
    </MemoryRouter>,
  );
}

let refreshRenderCount = 0;

function RefreshProbe() {
  const instanceId = useRef(++refreshRenderCount);
  return <h1>刷新探针 {instanceId.current}</h1>;
}

async function openTabContextMenu(tab: HTMLElement, coordinates?: { clientX: number; clientY: number }): Promise<void> {
  await act(async () => {
    fireEvent.contextMenu(tab, coordinates);
  });
}

describe('NebulaLayout', () => {
  beforeEach(() => {
    notifyMocks.getUnreadSiteMessageCount.mockResolvedValue(0);
    notifyMocks.pageSiteMessages.mockResolvedValue({ data: [], total: 0 });
    notifyMocks.listCurrentPopupAnnouncements.mockResolvedValue([]);
    notifyMocks.markAnnouncementRead.mockResolvedValue(undefined);
    useAppStore.getState().setSiderCollapsed(false);
    useAuthStore.getState().setUser({
      id: 'u1',
      name: 'Ada Lovelace',
      avatar: 'https://example.com/ada.png',
      roles: [],
      permissions: [],
    });
    useLocaleStore.getState().setLocale('zh-CN');
    useNotifyStore.getState().setUnreadCount(0);
    useThemeStore.getState().setMode('light');
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders modern shell regions with brand, navigation, header actions, tabs, and main content', async () => {
    renderLayout('/system/users');

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    });

    expect(screen.getByText('Nebula Web')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /系统管理/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '面包屑' })).toHaveTextContent('系统管理');
    expect(screen.getByRole('navigation', { name: '面包屑' })).toHaveTextContent('用户管理');
    expect(screen.getByRole('button', { name: 'Demo User' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '用户管理' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('main')).toHaveTextContent('用户内容');
  });

  it('renders the authenticated popup announcement from the layout root', async () => {
    const popupAnnouncement: CurrentAnnouncementResp = {
      id: 'layout-announcement',
      title: '布局公告',
      content: '布局公告内容',
      publishTime: '2026-08-10 10:00:00',
      pinnedFlag: false,
      sortNum: 1,
      popupFlag: true,
      readStatus: false,
    };
    notifyMocks.listCurrentPopupAnnouncements.mockResolvedValueOnce([popupAnnouncement]);

    renderLayout('/');

    expect(await screen.findByRole('dialog', { name: '布局公告' })).toBeInTheDocument();
    expect(screen.getByText('布局公告内容')).toBeInTheDocument();
  });

  it('keeps route-tab styling in generated classes instead of injecting raw style tags', async () => {
    const { container } = renderLayout('/system/users');

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '用户管理' })).toBeInTheDocument();
    });

    expect(container.querySelector('.nebula-route-tabs style')).not.toBeInTheDocument();
  });

  describe('default header user menu', () => {
    it('renders the current user avatar and name when rightContent is absent', async () => {
      renderLayoutWithoutRightContent('/');

      const trigger = await screen.findByRole('button', { name: /Ada Lovelace/ });

      expect(trigger).toBeInTheDocument();
      expect(within(trigger).getByText('Ada Lovelace')).toBeInTheDocument();
      expect(within(trigger).getByRole('img', { name: /Ada Lovelace/ })).toBeInTheDocument();
    });

    it('renders the notification bell for the authenticated default header', async () => {
      renderLayoutWithoutRightContent('/');

      expect(await screen.findByRole('button', { name: '通知，0 条未读' })).toBeInTheDocument();
    });

    it('opens notification inbox as a localized route tab from the bell dropdown', async () => {
      const user = userEvent.setup();
      renderLayoutWithoutRightContent('/');

      await user.click(await screen.findByRole('button', { name: '通知，0 条未读' }));
      await user.click(await screen.findByRole('menuitem', { name: '查看全部消息' }));

      expect(await screen.findByRole('tab', { name: '我的消息' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('main')).toHaveTextContent('我的消息内容');

      await user.click(screen.getByRole('tab', { name: '工作台' }));
      await user.click(screen.getByRole('tab', { name: '我的消息' }));

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: '我的消息' })).toHaveAttribute('aria-selected', 'true');
      });
      expect(screen.queryByRole('tab', { name: '/notify/inbox' })).not.toBeInTheDocument();
    });

    it('keeps the user avatar accessible while hiding the display name on extra-small screens', async () => {
      vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ xs: true });
      renderLayoutWithoutRightContent('/');

      const trigger = await screen.findByRole('button', { name: /Ada Lovelace/ });

      expect(within(trigger).getByRole('img', { name: /Ada Lovelace/ })).toBeInTheDocument();
      expect(within(trigger).queryByText('Ada Lovelace')).not.toBeInTheDocument();
    });

    it('keeps rightContent as a full override for custom header actions', async () => {
      renderLayout('/');

      expect(await screen.findByRole('button', { name: 'Demo User' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Ada Lovelace/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /通知/ })).not.toBeInTheDocument();
    });

    it('shows profile preferences divider and logout actions from the user dropdown', async () => {
      const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
      renderLayoutWithoutRightContent('/');

      await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));

      const menu = await screen.findByRole('menu', { name: '用户菜单' });
      expect(within(menu).getByRole('menuitem', { name: '个人信息' })).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: '偏好设置' })).toBeInTheDocument();
      expect(within(menu).getByRole('separator')).toBeInTheDocument();
      expect(within(menu).getByRole('menuitem', { name: '退出登录' })).toBeInTheDocument();
    });

    it('applies theme and language only after saving preferences', async () => {
      const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
      renderLayoutWithoutRightContent('/');

      await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));
      await user.click(await screen.findByRole('menuitem', { name: '偏好设置' }));
      await user.click(await screen.findByText('深色'));
      await user.click(await screen.findByText('English'));

      expect(useThemeStore.getState().mode).toBe('light');
      expect(useLocaleStore.getState().locale).toBe('zh-CN');

      await user.click(screen.getByRole('button', { name: /保\s*存/ }));

      expect(useThemeStore.getState().mode).toBe('dark');
      expect(useLocaleStore.getState().locale).toBe('en-US');
    });

    it('discards preference drafts when the drawer is cancelled', async () => {
      const user = userEvent.setup();
      renderLayoutWithoutRightContent('/');

      await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));
      await user.click(await screen.findByRole('menuitem', { name: '偏好设置' }));
      await user.click(await screen.findByText('深色'));
      await user.click(await screen.findByText('English'));
      await user.click(screen.getByRole('button', { name: /取\s*消/ }));

      expect(useThemeStore.getState().mode).toBe('light');
      expect(useLocaleStore.getState().locale).toBe('zh-CN');
    });

    it('opens profile info as a localized route tab from the dropdown', async () => {
      const user = userEvent.setup();
      renderLayoutWithoutRightContent('/');

      await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));
      await user.click(await screen.findByRole('menuitem', { name: '个人信息' }));

      expect(await screen.findByRole('tab', { name: '个人信息' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('main')).toHaveTextContent('个人信息内容');

      await user.click(screen.getByRole('tab', { name: '工作台' }));
      await user.click(screen.getByRole('tab', { name: '个人信息' }));

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: '个人信息' })).toHaveAttribute('aria-selected', 'true');
      });
      expect(screen.queryByRole('tab', { name: '/profile/info' })).not.toBeInTheDocument();
    });

    it('shows profile info as the active route tab when mounted directly on the profile route', async () => {
      renderLayoutWithoutRightContent('/profile/info');

      expect(await screen.findByRole('tab', { name: '个人信息' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: '工作台' })).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('main')).toHaveTextContent('个人信息内容');
    });

    it('shows profile info as the active route tab after programmatic navigation', async () => {
      render(
        <MemoryRouter initialEntries={['/redirect-source']}>
          <NebulaLayout title="Nebula Web" menuItems={menuItems}>
            <Routes>
              <Route path="/" element={<h1>工作台内容</h1>} />
              <Route path="/redirect-source" element={<Navigate to="/profile/info" replace />} />
              <Route path="/profile/info" element={<h1>个人信息内容</h1>} />
            </Routes>
          </NebulaLayout>
        </MemoryRouter>,
      );

      expect(await screen.findByRole('tab', { name: '个人信息' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: '工作台' })).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('main')).toHaveTextContent('个人信息内容');
    });

    it('clears the current user when logout is selected', async () => {
      const user = userEvent.setup();
      renderLayoutWithoutRightContent('/');

      await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));
      await user.click(await screen.findByRole('menuitem', { name: '退出登录' }));

      expect(useAuthStore.getState().user).toBeNull();
      expect(await screen.findByRole('button', { name: '未登录用户' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /通知/ })).not.toBeInTheDocument();
    });

    it('calls the auth service logout endpoint and returns to login when logout is selected', async () => {
      const user = userEvent.setup();
      const onLogoutSuccess = vi.fn();
      const authService = createMockAuthService({
        logout: vi.fn().mockResolvedValue(undefined),
      });
      renderLayoutWithAuthService(authService, '/', onLogoutSuccess);

      await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));
      await user.click(await screen.findByRole('menuitem', { name: '退出登录' }));

      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalledOnce();
      });
      expect(clearAuthTokens).toHaveBeenCalledOnce();
      expect(onLogoutSuccess).toHaveBeenCalledOnce();
      expect(useAuthStore.getState().user).toBeNull();
      expect(await screen.findByRole('heading', { name: '登录页面' })).toBeInTheDocument();
    });

    it('does not clear auth tokens or user state when the logout API rejects', async () => {
      const user = userEvent.setup();
      const onLogoutSuccess = vi.fn();
      const authService = createMockAuthService({
        logout: vi.fn().mockRejectedValue(new Error('network error')),
      });
      renderLayoutWithAuthService(authService, '/', onLogoutSuccess);

      await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));
      await user.click(await screen.findByRole('menuitem', { name: '退出登录' }));

      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalledOnce();
      });
      expect(clearAuthTokens).not.toHaveBeenCalled();
      expect(onLogoutSuccess).not.toHaveBeenCalled();
      expect(useAuthStore.getState().user).not.toBeNull();
    });
  });

  it('uses the provider brand name when no layout title is supplied', async () => {
    render(
      <NebulaProvider brand={{ name: 'Acme Console' }}>
        <MemoryRouter initialEntries={['/']}>
          <NebulaLayout menuItems={menuItems}>
            <Routes>
              <Route path="/" element={<h1>工作台内容</h1>} />
            </Routes>
          </NebulaLayout>
        </MemoryRouter>
      </NebulaProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    });

    expect(screen.getByText('Acme Console')).toBeInTheDocument();
  });

  it('keeps explicit layout title above provider brand name', async () => {
    render(
      <NebulaProvider brand={{ name: 'Provider Brand' }}>
        <MemoryRouter initialEntries={['/']}>
          <NebulaLayout title="Layout Brand" menuItems={menuItems}>
            <Routes>
              <Route path="/" element={<h1>工作台内容</h1>} />
            </Routes>
          </NebulaLayout>
        </MemoryRouter>
      </NebulaProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Layout Brand')).toBeInTheDocument();
    });

    expect(screen.queryByText('Provider Brand')).not.toBeInTheDocument();
  });

  it('centers the brand icon when the sidebar is collapsed', async () => {
    const user = userEvent.setup();
    renderLayout('/');

    const navigation = screen.getByRole('navigation', { name: '主导航' });
    const brandHeader = within(navigation).getByTestId('nebula-sidebar-brand');

    await user.click(screen.getByRole('button', { name: '收起侧边栏' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '展开侧边栏' })).toBeInTheDocument();
      expect(brandHeader).toHaveStyle('justify-content: center; padding-inline: 0;');
    });
  });

  it('adds a small spacing hook between route tabs', async () => {
    const user = userEvent.setup();
    renderLayout('/');

    await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));

    expect(screen.getByRole('tablist').closest('.nebula-route-tabs')).toBeInTheDocument();
  });

  it('renders the sidebar without reserving a scrollbar gutter gap', async () => {
    renderLayout('/');

    const navigation = await screen.findByRole('navigation', { name: '主导航' });

    expect(navigation).not.toHaveAttribute('style', expect.stringContaining('scrollbar-gutter'));
  });

  it('contains scrolling inside the dashboard content instead of the document', async () => {
    renderLayout('/');

    const navigation = await screen.findByRole('navigation', { name: '主导航' });
    const main = screen.getByRole('main');

    expect(navigation.parentElement).toHaveStyle('height: 100dvh; overflow: hidden;');
    expect(main.parentElement).toHaveStyle('height: 100%; overflow: hidden;');
    expect(main).toHaveStyle('flex: 1; min-height: 0; overflow: auto;');
  });

  it('bounds expanded sidebar menus inside an independently scrollable flex child', async () => {
    renderLayout('/system/users');

    const navigation = await screen.findByRole('navigation', { name: '主导航' });
    const menu = within(navigation).getAllByRole('menu').find((element) => element.classList.contains('ant-menu-root'));
    const menuWrapper = menu?.parentElement;
    const siderChildren = menuWrapper?.parentElement;

    if (!menuWrapper || !siderChildren) {
      throw new Error('Expected sidebar menu to have a scroll container parent');
    }

    expect(navigation).toHaveStyle('display: flex; flex-direction: column; height: 100dvh; overflow: visible;');
    expect(siderChildren).toHaveStyle('display: flex; flex-direction: column; height: 100%; min-height: 0;');
    expect(menuWrapper).toHaveStyle('flex: 1; min-height: 0; overflow: hidden auto;');
  });

  it('collapses the sidebar to icon-only navigation from the brand header divider trigger', async () => {
    const user = userEvent.setup();
    renderLayout('/');

    const navigation = screen.getByRole('navigation', { name: '主导航' });
    const brandHeader = within(navigation).getByTestId('nebula-sidebar-brand');
    const collapseButton = within(brandHeader).getByRole('button', { name: '收起侧边栏' });

    expect(within(navigation).getByText('Nebula Web')).toBeInTheDocument();
    expect(collapseButton).toHaveStyle('position: absolute; inset-inline-end: -16px; top: 50%; border-radius: 50%;');
    expect(collapseButton).toHaveStyle('display: inline-flex; align-items: center; justify-content: center;');
    expect(navigation).toHaveStyle('overflow: visible;');

    await user.click(collapseButton);

    expect(useAppStore.getState().siderCollapsed).toBe(true);
    expect(screen.getByRole('button', { name: '展开侧边栏' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(navigation).queryByText('Nebula Web')).not.toBeInTheDocument();
  });

  it('uses Ant Design left and right icons for the sidebar collapse trigger', async () => {
    const user = userEvent.setup();
    renderLayout('/');

    const collapseButton = screen.getByRole('button', { name: '收起侧边栏' });
    const collapseIcon = within(collapseButton).getByTestId('nebula-sidebar-collapse-icon');
    expect(collapseIcon).toBeInTheDocument();
    expect(collapseIcon).toHaveClass('nebula-sidebar-collapse-control-icon');
    expect(document.querySelector('.anticon-left')).toBeInTheDocument();

    await user.click(collapseButton);

    expect(within(screen.getByRole('button', { name: '展开侧边栏' })).getByTestId('nebula-sidebar-expand-icon')).toBeInTheDocument();
    expect(document.querySelector('.anticon-right')).toBeInTheDocument();
  });

  it('opens a non-ASCII route path as a distinct tab without throwing', async () => {
    const user = userEvent.setup();
    const unicodeItems: NebulaMenuItem[] = [
      { key: '/首页', path: '/首页', name: '首页' },
      { key: '/用户', path: '/用户', name: '用户页' },
    ];

    render(
      <MemoryRouter initialEntries={['/首页']}>
        <NebulaLayout title="Test" menuItems={unicodeItems}>
          <Routes>
            <Route path="/首页" element={<h1>首页内容</h1>} />
            <Route path="/用户" element={<h1>用户内容</h1>} />
          </Routes>
        </NebulaLayout>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('menuitem', { name: /用户页/ }));

    expect(screen.getByRole('tab', { name: '用户页' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('main')).toHaveTextContent('用户内容');

    await user.click(screen.getByRole('tab', { name: '首页' }));
    expect(screen.getByRole('tab', { name: '首页' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('main')).toHaveTextContent('首页内容');
  });

  it('distinguishes route tabs whose paths differ only by slashes vs underscores', async () => {
    const user = userEvent.setup();
    const collisionItems: NebulaMenuItem[] = [
      { key: '/root', path: '/root', name: 'Root' },
      { key: '/a/b', path: '/a/b', name: 'Slash AB' },
      { key: '/a_b', path: '/a_b', name: 'Underscore AB' },
    ];

    render(
      <MemoryRouter initialEntries={['/root']}>
        <NebulaLayout title="Test" menuItems={collisionItems}>
          <Routes>
            <Route path="/root" element={<h1>Root</h1>} />
            <Route path="/a/b" element={<h1>SlashAB</h1>} />
            <Route path="/a_b" element={<h1>UnderscoreAB</h1>} />
          </Routes>
        </NebulaLayout>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('menuitem', { name: /Slash AB/ }));
    await user.click(screen.getByRole('menuitem', { name: /Underscore AB/ }));

    expect(screen.getByRole('tab', { name: 'Slash AB' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Underscore AB' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Underscore AB' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Slash AB' }));
    expect(screen.getByRole('tab', { name: 'Slash AB' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('main')).toHaveTextContent('SlashAB');

    await user.click(screen.getByRole('tab', { name: 'Underscore AB' }));
    expect(screen.getByRole('tab', { name: 'Underscore AB' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('main')).toHaveTextContent('UnderscoreAB');
  });

  it('opens a route tab once when clicking a menu item repeatedly', async () => {
    const user = userEvent.setup();
    renderLayout('/');

    await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));
    await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));

    expect(screen.getAllByRole('tab', { name: '运维中心' })).toHaveLength(1);
    expect(screen.getByRole('tab', { name: '运维中心' })).toHaveAttribute('aria-selected', 'true');
  });

  it('navigates menu items with visibleInTab false without opening a route tab', async () => {
    const user = userEvent.setup();
    const runtimeItems: NebulaMenuItem[] = [
      { key: '/', path: '/', name: '工作台' },
      { key: '/report/detail', path: '/report/detail', name: '报表详情', visibleInTab: false },
    ];

    render(
      <MemoryRouter initialEntries={['/']}>
        <NebulaLayout title="Test" menuItems={runtimeItems}>
          <Routes>
            <Route path="/" element={<h1>工作台内容</h1>} />
            <Route path="/report/detail" element={<h1>报表详情内容</h1>} />
          </Routes>
        </NebulaLayout>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('menuitem', { name: /报表详情/ }));

    expect(screen.getByRole('main')).toHaveTextContent('报表详情内容');
    expect(screen.queryByRole('tab', { name: '报表详情' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '工作台' })).toBeInTheDocument();
  });

  it('skips visibleInTab false menu items when seeding initial route tabs', async () => {
    const runtimeItems: NebulaMenuItem[] = [
      { key: '/hidden-tab', path: '/hidden-tab', name: '隐藏标签', visibleInTab: false },
      { key: '/visible-tab', path: '/visible-tab', name: '可见标签' },
    ];

    render(
      <MemoryRouter initialEntries={['/visible-tab']}>
        <NebulaLayout title="Test" menuItems={runtimeItems}>
          <Routes>
            <Route path="/hidden-tab" element={<h1>隐藏标签内容</h1>} />
            <Route path="/visible-tab" element={<h1>可见标签内容</h1>} />
          </Routes>
        </NebulaLayout>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('tab', { name: '可见标签' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: '隐藏标签' })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('可见标签内容');
  });

  it('renders runtime iconNode instead of the backend icon string', async () => {
    const iconItems: NebulaMenuItem[] = [
      {
        key: '/users',
        path: '/users',
        name: '用户管理',
        icon: 'user',
        iconNode: <span data-testid="runtime-user-icon" />,
      },
    ];

    render(
      <MemoryRouter initialEntries={['/users']}>
        <NebulaLayout title="Test" menuItems={iconItems}>
          <Routes>
            <Route path="/users" element={<h1>用户内容</h1>} />
          </Routes>
        </NebulaLayout>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('runtime-user-icon')).toBeInTheDocument();
  });

  it('hides hidden menu items while keeping their route title and active parent menu selection', async () => {
    const runtimeItems: NebulaMenuItem[] = [
      {
        key: '/system',
        path: '/system',
        name: '系统管理',
        children: [
          { key: '/system/users', path: '/system/users', name: '用户管理' },
          {
            key: '/system/users/detail',
            path: '/system/users/detail',
            name: '用户详情',
            hidden: true,
            activeMenuPath: '/system/users',
          },
        ],
      },
    ];

    render(
      <MemoryRouter initialEntries={['/system/users/detail']}>
        <NebulaLayout title="Test" menuItems={runtimeItems}>
          <Routes>
            <Route path="/system/users/detail" element={<h1>用户详情内容</h1>} />
          </Routes>
        </NebulaLayout>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('main')).toHaveTextContent('用户详情内容');
    expect(screen.queryByRole('menuitem', { name: /用户详情/ })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '面包屑' })).toHaveTextContent('用户详情');
    expect(screen.getByRole('menuitem', { name: /用户管理/ })).toHaveClass('ant-menu-item-selected');
  });

  it('highlights only the active page menu and does not highlight its catalog group', async () => {
    const catalogItems: NebulaMenuItem[] = [
      {
        key: '/system',
        path: '/system',
        name: '系统管理',
        type: 'CATALOG',
        children: [
          {
            key: '/system/users',
            path: '/system/users',
            name: '用户管理',
            type: 'MENU',
            activeMenuPath: '/system',
          },
          { key: '/system/roles', path: '/system/roles', name: '角色管理', type: 'MENU' },
        ],
      },
    ];

    render(
      <MemoryRouter initialEntries={['/system/users']}>
        <NebulaLayout title="Test" menuItems={catalogItems}>
          <Routes>
            <Route path="/system/users" element={<h1>用户内容</h1>} />
            <Route path="/system/roles" element={<h1>角色内容</h1>} />
          </Routes>
        </NebulaLayout>
      </MemoryRouter>,
    );

    const navigation = await screen.findByRole('navigation', { name: '主导航' });
    expect(within(navigation).getByRole('menuitem', { name: /用户管理/ })).toHaveClass('ant-menu-item-selected');
    expect(within(navigation).getByRole('menuitem', { name: /角色管理/ })).not.toHaveClass('ant-menu-item-selected');
    expect(within(navigation).getByRole('menuitem', { name: /系统管理/ })).not.toHaveClass('ant-menu-item-selected');
    expect(within(navigation).getByRole('menuitem', { name: /系统管理/ })).not.toHaveClass('ant-menu-submenu-selected');
    expect(within(navigation).queryByRole('link', { name: '系统管理' })).not.toBeInTheDocument();
  });

  it('renders catalog breadcrumb ancestors as text instead of links', async () => {
    const catalogItems: NebulaMenuItem[] = [
      {
        key: '/system',
        path: '/system',
        name: '系统管理',
        type: 'CATALOG',
        children: [{ key: '/system/users', path: '/system/users', name: '用户管理', type: 'MENU' }],
      },
    ];

    render(
      <MemoryRouter initialEntries={['/system/users']}>
        <NebulaLayout title="Test" menuItems={catalogItems}>
          <Routes>
            <Route path="/system/users" element={<h1>用户内容</h1>} />
          </Routes>
        </NebulaLayout>
      </MemoryRouter>,
    );

    const breadcrumb = await screen.findByRole('navigation', { name: '面包屑' });
    expect(within(breadcrumb).queryByRole('link', { name: '系统管理' })).not.toBeInTheDocument();
    expect(within(breadcrumb).getByText('系统管理')).toBeInTheDocument();
    expect(within(breadcrumb).getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('用户内容');
  });

  it('degrades safely when activeMenuPath points to a missing menu item', async () => {
    const runtimeItems: NebulaMenuItem[] = [
      {
        key: '/hidden/detail',
        path: '/hidden/detail',
        name: '隐藏详情',
        hidden: true,
        activeMenuPath: '/missing/menu',
      },
    ];

    render(
      <MemoryRouter initialEntries={['/hidden/detail']}>
        <NebulaLayout title="Test" menuItems={runtimeItems}>
          <Routes>
            <Route path="/hidden/detail" element={<h1>隐藏详情内容</h1>} />
          </Routes>
        </NebulaLayout>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('main')).toHaveTextContent('隐藏详情内容');
    expect(screen.queryByRole('menuitem', { name: /隐藏详情/ })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '面包屑' })).toHaveTextContent('隐藏详情');
    expect(document.querySelector('.ant-menu-item-selected')).not.toBeInTheDocument();
  });

  describe('sidebar collapse accessibility', () => {
    it('shows no visible text inside navigation after collapse but remains accessible by aria-label', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      const navigation = screen.getByRole('navigation', { name: '主导航' });
      expect(within(navigation).getByText('Nebula Web')).toBeInTheDocument();

      const collapseButton = screen.getByRole('button', { name: '收起侧边栏' });
      await user.click(collapseButton);

      expect(useAppStore.getState().siderCollapsed).toBe(true);
      expect(screen.getByRole('button', { name: '展开侧边栏' })).toBeInTheDocument();
      expect(within(navigation).queryByText('收起侧边栏')).not.toBeInTheDocument();
      expect(within(navigation).queryByText('展开侧边栏')).not.toBeInTheDocument();
      expect(within(navigation).queryByText('Nebula Web')).not.toBeInTheDocument();
    });
  });

  it('keeps the route content wrapper full-height so page containers can fill the main area', () => {
    renderLayout('/');

    const routeContentWrapper = screen.getByRole('main').firstElementChild;

    expect(routeContentWrapper).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      flex: '1 1 auto',
      minHeight: '0',
      height: '100%',
    });
  });

  describe('tab context menu', () => {
    it('shows context menu with the requested tab actions on right-click', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));

      const opsTab = screen.getByRole('tab', { name: '运维中心' });
      await openTabContextMenu(opsTab);

      expect(screen.getByRole('menuitem', { name: '刷新' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: '关闭' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: '关闭左侧' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: '关闭右侧' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: '关闭其他' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: '新窗口打开' })).toBeInTheDocument();
    });

    it('shows Ant Design context menu items vertically in the requested order', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));

      await openTabContextMenu(screen.getByRole('tab', { name: '运维中心' }));

      const menu = await screen.findByRole('menu', { name: '标签页菜单' });
      const items = within(menu).getAllByRole('menuitem');

      expect(items.map((item) => item.textContent)).toEqual([
        '刷新',
        '关闭',
        '关闭左侧',
        '关闭右侧',
        '关闭其他',
        '新窗口打开',
      ]);
      expect(screen.queryByRole('menuitem', { name: '关闭所有' })).not.toBeInTheDocument();
    });

    it('enables close on the initial workspace tab but disables side and other actions with one tab', async () => {
      renderLayout('/');

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
      });

      await openTabContextMenu(screen.getByRole('tab', { name: '工作台' }));

      expect(screen.getByRole('menuitem', { name: '刷新' })).not.toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('menuitem', { name: '关闭' })).not.toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('menuitem', { name: '关闭左侧' })).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('menuitem', { name: '关闭右侧' })).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('menuitem', { name: '关闭其他' })).toHaveAttribute('aria-disabled', 'true');
    });

    it('enables side and other close actions based on the clicked tab position', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));
      await user.click(screen.getByRole('menuitem', { name: /系统管理/ }));
      await user.click(screen.getByRole('menuitem', { name: /用户管理/ }));

      await openTabContextMenu(screen.getByRole('tab', { name: '运维中心' }));

      expect(screen.getByRole('menuitem', { name: '关闭左侧' })).not.toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('menuitem', { name: '关闭右侧' })).not.toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('menuitem', { name: '关闭其他' })).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('close current removes active closable tab and navigates to fallback', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));

      const opsTab = screen.getByRole('tab', { name: '运维中心' });
      await openTabContextMenu(opsTab);

      await user.click(screen.getByRole('menuitem', { name: '关闭' }));

      expect(screen.queryByRole('tab', { name: '运维中心' })).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '工作台' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('main')).toHaveTextContent('工作台内容');
    });

    it('close others keeps only the clicked tab', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));
      await user.click(screen.getByRole('menuitem', { name: /系统管理/ }));
      await user.click(screen.getByRole('menuitem', { name: /用户管理/ }));

      const opsTab = screen.getByRole('tab', { name: '运维中心' });
      await openTabContextMenu(opsTab);

      await user.click(screen.getByRole('menuitem', { name: '关闭其他' }));

      expect(screen.getByRole('tab', { name: '运维中心' })).toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: '工作台' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: '用户管理' })).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '运维中心' })).toHaveAttribute('aria-selected', 'true');
    });

    it('closing the final tab reopens and selects the workspace fallback tab', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await openTabContextMenu(screen.getByRole('tab', { name: '工作台' }));
      await user.click(screen.getByRole('menuitem', { name: '关闭' }));

      expect(screen.getByRole('tab', { name: '工作台' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '工作台' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('main')).toHaveTextContent('工作台内容');
    });

    it('close left removes only tabs before the clicked tab and selects clicked tab if active was removed', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));
      await user.click(screen.getByRole('menuitem', { name: /系统管理/ }));
      await user.click(screen.getByRole('menuitem', { name: /用户管理/ }));
      await user.click(screen.getByRole('tab', { name: '工作台' }));

      await openTabContextMenu(screen.getByRole('tab', { name: '运维中心' }));
      await user.click(screen.getByRole('menuitem', { name: '关闭左侧' }));

      expect(screen.queryByRole('tab', { name: '工作台' })).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '运维中心' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '用户管理' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '运维中心' })).toHaveAttribute('aria-selected', 'true');
    });

    it('close right removes only tabs after the clicked tab and selects clicked tab if active was removed', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));
      await user.click(screen.getByRole('menuitem', { name: /系统管理/ }));
      await user.click(screen.getByRole('menuitem', { name: /用户管理/ }));

      await openTabContextMenu(screen.getByRole('tab', { name: '运维中心' }));
      await user.click(screen.getByRole('menuitem', { name: '关闭右侧' }));

      expect(screen.getByRole('tab', { name: '工作台' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '运维中心' })).toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: '用户管理' })).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '运维中心' })).toHaveAttribute('aria-selected', 'true');
    });

    it('refresh remounts only the active tab content without reloading the browser page', async () => {
      const user = userEvent.setup();
      refreshRenderCount = 0;

      render(
        <MemoryRouter initialEntries={['/']}>
          <NebulaLayout title="Nebula Web" menuItems={menuItems} rightContent={<button type="button">Demo User</button>}>
            <Routes>
              <Route path="/" element={<RefreshProbe />} />
              <Route path="/ops" element={<h1>运维内容</h1>} />
              <Route path="/system/users" element={<h1>用户内容</h1>} />
            </Routes>
          </NebulaLayout>
        </MemoryRouter>,
      );

      expect(await screen.findByRole('heading', { name: '刷新探针 1' })).toBeInTheDocument();

      await openTabContextMenu(screen.getByRole('tab', { name: '工作台' }));
      await user.click(screen.getByRole('menuitem', { name: '刷新' }));

      expect(await screen.findByRole('heading', { name: '刷新探针 2' })).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '工作台' })).toHaveAttribute('aria-selected', 'true');
    });

    it('refreshing an inactive tab navigates to it before remounting its content', async () => {
      const user = userEvent.setup();
      refreshRenderCount = 0;

      render(
        <MemoryRouter initialEntries={['/']}>
          <NebulaLayout title="Nebula Web" menuItems={menuItems} rightContent={<button type="button">Demo User</button>}>
            <Routes>
              <Route path="/" element={<h1>工作台内容</h1>} />
              <Route path="/ops" element={<RefreshProbe />} />
              <Route path="/system/users" element={<h1>用户内容</h1>} />
            </Routes>
          </NebulaLayout>
        </MemoryRouter>,
      );

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));
      expect(await screen.findByRole('heading', { name: '刷新探针 1' })).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: '工作台' }));
      expect(screen.getByRole('main')).toHaveTextContent('工作台内容');

      await openTabContextMenu(screen.getByRole('tab', { name: '运维中心' }));
      await user.click(screen.getByRole('menuitem', { name: '刷新' }));

      expect(await screen.findByRole('heading', { name: '刷新探针 3' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '运维中心' })).toHaveAttribute('aria-selected', 'true');
    });

    it('new window action calls window.open with correct parameters', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));

      const opsTab = screen.getByRole('tab', { name: '运维中心' });
      await openTabContextMenu(opsTab);

      await user.click(screen.getByRole('menuitem', { name: '新窗口打开' }));

      expect(window.open).toHaveBeenCalledWith('/redirect/ops', '_blank', 'noopener,noreferrer');
    });
  });

  describe('tab rename', () => {
    it('double-click enables rename, Enter saves, Escape cancels', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));

      const opsTab = screen.getByRole('tab', { name: '运维中心' });
      await user.dblClick(opsTab);

      const input = screen.getByRole('textbox', { name: '重命名标签页' });
      await user.clear(input);
      await user.type(input, '自定义运维');
      await user.keyboard('{Enter}');

      expect(screen.getByRole('tab', { name: '自定义运维' })).toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: '运维中心' })).not.toBeInTheDocument();
    });

    it('double-click rename Escape cancels and restores original label', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));

      const opsTab = screen.getByRole('tab', { name: '运维中心' });
      await user.dblClick(opsTab);

      const input = screen.getByRole('textbox', { name: '重命名标签页' });
      await user.clear(input);
      await user.type(input, '临时名称');
      await user.keyboard('{Escape}');

      expect(screen.getByRole('tab', { name: '运维中心' })).toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: '临时名称' })).not.toBeInTheDocument();
    });
  });

  describe('locale switch and tab labels', () => {
    it('locale switch updates non-renamed labels but preserves renamed labels', async () => {
      const user = userEvent.setup();
      const zhMenuItems: NebulaMenuItem[] = [
        { key: '/', path: '/', name: '工作台' },
        { key: '/ops', path: '/ops', name: '运维中心' },
      ];
      const enMenuItems: NebulaMenuItem[] = [
        { key: '/', path: '/', name: 'Workspace' },
        { key: '/ops', path: '/ops', name: 'Operations' },
      ];

      const { rerender } = render(
        <MemoryRouter initialEntries={['/ops']}>
          <NebulaLayout title="Test" menuItems={zhMenuItems}>
            <Routes>
              <Route path="/" element={<h1>工作台内容</h1>} />
              <Route path="/ops" element={<h1>运维内容</h1>} />
            </Routes>
          </NebulaLayout>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: '运维中心' })).toBeInTheDocument();

      const opsTab = screen.getByRole('tab', { name: '运维中心' });
      await user.dblClick(opsTab);

      const input = screen.getByRole('textbox', { name: '重命名标签页' });
      await user.clear(input);
      await user.type(input, 'My Ops');
      await user.keyboard('{Enter}');

      expect(screen.getByRole('tab', { name: 'My Ops' })).toBeInTheDocument();

      rerender(
        <MemoryRouter initialEntries={['/ops']}>
          <NebulaLayout title="Test" menuItems={enMenuItems}>
            <Routes>
              <Route path="/" element={<h1>Workspace content</h1>} />
              <Route path="/ops" element={<h1>Operations content</h1>} />
            </Routes>
          </NebulaLayout>
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'My Ops' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Workspace' })).toBeInTheDocument();
    });
  });

  describe('tab movement removal', () => {
    it('does not render move or drag controls inside route tabs', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));

      expect(screen.queryByRole('button', { name: /拖拽|drag|移动|move/i })).not.toBeInTheDocument();
    });

    it('does not reorder tabs on mouse drag and drop', async () => {
      const user = userEvent.setup();
      renderLayout('/');

      await user.click(screen.getByRole('menuitem', { name: /运维中心/ }));

      const tabsList = screen.getByRole('tablist');
      const workspaceTab = screen.getByRole('tab', { name: '工作台' });
      const opsTab = screen.getByRole('tab', { name: '运维中心' });

      fireEvent.dragStart(opsTab);
      fireEvent.dragOver(workspaceTab);
      fireEvent.drop(workspaceTab);

      const tabs = within(tabsList).getAllByRole('tab');
      expect(tabs[0]).toHaveTextContent('工作台');
      expect(tabs[1]).toHaveTextContent('运维中心');
    });

    it('uses English aria labels for rename and context menu without reorder controls', async () => {
      const user = userEvent.setup();
      useLocaleStore.getState().setLocale('en-US');
      const englishItems: NebulaMenuItem[] = [
        { key: '/', path: '/', name: 'Workspace' },
        { key: '/ops', path: '/ops', name: 'Operations' },
      ];

      render(
        <MemoryRouter initialEntries={['/']}>
          <NebulaLayout title="Test" menuItems={englishItems}>
            <Routes>
              <Route path="/" element={<h1>Workspace content</h1>} />
              <Route path="/ops" element={<h1>Operations content</h1>} />
            </Routes>
          </NebulaLayout>
        </MemoryRouter>,
      );

      await user.click(screen.getByRole('menuitem', { name: /Operations/ }));

      const operationsTab = screen.getByRole('tab', { name: 'Operations' });
      expect(within(operationsTab).queryByRole('button', { name: /Move tab/i })).not.toBeInTheDocument();

      await openTabContextMenu(operationsTab);
      expect(screen.getByRole('menu', { name: 'Tab menu' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Refresh' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Close' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Close left' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Close right' })).toBeInTheDocument();

      await user.dblClick(operationsTab);
      expect(screen.getByRole('textbox', { name: 'Rename tab' })).toBeInTheDocument();
    });
  });
});
