import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { notifySessionExpired, resolveSessionExpired } from '@/utils/auth/session-expired';
import { RouteGuard } from './route-guard';

describe('RouteGuard', () => {
  beforeEach(() => {
    useAuthStore.getState().setUser({
      id: '1',
      name: '测试用户',
      roles: [],
      permissions: [],
    });
    useAuthStore.setState({ loading: false });
  });

  afterEach(() => {
    act(() => {
      resolveSessionExpired();
      useAuthStore.getState().clearUser();
    });
  });

  it('用户缺少权限时展示无权限内容', async () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <RouteGuard permission="system:user:list" forbiddenElement={<div>无权限</div>}>
            <div>受保护内容</div>
          </RouteGuard>
        ),
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('无权限')).toBeInTheDocument();
  });

  it('会话失效待确认时不立即跳转登录页', async () => {
    act(() => {
      notifySessionExpired();
      useAuthStore.getState().clearUser();
    });

    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <RouteGuard requiresAuth>
            <div>当前页面内容</div>
          </RouteGuard>
        ),
      },
      {
        path: '/login',
        element: <div>登录页</div>,
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('当前页面内容')).toBeInTheDocument();
    expect(screen.queryByText('登录页')).not.toBeInTheDocument();
  });

  it('未登录访问认证路由时携带当前地址跳转登录页', async () => {
    act(() => {
      useAuthStore.getState().clearUser();
    });

    const router = createMemoryRouter([
      {
        path: '/dashboard',
        element: (
          <RouteGuard requiresAuth>
            <div>Dashboard</div>
          </RouteGuard>
        ),
      },
      {
        path: '/login',
        element: <div>登录页</div>,
      },
    ], { initialEntries: ['/dashboard?tab=home#section'] });

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('登录页')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(new URLSearchParams(router.state.location.search).get('redirect')).toBe('/dashboard?tab=home#section');
  });
});
