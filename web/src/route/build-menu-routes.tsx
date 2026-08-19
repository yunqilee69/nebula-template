import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import { EmptyModule } from '@/layouts/empty-module';
import { ExternalIframePage } from '@/layouts/external-iframe-page';
import { resolveNebulaIcon } from '@/utils/icons';
import { createPermissionCode } from '@/utils/permissions';
import { RouteGuard } from './route-guard';
import { RouteLoading } from './route-loading';
import type { BackendMenuItem, BuildMenuRoutesOptions, MenuBuildResult, NebulaMenuItem } from './types';

const DEFAULT_MAX_DEPTH = 3;

function sortMenus(items: BackendMenuItem[]): BackendMenuItem[] {
  return [...items].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

function isEnabled(item: BackendMenuItem): boolean {
  return item.status === undefined || item.status === 1;
}

function isExternalMenu(item: BackendMenuItem): boolean {
  return item.type === 'EXTERNAL' || item.externalFlag === true;
}

function createMenuKey(item: BackendMenuItem): string {
  return item.id || item.path || item.code;
}

function toNebulaMenuItem(item: BackendMenuItem, iconNode?: ReactNode, children?: NebulaMenuItem[]): NebulaMenuItem {
  return {
    ...item,
    key: createMenuKey(item),
    iconNode,
    children: children?.length ? children : undefined,
  };
}

function createRouteElement(item: BackendMenuItem, options: BuildMenuRoutesOptions): ReactNode {
  if (isExternalMenu(item)) {
    return <ExternalIframePage title={item.name} src={item.externalUrl ?? ''} />;
  }

  if (!item.component) {
    return <EmptyModule />;
  }

  const registration = options.componentRegistry[item.component];
  if (!registration) {
    return <EmptyModule />;
  }

  const LazyComponent = lazy(registration.loader);
  return (
    <Suspense fallback={<RouteLoading />}>
      <LazyComponent />
    </Suspense>
  );
}

function hasRouteTarget(item: BackendMenuItem): boolean {
  return Boolean(item.path && (item.component || isExternalMenu(item)));
}

function getMenuPermission(item: BackendMenuItem): string | undefined {
  return item.permissionCode ?? (item.code ? createPermissionCode('MENU', item.code) : undefined);
}

function walkMenus(
  items: BackendMenuItem[],
  options: BuildMenuRoutesOptions,
  depth: number,
  sidebarItems: NebulaMenuItem[],
  routeObjects: RouteObject[],
): void {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (depth > maxDepth) {
    return;
  }

  for (const item of sortMenus(items)) {
    if (!isEnabled(item)) {
      continue;
    }

    const childSidebarItems: NebulaMenuItem[] = [];
    walkMenus(item.children ?? [], options, depth + 1, childSidebarItems, routeObjects);

    if (!item.hidden) {
      sidebarItems.push(toNebulaMenuItem(item, resolveNebulaIcon(item.icon, options.iconMap), childSidebarItems));
    }

    if (hasRouteTarget(item)) {
      routeObjects.push({
        path: item.path,
        element: <RouteGuard requiresAuth permission={getMenuPermission(item)}>{createRouteElement(item, options)}</RouteGuard>,
      });
    }
  }
}

function buildLayoutMenuItems(
  items: BackendMenuItem[],
  options: BuildMenuRoutesOptions,
  depth: number,
): NebulaMenuItem[] {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (depth > maxDepth) {
    return [];
  }

  return sortMenus(items).flatMap((item) => {
    if (!isEnabled(item)) {
      return [];
    }

    const children = buildLayoutMenuItems(item.children ?? [], options, depth + 1);
    return [toNebulaMenuItem(item, resolveNebulaIcon(item.icon, options.iconMap), children)];
  });
}

export function buildMenuRoutes(options: BuildMenuRoutesOptions): MenuBuildResult {
  const layoutMenuItems = buildLayoutMenuItems(options.backendMenus, options, 1);
  const sidebarMenuItems: NebulaMenuItem[] = [];
  const routeObjects: RouteObject[] = [];

  walkMenus(options.backendMenus, options, 1, sidebarMenuItems, routeObjects);

  return { layoutMenuItems, sidebarMenuItems, routeObjects };
}
