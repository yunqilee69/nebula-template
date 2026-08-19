import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Root } from 'react-dom/client';

let mountedRoot: Root | null = null;

describe('app entry wiring', () => {
  afterEach(async () => {
    if (mountedRoot) {
      mountedRoot.unmount();
      mountedRoot = null;
    }

    cleanup();
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
    vi.resetModules();
  });

  it('exports App from the package index', async () => {
    const { App } = await import('./index');

    expect(App).toBeTypeOf('function');
  });

  it('keeps the startup shell in main.tsx instead of App.tsx', async () => {
    const { App } = await import('./main');

    expect(App).toBeTypeOf('function');
    expect(existsSync(resolve(process.cwd(), 'src/App.tsx'))).toBe(false);
  });

  it('redirects root startup to login when no token is stored', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const browserEntryPath = './index.tsx';

    const entry = (await import(/* @vite-ignore */ browserEntryPath)) as { root: Root };
    mountedRoot = entry.root;

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument();
    expect(screen.queryByText('暂无模块')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Dashboard/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(existsSync(resolve(process.cwd(), 'src/dev-app.tsx'))).toBe(false);
  });

  it('loads the Vite module entry from index.html', () => {
    const indexHtmlPath = resolve(process.cwd(), 'index.html');
    const indexHtml = readFileSync(indexHtmlPath, 'utf8');

    expect(existsSync(resolve(process.cwd(), 'src/index.tsx'))).toBe(true);
    expect(indexHtml).toContain('<script type="module" src="/src/index.tsx"></script>');
  });

  it('wires the login route with auth service fallback for Vite rendering', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    window.history.pushState({}, '', '/login');

    vi.doMock('./request/create-request-client', () => ({
      createRequestClient: () => ({
        request: async () => Promise.reject(new Error('frontend init unavailable')),
      }),
    }));

    const browserEntryPath = './index.tsx';
    const entry = (await import(/* @vite-ignore */ browserEntryPath)) as { root: Root };
    mountedRoot = entry.root;

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });
  });

  it('does not request /api/auth/current-user on /login when no tokens are stored', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    window.history.pushState({}, '', '/login');

    const requestedUrls: string[] = [];

    vi.doMock('./request/create-request-client', () => ({
      createRequestClient: () => ({
        request: async (config: { url?: string }): Promise<unknown> => {
          if (config.url) {
            requestedUrls.push(config.url);
          }
          return Promise.reject(new Error('no backend'));
        },
      }),
    }));

    const browserEntryPath = './index.tsx';
    const entry = (await import(/* @vite-ignore */ browserEntryPath)) as { root: Root };
    mountedRoot = entry.root;

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    expect(requestedUrls).not.toContain('/api/auth/current-user');
  });

  it('renders the requested route after login redirects into the authenticated layout', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    window.history.pushState({}, '', '/login?redirect=%2Fprofile%2Finfo');

    vi.doMock('./request/create-request-client', () => ({
      createRequestClient: () => ({
        request: async (config: { url?: string }): Promise<unknown> => {
          switch (config.url) {
            case '/api/frontend/init':
              return {
                loginConfig: {
                  usernameEnabled: true,
                  phoneEnabled: false,
                  emailEnabled: false,
                  githubEnabled: false,
                },
              };
            case '/api/auth/login':
              return {
                accessToken: 'login-access-token',
                refreshToken: 'login-refresh-token',
                accessTokenExpiresIn: 3600,
                refreshTokenExpiresIn: 86400,
              };
            case '/api/auth/current-user':
              return {
                id: 'admin',
                username: 'admin',
                nickname: 'Administrator',
                roleCodeList: ['ADMIN'],
                permissionCodeList: ['MENU:dashboard:Allow'],
                orgCodeList: ['ROOT'],
                menuList: [
                  {
                    id: 'dashboard-menu',
                    code: 'dashboard',
                    name: 'Dashboard',
                    path: '/dashboard',
                    component: 'DashboardPage',
                    status: 1,
                    sort: 0,
                  },
                ],
              };
            case '/api/notify/announcements/current/popup':
              return [];
            case '/api/auth/profile':
              return {
                id: 'admin',
                username: 'admin',
                nickname: 'Administrator',
                email: 'admin@example.com',
                phone: '13800000000',
                status: 1,
              };
            case '/api/auth/profile/oauth2/bindings':
              return { providers: [] };
            case '/api/auth/profile/login-records/page':
              return { data: [], total: 0 };
            default:
              return undefined;
          }
        },
      }),
    }));

    const browserEntryPath = './index.tsx';
    const entry = (await import(/* @vite-ignore */ browserEntryPath)) as { root: Root };
    mountedRoot = entry.root;

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/profile/info');
    });
    expect(await screen.findByText('基本资料')).toBeInTheDocument();
    const profileTab = await screen.findByRole('tab', { name: '个人信息' });
    expect(profileTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByText('Operations Overview')).not.toBeInTheDocument();
  });

  it('renders auth management pages with menu items and route headings', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    window.history.pushState({}, '', '/auth/user');

    vi.doMock('./request/create-request-client', () => ({
      createRequestClient: () => ({
        request: async (config: { url?: string }): Promise<unknown> => {
          switch (config.url) {
            case '/api/notify/announcements/current/popup':
              return [];
            case '/api/auth/users/page':
              return { data: [], total: 0 };
            case '/api/auth/roles/list':
            case '/api/auth/orgs/list':
              return [];
            default:
              return undefined;
          }
        },
      }),
    }));

    const { useAuthStore } = await import('./stores/auth-store');

    const originalRefreshUser = useAuthStore.getState().refreshUser;
    useAuthStore.setState({
      user: {
        id: 'test',
        name: 'Test',
        roles: [],
        permissions: [],
        menuList: [
          {
            id: 'auth-user',
            code: 'auth-user',
            name: '用户管理',
            path: '/auth/user',
            component: 'UserManagementPage',
            status: 1,
          },
          {
            id: 'auth-org',
            code: 'auth-org',
            name: '组织管理',
            path: '/auth/org',
            component: 'OrgManagementPage',
            status: 1,
          },
        ],
      },
      loading: false,
      refreshUser: async () => {},
    });

    const browserEntryPath = './index.tsx';
    const entry = (await import(/* @vite-ignore */ browserEntryPath)) as { root: Root };
    mountedRoot = entry.root;

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: /用户管理/ })).toHaveClass('ant-menu-item-selected');
    expect(screen.getByRole('menuitem', { name: /组织管理/ })).toBeInTheDocument();

    useAuthStore.setState({ refreshUser: originalRefreshUser });
  });

  it('uses backend current-user menus without adding a static startup dashboard menu', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    window.history.pushState({}, '', '/');
    localStorage.setItem('nebula-web.access-token', 'test-token');
    localStorage.setItem('nebula-web.refresh-token', 'test-refresh-token');

    vi.doMock('./request/create-request-client', () => ({
      createRequestClient: () => ({
        request: async (config: { url?: string }): Promise<unknown> => {
          switch (config.url) {
            case '/api/notify/announcements/current/popup':
              return [];
            case '/api/auth/current-user':
              return {
                id: 'admin',
                username: 'admin',
                nickname: 'Administrator',
                roleCodeList: ['ADMIN'],
                permissionCodeList: ['MENU:operations-user:Allow'],
                orgCodeList: ['ROOT'],
                menuList: [
                  {
                    id: 'backend-dashboard',
                    code: 'backend-dashboard',
                    name: '后端看板',
                    path: '/dashboard',
                    component: 'DashboardPage',
                    status: 1,
                    sort: 0,
                  },
                  {
                    id: 'operations',
                    code: 'operations-config',
                    name: '运营配置',
                    path: '/operations',
                    type: 'CATALOG',
                    status: 1,
                    sort: 1,
                    children: [
                      {
                        id: 'operations-user',
                        parentId: 'operations',
                        code: 'operations-user',
                        name: '后端用户管理',
                        path: '/operations/user',
                        component: 'UserManagementPage',
                        status: 1,
                      },
                    ],
                  },
                ],
              };
            case '/api/auth/users/page':
              return { data: [], total: 0 };
            case '/api/auth/roles/list':
            case '/api/auth/orgs/list':
              return [];
            default:
              return undefined;
          }
        },
      }),
    }));

    const browserEntryPath = './index.tsx';
    const entry = (await import(/* @vite-ignore */ browserEntryPath)) as { root: Root };
    mountedRoot = entry.root;

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /后端看板/ })).toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: /运营配置/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^Dashboard$/ })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '后端看板' })).toHaveAttribute('aria-selected', 'true');
    });

    localStorage.removeItem('nebula-web.access-token');
    localStorage.removeItem('nebula-web.refresh-token');
  });
});
