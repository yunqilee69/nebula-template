import { isValidElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/auth-store';
import { buildMenuRoutes } from './build-menu-routes';
import type { BackendMenuItem, MenuComponentRegistry } from './types';

function UsersPage() {
  return <h1>Users module</h1>;
}

function HiddenDetailPage() {
  return <h1>Hidden detail</h1>;
}

const registry: MenuComponentRegistry = {
  'system/user': {
    component: 'system/user',
    defaultName: 'Default Users',
    defaultPath: '/default/users',
    defaultCode: 'default:users',
    defaultIcon: 'user',
    loader: () => Promise.resolve({ default: UsersPage }),
  },
  'system/user-detail': {
    component: 'system/user-detail',
    defaultName: 'Default Detail',
    defaultPath: '/default/detail',
    defaultCode: 'default:detail',
    loader: () => Promise.resolve({ default: HiddenDetailPage }),
  },
};

const backendMenus: BackendMenuItem[] = [
  {
    id: 'system',
    code: 'runtime:system',
    name: '系统管理',
    path: '/runtime-system',
    sort: 2,
    status: 1,
    children: [
      {
        id: 'user',
        parentId: 'system',
        code: 'runtime:user',
        name: '运行时用户',
        path: '/runtime/users',
        component: 'system/user',
        icon: 'user',
        sort: 1,
        status: 1,
      },
      {
        id: 'detail',
        parentId: 'system',
        code: 'runtime:user-detail',
        name: '用户详情',
        path: '/runtime/users/detail',
        component: 'system/user-detail',
        hidden: true,
        sort: 2,
        status: 1,
      },
    ],
  },
  {
    id: 'disabled',
    code: 'runtime:disabled',
    name: '禁用菜单',
    path: '/runtime/disabled',
    component: 'system/user',
    sort: 1,
    status: 0,
  },
  {
    id: 'external',
    code: 'runtime:external',
    name: '外部系统',
    path: '/runtime/external',
    type: 'EXTERNAL',
    externalUrl: 'https://example.com/app',
    sort: 3,
    status: 1,
  },
  {
    id: 'too-deep-1',
    code: 'runtime:deep1',
    name: '一级',
    path: '/deep-1',
    status: 1,
    sort: 4,
    children: [
      {
        id: 'too-deep-2',
        code: 'runtime:deep2',
        name: '二级',
        path: '/deep-2',
        status: 1,
        children: [
          {
            id: 'too-deep-3',
            code: 'runtime:deep3',
            name: '三级',
            path: '/deep-3',
            status: 1,
            children: [
              {
                id: 'too-deep-4',
                code: 'runtime:deep4',
                name: '四级',
                path: '/deep-4',
                component: 'system/user',
                status: 1,
              },
            ],
          },
        ],
      },
    ],
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

describe('buildMenuRoutes', () => {
  beforeEach(() => {
    authenticateTestUser();
  });

  afterEach(() => {
    useAuthStore.getState().clearUser();
  });

  it('uses backend menu fields as runtime source of truth and registry only for component loaders', () => {
    const result = buildMenuRoutes({ backendMenus, componentRegistry: registry });

    expect(result.sidebarMenuItems[0]?.name).toBe('系统管理');
    expect(result.sidebarMenuItems[0]?.path).toBe('/runtime-system');
    expect(result.sidebarMenuItems[0]?.code).toBe('runtime:system');
    expect(result.sidebarMenuItems[0]?.children?.[0]).toMatchObject({
      name: '运行时用户',
      path: '/runtime/users',
      code: 'runtime:user',
      component: 'system/user',
    });
  });

  it('keeps hidden menus out of the sidebar while still generating accessible routes', () => {
    const result = buildMenuRoutes({ backendMenus, componentRegistry: registry });

    expect(result.layoutMenuItems[0]?.children?.map((item) => item.name)).toEqual(['运行时用户', '用户详情']);
    expect(result.sidebarMenuItems[0]?.children?.map((item) => item.name)).toEqual(['运行时用户']);
    expect(result.routeObjects.some((route) => route.path === '/runtime/users/detail')).toBe(true);
  });

  it('filters disabled menus and ignores menus deeper than level three', () => {
    const result = buildMenuRoutes({ backendMenus, componentRegistry: registry });
    const sidebarNames = JSON.stringify(result.sidebarMenuItems);
    const routePaths = result.routeObjects.map((route) => route.path);

    expect(sidebarNames).not.toContain('禁用菜单');
    expect(routePaths).not.toContain('/runtime/disabled');
    expect(sidebarNames).not.toContain('四级');
    expect(routePaths).not.toContain('/deep-4');
  });

  it('renders external menus as iframe routes inside the business content area', () => {
    const result = buildMenuRoutes({ backendMenus, componentRegistry: registry });
    const externalRoute = result.routeObjects.find((route) => route.path === '/runtime/external');

    render(
      <MemoryRouter initialEntries={['/runtime/external']}>
        <Routes>
          <Route path="/runtime/external" element={externalRoute?.element} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTitle('外部系统')).toHaveAttribute('src', 'https://example.com/app');
  });

  it('renders an empty iframe src when an external menu has no externalUrl', () => {
    const result = buildMenuRoutes({
      backendMenus: [
        {
          id: 'external-missing-url',
          code: 'runtime:external-missing-url',
          name: '空外链',
          path: '/runtime/empty-external',
          type: 'EXTERNAL',
          status: 1,
        },
      ],
      componentRegistry: registry,
    });
    const externalRoute = result.routeObjects.find((route) => route.path === '/runtime/empty-external');

    render(
      <MemoryRouter initialEntries={['/runtime/empty-external']}>
        <Routes>
          <Route path="/runtime/empty-external" element={externalRoute?.element} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTitle('空外链')).toHaveAttribute('src', '');
  });

  it('resolves known backend icon keys from the built-in Nebula icon map', () => {
    const result = buildMenuRoutes({ backendMenus, componentRegistry: registry });

    expect(isValidElement(result.sidebarMenuItems[0]?.children?.[0]?.iconNode)).toBe(true);
  });

  it('uses consumer iconMap entries for non-local keys before Ant Design fallback', () => {
    const customSettingIcon = <span data-testid="custom-setting-icon" />;
    const menusWithAntIconKey: BackendMenuItem[] = [
      {
        id: 'settings',
        code: 'runtime:settings',
        name: '设置',
        path: '/runtime/settings',
        component: 'system/user',
        icon: 'SettingOutlined',
        status: 1,
      },
    ];
    const result = buildMenuRoutes({
      backendMenus: menusWithAntIconKey,
      componentRegistry: registry,
      iconMap: { SettingOutlined: customSettingIcon },
    });

    expect(result.sidebarMenuItems[0]?.iconNode).toBe(customSettingIcon);
  });
});
