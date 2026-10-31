import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation, type RouteObject } from 'react-router-dom';
import { EmptyModule } from '@/layouts/empty-module';
import { ExceptionResult } from '@/layouts/exception-result';
import { NebulaLayout } from '@/layouts/nebula-layout';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { TenantOAuthProvidersPage } from '@/pages/tenant/settings/oauth-providers';
import { BindingPage } from '@/pages/login/binding';
import { GitHubCallbackPage } from '@/pages/login/github-callback';
import { LoginPage } from '@/pages/login';
import { AcceptInvitationPage } from '@/pages/invitations/accept';
import { ProfileBindCallbackPage } from '@/pages/profile/bind-callback';
import { RegisterPage } from '@/pages/register';
import { buildMenuRoutes } from './build-menu-routes';
import { RouteGuard } from './route-guard';
import { RouteLoading } from './route-loading';
import type { CreateNebulaRouterOptions, NebulaRouteObject } from './types';

// 内置个人中心/通知中心页面同样按需加载，避免它们的重型依赖进入首屏包。
const LazyProfileInfoPage = lazy(() =>
  import('@/pages/profile/info').then((module) => ({ default: module.ProfileInfoPage })),
);
const LazyNotificationInboxPage = lazy(() =>
  import('@/pages/notify/inbox').then((module) => ({ default: module.NotificationInboxPage })),
);

const authPagePaths = new Set([
  '/login',
  '/login/binding',
  '/login/github-callback',
  '/invitations/accept',
  '/profile/bind-callback',
  '/register',
  '/forgot-password',
]);
const redirectPathPrefix = '/redirect';

function RedirectRoute() {
  const location = useLocation();
  const pathname = location.pathname.slice(redirectPathPrefix.length);
  const targetPathname = pathname.startsWith('/') && pathname.length > 0 ? pathname : '/';

  return <Navigate to={`${targetPathname}${location.search}${location.hash}`} replace />;
}

function wrapRoute(route: NebulaRouteObject): RouteObject {
  const { children, element, permission, requiresAuth, index, ...rest } = route;
  const routeElement = element ?? <Outlet />;
  const guardedElement = requiresAuth || permission
    ? <RouteGuard requiresAuth={requiresAuth} permission={permission}>{routeElement}</RouteGuard>
    : routeElement;

  if (index) {
    return { index: true, ...rest, element: guardedElement };
  }

  return {
    ...rest,
    element: guardedElement,
    children: children?.map(wrapRoute),
  };
}

function collectRoutePaths(routes: RouteObject[], paths = new Set<string>()): Set<string> {
  for (const route of routes) {
    if (typeof route.path === 'string') {
      paths.add(route.path);
    }
    collectRoutePaths(route.children ?? [], paths);
  }
  return paths;
}

function hasIndexRoute(routes: RouteObject[]): boolean {
  return routes.some((route) => route.index);
}

function findDefaultBackendPath(routes: RouteObject[]): string | undefined {
  return routes.find((route) => typeof route.path === 'string')?.path;
}

