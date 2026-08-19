import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { createNebulaRouter } from './create-nebula-router';
import type { BackendMenuItem, MenuComponentRegistry } from './types';

vi.mock('@/request/create-request-client', () => ({
  createRequestClient: () => ({
    request: async (config: { url: string }) => {
      if (config.url === '/api/frontend/init') return { loginConfig: {} };
      if (config.url === '/api/notify/announcements/current/popup') return [];
      if (config.url === '/api/auth/profile') return { id: 'user-1', username: 'yunqi', nickname: '云起', status: 1 };
      if (config.url === '/api/auth/profile/oauth2/bindings') return { providers: [] };
      if (config.url === '/api/auth/profile/login-records/page') return { data: [], total: 0 };
      return undefined;
    },
  }),
}));

function RuntimeUsersPage() {
  return <h1>Runtime users page</h1>;
}

function ExplicitSettingsPage() {
  return <h1>Explicit settings page</h1>;
}

function ExplicitUsersPage() {
  return <h1>Explicit users page</h1>;
}

function StaticReportsPage() {
  return <h1>Static reports page</h1>;
}

const componentRegistry: MenuComponentRegistry = {
  'system/user': {
    component: 'system/user',
    defaultName: 'Default Users',
    defaultPath: '/default/users',
    defaultCode: 'default:users',
    loader: () => Promise.resolve({ default: RuntimeUsersPage }),
  },
};

const backendMenus: BackendMenuItem[] = [
  {
    id: 'users',
    code: 'runtime:users',
    name: '运行时用户',
    path: '/runtime/users',
    component: 'system/user',
    status: 1,
  },
  {
    id: 'hidden-users',
    code: 'runtime:hidden-users',
    name: '隐藏用户入口',
    path: '/runtime/hidden-users',
    component: 'system/user',
    hidden: true,
    status: 1,
  },
  {
    id: 'external-docs',
    code: 'runtime:external-docs',
    name: '外部文档',
    path: '/runtime/docs',
    externalFlag: true,
    externalUrl: 'https://example.com/docs',
    status: 1,
  },
];

function authenticateTestUser() {
  useAuthStore.getState().setUser({
    id: 'test-user',
    name: 'Test User',
    roles: ['ADMIN'],
    permissions: [],
  });
  useAuthStore.setState({ loading: false });
}

function renderWithAnonymousAuth(router: ReturnType<typeof createNebulaRouter>) {
  useAuthStore.getState().clearUser();
  return render(<RouterProvider router={router} />);
}

