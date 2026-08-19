import { createBrowserRouter, Navigate, Outlet, useLocation, type RouteObject } from 'react-router-dom';
import { EmptyModule } from '@/layouts/empty-module';
import { ExceptionResult } from '@/layouts/exception-result';
import { NebulaLayout } from '@/layouts/nebula-layout';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { GitHubCallbackPage } from '@/pages/login/github-callback';
import { LoginPage } from '@/pages/login';
import { NotificationInboxPage } from '@/pages/notify/inbox';
import { ProfileBindCallbackPage } from '@/pages/profile/bind-callback';
import { ProfileInfoPage } from '@/pages/profile/info';
import { RegisterPage } from '@/pages/register';
import { buildMenuRoutes } from './build-menu-routes';
import { RouteGuard } from './route-guard';
import type { CreateNebulaRouterOptions, NebulaRouteObject } from './types';

const authPagePaths = new Set(['/login', '/login/github-callback', '/profile/bind-callback', '/register', '/forgot-password']);
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
    builtInLayoutRoutes.push({ path: '/profile/info', element: <ProfileInfoPage /> });
  }
  if (!sourceRoutePaths.has('/notify/inbox')) {
    builtInLayoutRoutes.push({ path: '/notify/inbox', element: <NotificationInboxPage /> });
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
