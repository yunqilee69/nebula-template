import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';
import type { PermissionRequirement } from '@/utils/permissions';

export interface BackendMenuItem {
  id: string;
  parentId?: string;
  code: string;
  permissionCode?: string;
  name: string;
  path: string;
  icon?: string;
  component?: string;
  type?: string;
  sort?: number;
  status?: number;
  hidden?: boolean;
  externalFlag?: boolean;
  externalUrl?: string;
  visibleInBreadcrumb?: boolean;
  visibleInTab?: boolean;
  activeMenuPath?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
  children?: BackendMenuItem[];
}

export interface MenuComponentRegistration {
  component: string;
  defaultName?: string;
  defaultPath?: string;
  defaultCode?: string;
  defaultIcon?: string;
  loader: () => Promise<{ default: React.ComponentType }>;
}

export type MenuComponentRegistry = Record<string, MenuComponentRegistration>;

export interface NebulaMenuItem extends Omit<Partial<BackendMenuItem>, 'children' | 'icon'> {
  key: string;
  path: string;
  name: string;
  code?: string;
  icon?: string | ReactNode;
  iconNode?: ReactNode;
  children?: NebulaMenuItem[];
}

export interface MenuBuildResult {
  layoutMenuItems: NebulaMenuItem[];
  sidebarMenuItems: NebulaMenuItem[];
  routeObjects: RouteObject[];
}

export interface BuildMenuRoutesOptions {
  backendMenus: BackendMenuItem[];
  componentRegistry: MenuComponentRegistry;
  iconMap?: Record<string, ReactNode>;
  maxDepth?: number;
}

export interface NebulaRouteObject extends Omit<RouteObject, 'children'> {
  name?: string;
  permission?: PermissionRequirement;
  requiresAuth?: boolean;
  children?: NebulaRouteObject[];
}

export interface CreateNebulaRouterOptions {
  routes: NebulaRouteObject[];
  menuItems?: NebulaMenuItem[];
  backendMenus?: BackendMenuItem[];
  componentRegistry?: MenuComponentRegistry;
  iconMap?: Record<string, ReactNode>;
  emptyElement?: ReactNode;
  forbiddenElement?: ReactNode;
  notFoundElement?: ReactNode;
}