export function createNebulaRouter(options: CreateNebulaRouterOptions) {
  const explicitRoutes = options.routes.map(wrapRoute);
  const builtMenu = options.backendMenus && options.componentRegistry
    ? buildMenuRoutes({
        backendMenus: options.backendMenus,
        componentRegistry: options.componentRegistry,
        iconMap: options.iconMap,
      })
    : null;

  const explicitRoutePaths = collectRoutePaths(explicitRoutes);
  const backendRoutes = builtMenu?.routeObjects.filter(
    (route) => typeof route.path !== 'string' || !explicitRoutePaths.has(route.path),
  ) ?? [];
  const defaultBackendPath = builtMenu ? findDefaultBackendPath(builtMenu.routeObjects) : undefined;
  const sourceRoutes = [...explicitRoutes, ...backendRoutes];
  const sourceRoutePaths = collectRoutePaths(sourceRoutes);
  const notFoundElement = options.notFoundElement ?? <ExceptionResult status="404" subTitle="页面不存在" />;
  const builtInAuthRoutes: RouteObject[] = [];
  const builtInLayoutRoutes: RouteObject[] = [];
  if (!sourceRoutePaths.has('/login')) {
    builtInAuthRoutes.push({ path: '/login', element: <LoginPage /> });
  }
  if (!sourceRoutePaths.has('/login/binding')) {
    builtInAuthRoutes.push({ path: '/login/binding', element: <BindingPage /> });
  }
  if (!sourceRoutePaths.has('/invitations/accept')) {
    builtInAuthRoutes.push({ path: '/invitations/accept', element: <AcceptInvitationPage /> });
  }
  if (!sourceRoutePaths.has('/login/github-callback')) {
    builtInAuthRoutes.push({ path: '/login/github-callback', element: <GitHubCallbackPage /> });
  }
  if (!sourceRoutePaths.has('/profile/bind-callback')) {
    builtInAuthRoutes.push({ path: '/profile/bind-callback', element: <ProfileBindCallbackPage /> });
  }
  if (!sourceRoutePaths.has('/register')) {
    builtInAuthRoutes.push({ path: '/register', element: <RegisterPage /> });
  }
  if (!sourceRoutePaths.has('/forgot-password')) {
    builtInAuthRoutes.push({ path: '/forgot-password', element: <ForgotPasswordPage /> });
  }
  if (!sourceRoutePaths.has('/profile/info')) {
    builtInLayoutRoutes.push({
      path: '/profile/info',
      element: (
        <Suspense fallback={<RouteLoading />}>
          <LazyProfileInfoPage />
        </Suspense>
      ),
    });
  }
  if (!sourceRoutePaths.has('/tenant/settings/oauth-providers')) {
    builtInLayoutRoutes.push({
      path: '/tenant/settings/oauth-providers',
      element: <TenantOAuthProvidersPage />,
    });
  }
  if (!sourceRoutePaths.has('/notify/inbox')) {
    builtInLayoutRoutes.push({
      path: '/notify/inbox',
      element: (
        <Suspense fallback={<RouteLoading />}>
          <LazyNotificationInboxPage />
        </Suspense>
      ),
    });
  }
  // 个人中心与平台管理入口曾使用 /account、/platform 前缀，保留旧链接跳转。
  const legacyRedirects: Array<{ path: string; to: string }> = [
    { path: '/account', to: '/profile/info?tab=platform' },
    { path: '/account/profile', to: '/profile/info?tab=platform' },
    { path: '/account/security', to: '/profile/info?tab=platform' },
    { path: '/account/tenants', to: '/profile/info?tab=platform' },
    { path: '/account/tenant-management', to: '/tenant-config/tenant' },
    { path: '/platform', to: '/tenant-config/tenant' },
    { path: '/platform/settings', to: '/tenant-config/tenant' },
    { path: '/platform/users', to: '/tenant-config/person' },
  ];
  for (const redirect of legacyRedirects) {
    if (!sourceRoutePaths.has(redirect.path)) {
      builtInLayoutRoutes.push({ path: redirect.path, element: <Navigate to={redirect.to} replace /> });
    }
  }
  const fullPageRoutes = sourceRoutes.filter((route) => typeof route.path === 'string' && authPagePaths.has(route.path));
  const layoutSourceRoutes = sourceRoutes.filter((route) => typeof route.path !== 'string' || !authPagePaths.has(route.path));
  const childRoutes = layoutSourceRoutes.length > 0
    ? [
        ...(!hasIndexRoute(layoutSourceRoutes) && defaultBackendPath
          ? [{ index: true, element: <Navigate to={defaultBackendPath} replace /> } satisfies RouteObject]
          : []),
        ...layoutSourceRoutes,
        ...builtInLayoutRoutes,
      ]
    : [{ index: true, element: options.emptyElement ?? <EmptyModule /> }, ...builtInLayoutRoutes];
  if (!sourceRoutePaths.has('*')) {
    childRoutes.push({
      path: '*',
      element: <RouteGuard requiresAuth>{notFoundElement}</RouteGuard>,
    });
  }
  const menuItems = builtMenu ? [...(options.menuItems ?? []), ...builtMenu.layoutMenuItems] : options.menuItems;

  return createBrowserRouter([
    ...fullPageRoutes,
    ...builtInAuthRoutes,
    { path: '/redirect/*', element: <RedirectRoute /> },
    {
      path: '/',
      element: (
        <RouteGuard requiresAuth>
          <NebulaLayout menuItems={menuItems} />
        </RouteGuard>
      ),
      children: childRoutes,
    },
  ]);
}