describe('createNebulaRouter backend menus', () => {
  beforeEach(() => {
    authenticateTestUser();
  });

  afterEach(() => {
    useAuthStore.getState().clearUser();
    window.history.pushState({}, '', '/');
  });

  it('renders routes and sidebar menus from backend menus and the component registry', async () => {
    authenticateTestUser();
    window.history.pushState({}, '', '/runtime/users');

    const router = createNebulaRouter({ routes: [], backendMenus, componentRegistry });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Runtime users page' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /运行时用户/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '运行时用户' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps hidden backend menu routes accessible without showing them in the sidebar', async () => {
    authenticateTestUser();
    window.history.pushState({}, '', '/runtime/hidden-users');

    const router = createNebulaRouter({ routes: [], backendMenus, componentRegistry });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Runtime users page' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /隐藏用户入口/ })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '隐藏用户入口' })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders external backend menus as iframe pages', async () => {
    authenticateTestUser();
    window.history.pushState({}, '', '/runtime/docs');

    const router = createNebulaRouter({ routes: [], backendMenus, componentRegistry });
    render(<RouterProvider router={router} />);

    const titledElements = await screen.findAllByTitle('外部文档');
    const iframe = titledElements.find((element) => element.tagName === 'IFRAME');

    expect(iframe).toHaveAttribute('src', 'https://example.com/docs');
  });

  it('preserves explicit non-menu routes when backend menus are provided', async () => {
    window.history.pushState({}, '', '/settings');

    const router = createNebulaRouter({
      routes: [{ path: '/settings', element: <ExplicitSettingsPage /> }],
      backendMenus,
      componentRegistry,
    });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Explicit settings page' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
  });

  it('renders both static menu items and backend menu items when both sources are provided', async () => {
    window.history.pushState({}, '', '/reports');

    const router = createNebulaRouter({
      routes: [{ path: '/reports', element: <StaticReportsPage /> }],
      menuItems: [{ key: 'reports', path: '/reports', name: 'Reports' }],
      backendMenus,
      componentRegistry,
    });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Static reports page' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Reports/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /运行时用户/ })).toBeInTheDocument();
  });

  it('uses the first backend route as the default page at the layout root', async () => {
    authenticateTestUser();
    window.history.pushState({}, '', '/');

    const router = createNebulaRouter({ routes: [], backendMenus, componentRegistry });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Runtime users page' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '运行时用户' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens redirect-prefixed routes as the matching application route', async () => {
    authenticateTestUser();
    window.history.pushState({}, '', '/redirect/runtime/users');

    const router = createNebulaRouter({ routes: [], backendMenus, componentRegistry });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Runtime users page' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/runtime/users');
  });

  it('renders the empty module at the layout root when no backend menu has a usable page', async () => {
    window.history.pushState({}, '', '/');

    const router = createNebulaRouter({
      routes: [],
      backendMenus: [
        {
          id: 'disabled-dashboard',
          code: 'disabled-dashboard',
          name: '禁用看板',
          path: '/dashboard',
          component: 'system/user',
          status: 0,
        },
        {
          id: 'catalog-only',
          code: 'catalog-only',
          name: '目录',
          path: '/catalog',
          status: 1,
        },
      ],
      componentRegistry,
    });
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('暂无模块')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Runtime users page' })).not.toBeInTheDocument();
  });

  it('redirects unauthenticated root navigation to login before rendering the layout fallback', async () => {
    useAuthStore.getState().clearUser();
    window.history.pushState({}, '', '/');

    const router = createNebulaRouter({ routes: [], menuItems: [] });
    renderWithAnonymousAuth(router);

    expect(await screen.findByText('暂无可用登录方式')).toBeInTheDocument();
    expect(screen.queryByText('暂无模块')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument();
  });

  it('redirects unauthenticated profile info navigation to login before rendering the profile page', async () => {
    useAuthStore.getState().clearUser();
    window.history.pushState({}, '', '/profile/info');

    const router = createNebulaRouter({ routes: [], menuItems: [] });
    renderWithAnonymousAuth(router);

    expect(await screen.findByText('暂无可用登录方式')).toBeInTheDocument();
    expect(screen.queryByText('基本资料')).not.toBeInTheDocument();
    expect(screen.queryByText('第三方账号绑定')).not.toBeInTheDocument();
  });

  it('includes the built-in profile info route without adding it to the sidebar', async () => {
    window.history.pushState({}, '', '/profile/info');

    const router = createNebulaRouter({ routes: [], menuItems: [] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('基本资料')).toBeInTheDocument();
    expect(screen.getByText('第三方账号绑定')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /个人信息/ })).not.toBeInTheDocument();
  });

  it('renders the built-in login route as a full page outside the dashboard layout', async () => {
    window.history.pushState({}, '', '/login');

    const router = createNebulaRouter({ routes: [], menuItems: [] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('暂无可用登录方式')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /登录/ })).not.toBeInTheDocument();
  });

  it('renders the built-in GitHub callback route as an unauthenticated full page', async () => {
    window.history.pushState({}, '', '/login/github-callback?error=expired_state');

    const router = createNebulaRouter({ routes: [], menuItems: [] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('GitHub 登录已过期，请重新发起登录。')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument();
    expect(screen.queryByText('页面不存在')).not.toBeInTheDocument();
  });

  it('renders the built-in register route as a full page outside the dashboard layout', async () => {
    window.history.pushState({}, '', '/register');

    const router = createNebulaRouter({ routes: [], menuItems: [] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('注册功能未启用')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /注册/ })).not.toBeInTheDocument();
  });

  it('keeps explicit route behavior when a backend menu path collides with an explicit route', async () => {
    window.history.pushState({}, '', '/runtime/users');

    const router = createNebulaRouter({
      routes: [{ path: '/runtime/users', element: <ExplicitUsersPage /> }],
      backendMenus,
      componentRegistry,
    });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Explicit users page' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Runtime users page' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: /运行时用户/ })).toBeInTheDocument();
  });

  it('redirects unauthenticated direct navigation to missing menu routes before showing 404', async () => {
    useAuthStore.getState().clearUser();
    window.history.pushState({}, '', '/operations/user');

    const router = createNebulaRouter({ routes: [], menuItems: [] });
    renderWithAnonymousAuth(router);

    expect(await screen.findByText('暂无可用登录方式')).toBeInTheDocument();
    expect(screen.queryByText('页面不存在')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated direct navigation to backend menu routes instead of rendering them', async () => {
    useAuthStore.getState().clearUser();
    window.history.pushState({}, '', '/runtime/users');

    const router = createNebulaRouter({ routes: [], backendMenus, componentRegistry });
    renderWithAnonymousAuth(router);

    expect(await screen.findByText('暂无可用登录方式')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Runtime users page' })).not.toBeInTheDocument();
  });
});
