import type { MenuTreeResp } from '../../../packages/client-sdk/index.ts';

/** 菜单种类。 */
export type MenuKind = 'CATALOG' | 'MENU' | 'IFRAME' | 'EXTERNAL' | 'UNKNOWN';

/** 移动端路由（一条菜单叶子对应一条路由）。 */
export interface NavRoute {
  key: string;
  title: string;
  path?: string;
  component?: string;
  menu: MenuTreeResp;
  kind: MenuKind;
  /** `hidden = 1`：不进入导航，但仍注册路由（业务可能从通知/扫码跳转）。 */
  hidden: boolean;
  external: boolean;
  iframe: boolean;
  order: number;
}

/** 底部 Tab / 工作台分组。 */
export interface NavTab {
  key: string;
  title: string;
  icon?: string;
  menuCode: string;
  routes: NavRoute[];
}

/** 菜单 → 导航映射结果。 */
export interface NavMapping {
  tabs: NavTab[];
  /** 全部菜单（含 hidden）拍平后的路由，供深链与通知跳转。 */
  routes: NavRoute[];
}

export interface MapMenuOptions {
  /** 是否把 EXTERNAL/IFRAME 放进 Tab（默认 false：仅注册路由，不展示）。 */
  includeExternalInTabs?: boolean;
}

const NO_SORT = Number.MAX_SAFE_INTEGER;

/** 判定菜单种类。 */
export function resolveMenuKind(menu: MenuTreeResp): MenuKind {
  switch (menu.type) {
    case 'CATALOG':
      return 'CATALOG';
    case 'MENU':
      return 'MENU';
    case 'IFRAME':
      return 'IFRAME';
    case 'EXTERNAL':
      return 'EXTERNAL';
    default:
      return 'UNKNOWN';
  }
}

function isHidden(menu: MenuTreeResp): boolean {
  return menu.hidden === true || menu.status === 0;
}

function sortMenus(menus: readonly MenuTreeResp[]): MenuTreeResp[] {
  return [...menus].sort((a, b) => (a.sort ?? NO_SORT) - (b.sort ?? NO_SORT));
}

function toRoute(menu: MenuTreeResp): NavRoute {
  const kind = resolveMenuKind(menu);
  const route: NavRoute = {
    key: menu.code || menu.id,
    title: menu.name,
    menu,
    kind,
    hidden: isHidden(menu),
    external: kind === 'EXTERNAL',
    iframe: kind === 'IFRAME',
    order: menu.sort ?? NO_SORT,
  };
  if (menu.path !== undefined) route.path = menu.path;
  if (menu.component !== undefined) route.component = menu.component;
  return route;
}

/** 递归拍平全部菜单（含目录与 hidden），用于注册路由。 */
export function flattenMenuRoutes(menus: readonly MenuTreeResp[]): NavRoute[] {
  const routes: NavRoute[] = [];
  const walk = (list: readonly MenuTreeResp[]): void => {
    for (const menu of sortMenus(list)) {
      routes.push(toRoute(menu));
      if (menu.children && menu.children.length > 0) walk(menu.children);
    }
  };
  walk(menus);
  return routes;
}

function collectVisibleLeaves(
  menus: readonly MenuTreeResp[],
  includeExternal: boolean,
): NavRoute[] {
  const routes: NavRoute[] = [];
  for (const menu of sortMenus(menus)) {
    if (isHidden(menu)) continue;
    const kind = resolveMenuKind(menu);
    if (kind === 'CATALOG') {
      routes.push(...collectVisibleLeaves(menu.children ?? [], includeExternal));
      continue;
    }
    if ((kind === 'EXTERNAL' || kind === 'IFRAME') && !includeExternal) continue;
    routes.push(toRoute(menu));
  }
  return routes;
}

/**
 * 菜单树 → 移动端导航结构。
 *
 * <ul>
 *   <li>`type = CATALOG` → 底部 Tab / 工作台分组（递归收集可见叶子）；</li>
 *   <li>`type = MENU` → Tab 下的二级路由；</li>
 *   <li>`hidden = 1` → 不进导航，但仍在 `routes` 中注册；</li>
 *   <li>`type = EXTERNAL / IFRAME` → 默认不展示（仅注册路由），可用 `includeExternalInTabs` 打开；</li>
 *   <li>空的目录不产生空 Tab。</li>
 * </ul>
 */
export function mapMenuToNavigation(
  menus: readonly MenuTreeResp[] | null | undefined,
  options: MapMenuOptions = {},
): NavMapping {
  const list = menus ?? [];
  const includeExternal = options.includeExternalInTabs === true;

  const tabs: NavTab[] = [];
  for (const menu of sortMenus(list)) {
    if (isHidden(menu)) continue;
    const kind = resolveMenuKind(menu);

    if (kind === 'CATALOG') {
      const routes = collectVisibleLeaves(menu.children ?? [], includeExternal);
      if (routes.length === 0) continue;
      const tab: NavTab = { key: menu.code || menu.id, title: menu.name, menuCode: menu.code, routes };
      if (menu.icon !== undefined) tab.icon = menu.icon;
      tabs.push(tab);
      continue;
    }

    if ((kind === 'EXTERNAL' || kind === 'IFRAME') && !includeExternal) continue;

    const route = toRoute(menu);
    const tab: NavTab = { key: route.key, title: route.title, menuCode: menu.code, routes: [route] };
    if (menu.icon !== undefined) tab.icon = menu.icon;
    tabs.push(tab);
  }

  return { tabs, routes: flattenMenuRoutes(list) };
}
