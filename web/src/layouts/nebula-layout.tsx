import { flushSync } from 'react-dom';
import { Breadcrumb, Button, Dropdown, Grid, Input, Layout, Menu, Tabs, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { BreadcrumbProps, MenuProps, TabsProps, InputRef } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { createStyles } from 'antd-style';
import { useNebulaBrand } from '@/providers/brand-context';
import { resolveNebulaIcon } from '@/utils/icons';
import type { NebulaMenuItem } from '@/route/types';
import { useAppStore } from '@/stores/app-store';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { nebulaTokens } from '@/providers/tokens';
import { HeaderUserMenu } from './components/header-user-menu';
import { NotificationBell } from './components/notification-bell';
import { PopupAnnouncement } from './components/popup-announcement';

const { Header, Sider, Content } = Layout;

const useStyles = createStyles(({ token }) => ({
  shell: {
    height: '100dvh',
    overflow: 'hidden',
    background: token.colorBgLayout,
  },
  sider: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100dvh',
    overflow: 'visible',
    scrollbarWidth: 'thin' as const,
    background: token.colorBgContainer,
    borderRight: `1px solid ${token.colorBorderSecondary}`,
    '& .ant-layout-sider-children': {
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100%',
      minHeight: 0,
    },
  },
  brandHeader: {
    position: 'relative' as const,
    height: nebulaTokens.headerHeight,
    display: 'flex',
    alignItems: 'center',
    gap: token.marginSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  brandHeaderExpanded: {
    justifyContent: 'flex-start',
    paddingInline: token.paddingMD,
  },
  brandHeaderCollapsed: {
    justifyContent: 'center',
    paddingInline: 0,
  },
  brandLogo: {
    display: 'inline-flex',
    color: token.colorPrimary,
  },
  brandTitle: {
    color: token.colorText,
  },
  collapseButton: {
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    boxShadow: token.boxShadowSecondary,
    '& .ant-btn-icon': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 0,
    },
  },
  collapseIcon: {
    color: token.colorTextTertiary,
    fontSize: 14,
    width: 14,
    height: 14,
    lineHeight: '14px',
    '& svg': {
      width: 14,
      height: 14,
    },
  },
  menu: {
    borderInlineEnd: 0,
    paddingBlock: token.paddingSM,
  },
  menuWrapper: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden auto',
  },
  workspace: {
    minWidth: 0,
    height: '100%',
    overflow: 'hidden',
    background: token.colorBgLayout,
  },
  header: {
    height: nebulaTokens.headerHeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingInline: token.paddingLG,
    background: token.colorBgContainer,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    gap: token.marginXS,
  },
  compactHeader: {
    paddingInline: token.paddingXS,
  },
  compactHeaderActions: {
    gap: token.marginXXS,
  },
  routeTabs: {
    '& .ant-tabs-nav-list': {
      gap: 4,
    },
  },
  tabs: {
    height: nebulaTokens.tabsHeight,
    paddingInline: token.paddingXS,
    paddingTop: token.paddingXS,
    background: token.colorBgContainer,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: 0,
    overflow: 'auto',
    padding: token.padding,
    background: token.colorBgLayout,
  },
  contentInner: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: '1 1 auto',
    minHeight: 0,
    height: '100%',
  },
}));

interface NebulaLayoutProps {
  title?: string;
  logo?: ReactNode;
  menuItems?: NebulaMenuItem[];
  rightContent?: ReactNode;
  children?: ReactNode;
}

interface RouteTab {
  path: string;
  label: string;
  closable: boolean;
  renamed?: boolean;
}

function toTabKey(path: string): string {
  return `tab-${Array.from(path, (ch) => ch.codePointAt(0)).join('-')}`;
}

function flattenMenuItems(items: NebulaMenuItem[]): NebulaMenuItem[] {
  return items.flatMap((item) => [item, ...flattenMenuItems(item.children ?? [])]);
}

function findMenuItem(items: NebulaMenuItem[], path: string): NebulaMenuItem | undefined {
  return flattenMenuItems(items).find((item) => item.path === path);
}

function findMenuPath(items: NebulaMenuItem[], path: string, parents: NebulaMenuItem[] = []): NebulaMenuItem[] {
  for (const item of items) {
    const nextParents = [...parents, item];
    if (item.path === path) {
      return nextParents;
    }
    const childMatch = findMenuPath(item.children ?? [], path, nextParents);
    if (childMatch.length > 0) {
      return childMatch;
    }
  }
  return [];
}

function isNavigableMenuItem(item: NebulaMenuItem): boolean {
  if (item.children?.length) return false;

  const type = item.type?.toUpperCase();
  return type === undefined || type === 'MENU' || type === 'IFRAME' || type === 'EXTERNAL';
}

function isVisibleInRouteTabs(item: NebulaMenuItem): boolean {
  return item.visibleInTab !== false;
}

function toMenuItems(items: NebulaMenuItem[]): MenuProps['items'] {
  return items
    .filter((item) => !item.hidden)
    .map((item) => ({
      key: toTabKey(item.path),
      icon: item.iconNode ?? resolveNebulaIcon(item.icon),
      label: isNavigableMenuItem(item) ? <Link to={item.path}>{item.name}</Link> : item.name,
      title: item.name,
      children: item.children?.length ? toMenuItems(item.children) : undefined,
    }));
}

function createSidebarCollapseIcon(collapsed: boolean, className?: string): ReactNode {
  return collapsed ? (
    <RightOutlined className={className} aria-hidden="true" data-testid="nebula-sidebar-expand-icon" />
  ) : (
    <LeftOutlined className={className} aria-hidden="true" data-testid="nebula-sidebar-collapse-icon" />
  );
}

function createInitialTabs(items: NebulaMenuItem[], currentPath: string, currentTitle: string): RouteTab[] {
  const currentItem = findMenuItem(items, currentPath);
  const firstItem = flattenMenuItems(items).find((item) => isNavigableMenuItem(item) && isVisibleInRouteTabs(item));

  if (!firstItem) {
    return [{ path: currentPath, label: currentTitle, closable: true, renamed: false }];
  }

  if (!currentItem || !isVisibleInRouteTabs(currentItem)) {
    return [{ path: firstItem.path, label: firstItem.name, closable: true, renamed: false }];
  }

  if (firstItem.path === currentPath) {
    return [{ path: currentPath, label: currentTitle, closable: true, renamed: false }];
  }

  return [
    { path: firstItem.path, label: firstItem.name, closable: true, renamed: false },
    { path: currentPath, label: currentTitle, closable: true, renamed: false },
  ];
}

function upsertRouteTab(currentTabs: RouteTab[], path: string, label: string): RouteTab[] {
  const existingTab = currentTabs.find((tab) => tab.path === path);
  if (existingTab) {
    if (existingTab.renamed || existingTab.label === label) {
      return currentTabs;
    }
    return currentTabs.map((tab) => (tab.path === path ? { ...tab, label } : tab));
  }
  return [...currentTabs, { path, label, closable: true, renamed: false }];
}

function resolveVisibleRouteTabLabel(
  items: NebulaMenuItem[],
  path: string,
  builtInLabels: Readonly<Record<string, string>>,
): string | undefined {
  const item = findMenuItem(items, path);
  if (!item) return builtInLabels[path];
  return isNavigableMenuItem(item) && isVisibleInRouteTabs(item) ? item.name : undefined;
}

function getTabKeyFromElement(element: HTMLElement): string | null {
  const tabEl = element.closest('[role="tab"]');
  if (!tabEl) return null;
  const dataTabKey = tabEl.getAttribute('data-nebula-tab-key');
  if (dataTabKey) return dataTabKey;
  const id = tabEl.id;
  if (!id) return null;
  const match = id.match(/^rc-tabs-[^-]+-tab-(.+)$/);
  return match ? match[1] : null;
}

function findTabElement(tabKey: string): HTMLElement | null {
  const tabElements = document.querySelectorAll<HTMLElement>('[role="tab"]');
  for (const element of tabElements) {
    if (element.getAttribute('data-nebula-tab-key') === tabKey || element.id.endsWith(`-${tabKey}`)) {
      return element;
    }
  }
  return null;
}

interface TabLabelProps {
  tabKey: string;
  label: string;
  renameAriaLabel: string;
  editingTabKey: string | null;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onEditSave: (value: string) => void;
  onEditCancel: () => void;
}

function TabLabel({
  tabKey,
  label,
  renameAriaLabel,
  editingTabKey,
  editValue,
  onEditValueChange,
  onEditSave,
  onEditCancel,
}: TabLabelProps) {
  const inputRef = useRef<InputRef>(null);
  const editingStartTimeRef = useRef<number | null>(null);

  const isEditing = editingTabKey === tabKey;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      editingStartTimeRef.current = Date.now();
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = editValue.trim();
      if (trimmed) {
        onEditSave(trimmed);
      } else {
        onEditCancel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onEditCancel();
    }
  };

  const handleInputBlur = () => {
    if (editingStartTimeRef.current && Date.now() - editingStartTimeRef.current < 100) {
      editingStartTimeRef.current = null;
      return;
    }
    const trimmed = editValue.trim();
    if (trimmed) {
      onEditSave(trimmed);
    } else {
      onEditCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => onEditValueChange(e.target.value)}
        onKeyDown={handleInputKeyDown}
        onBlur={handleInputBlur}
        aria-label={renameAriaLabel}
        size="small"
        style={{ width: 100 }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return <span>{label}</span>;
}

export function NebulaLayout({
  title,
  logo,
  menuItems = [],
  rightContent,
  children,
}: NebulaLayoutProps) {
  const brand = useNebulaBrand();
  const brandTitle = title ?? brand.name;
  const brandLogo = logo ?? brand.logo;
  const location = useLocation();
  const navigate = useNavigate();
  const siderCollapsed = useAppStore((state) => state.siderCollapsed);
  const setSiderCollapsed = useAppStore((state) => state.setSiderCollapsed);
  const { t } = useNebulaI18n();
  const { styles, cx } = useStyles();
  const screens = Grid.useBreakpoint();
  const compactHeader = screens.xs === true;

  const currentMenuPath = useMemo(
    () => findMenuPath(menuItems, location.pathname),
    [location.pathname, menuItems],
  );
  const currentMenuItem = currentMenuPath.at(-1) ?? findMenuItem(menuItems, location.pathname);
  const currentTitle = currentMenuItem?.name ?? brandTitle;
  const requestedSelectedPath = currentMenuItem?.activeMenuPath ?? location.pathname;
  const selectedMenuItem = findMenuItem(menuItems, requestedSelectedPath);
  const selectedMenuPath = selectedMenuItem && isNavigableMenuItem(selectedMenuItem)
    ? selectedMenuItem.path
    : selectedMenuItem && currentMenuItem && isNavigableMenuItem(currentMenuItem)
      ? currentMenuItem.path
      : undefined;
  const selectedMenuHierarchy = useMemo(
    () => findMenuPath(menuItems, selectedMenuPath ?? location.pathname),
    [location.pathname, menuItems, selectedMenuPath],
  );
  const openMenuKeys = selectedMenuHierarchy.slice(0, -1).map((item) => toTabKey(item.path));

  const builtInRouteTabLabels = useMemo<Readonly<Record<string, string>>>(
    () => ({
      '/profile/info': t('layout.headerUser.profile'),
      '/notify/inbox': t('layout.notificationInbox'),
    }),
    [t],
  );

  const currentRouteTabLabel = useMemo(
    () => resolveVisibleRouteTabLabel(menuItems, location.pathname, builtInRouteTabLabels),
    [builtInRouteTabLabels, location.pathname, menuItems],
  );

  const [tabs, setTabs] = useState<RouteTab[]>(() => createInitialTabs(menuItems, location.pathname, currentTitle));

  const [editingTabKey, setEditingTabKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [routeRefreshKeys, setRouteRefreshKeys] = useState<Record<string, number>>({});
  const [pendingRefreshPath, setPendingRefreshPath] = useState<string | null>(null);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  useEffect(() => {
    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tabKey = getTabKeyFromElement(target);
      if (tabKey) {
        const currentTabs = tabsRef.current;
        const tab = currentTabs.find((t) => toTabKey(t.path) === tabKey);
        if (tab) {
          flushSync(() => {
            setEditingTabKey(tabKey);
            setEditValue(tab.label);
          });
        }
      }
    };

    document.addEventListener('dblclick', handleDblClick, true);

    return () => {
      document.removeEventListener('dblclick', handleDblClick, true);
    };
  }, []);

  useEffect(() => {
    for (const tab of tabs) {
      const tabKey = toTabKey(tab.path);
      const element = findTabElement(tabKey);
      element?.setAttribute('aria-label', tab.label);
      element?.setAttribute('data-nebula-tab-key', tabKey);
    }
  }, [tabs]);

  useEffect(() => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.renamed) {
          return tab;
        }
        const item = findMenuItem(menuItems, tab.path);
        const updatedLabel = item?.name ?? tab.label;
        return updatedLabel !== tab.label ? { ...tab, label: updatedLabel } : tab;
      }),
    );
  }, [menuItems]);

  useEffect(() => {
    if (!currentRouteTabLabel) return;
    setTabs((currentTabs) => upsertRouteTab(currentTabs, location.pathname, currentRouteTabLabel));
  }, [currentRouteTabLabel, location.pathname]);

  useEffect(() => {
    if (pendingRefreshPath !== location.pathname) return;

    setRouteRefreshKeys((current) => ({
      ...current,
      [pendingRefreshPath]: (current[pendingRefreshPath] ?? 0) + 1,
    }));
    setPendingRefreshPath(null);
  }, [location.pathname, pendingRefreshPath]);

  const breadcrumbItems: BreadcrumbProps['items'] = currentMenuPath.length
    ? currentMenuPath.map((item, index) => ({
        title:
          index === currentMenuPath.length - 1 || !isNavigableMenuItem(item) ? (
            item.name
          ) : (
            <Link to={item.path}>{item.name}</Link>
          ),
      }))
    : [{ title: currentTitle }];

  const activeTabKey = toTabKey(location.pathname);

  function openRoute(path: string) {
    const targetMenuItem = findMenuItem(menuItems, path);
    const label = targetMenuItem?.name ?? path;
    openRouteWithLabel(path, label);
  }

  function addRouteTabWithLabel(path: string, label: string) {
    setTabs((currentTabs) => upsertRouteTab(currentTabs, path, label));
  }

  function openRouteWithLabel(path: string, label: string) {
    addRouteTabWithLabel(path, label);
    navigate(path);
  }

  function openMenuKey(key: string) {
    const item = flattenMenuItems(menuItems).find((menuItem) => toTabKey(menuItem.path) === key);
    if (item && isNavigableMenuItem(item)) {
      if (isVisibleInRouteTabs(item)) {
        openRoute(item.path);
      } else {
        navigate(item.path);
      }
    }
  }

  function getWorkspaceFallbackTab(): RouteTab {
    const flatItems = flattenMenuItems(menuItems);
    const fallbackItems = flatItems.filter((item) => isNavigableMenuItem(item) && isVisibleInRouteTabs(item));
    const workspaceItem = fallbackItems.find((item) => item.path === '/') ?? fallbackItems[0];

    return {
      path: workspaceItem?.path ?? '/',
      label: workspaceItem?.name ?? currentTitle,
      closable: true,
      renamed: false,
    };
  }

  function ensureTabsWithFallback(nextTabs: RouteTab[]): RouteTab[] {
    return nextTabs.length > 0 ? nextTabs : [getWorkspaceFallbackTab()];
  }

  function navigateToFallbackForClosedActiveTab(
    removedActiveKey: string,
    nextTabs: RouteTab[],
    targetIndex: number,
  ) {
    if (removedActiveKey !== activeTabKey) return;

    const fallback = nextTabs[targetIndex - 1] ?? nextTabs[targetIndex] ?? nextTabs[0] ?? getWorkspaceFallbackTab();
    navigate(fallback.path);
  }

  function closeRouteTab(sanitizedKey: string) {
    setTabs((currentTabs) => {
      const targetIndex = currentTabs.findIndex((tab) => toTabKey(tab.path) === sanitizedKey);
      if (targetIndex < 0) {
        return currentTabs;
      }

      const nextTabsWithoutFallback = currentTabs.filter((tab) => toTabKey(tab.path) !== sanitizedKey);
      const nextTabs = ensureTabsWithFallback(nextTabsWithoutFallback);
      navigateToFallbackForClosedActiveTab(sanitizedKey, nextTabs, targetIndex);

      return nextTabs;
    });
  }

  function closeOtherTabs(keepKey: string) {
    setTabs((currentTabs) => {
      const keepTab = currentTabs.find((tab) => toTabKey(tab.path) === keepKey);
      if (!keepTab) return currentTabs;

      navigate(keepTab.path);
      return [keepTab];
    });
  }

  function closeLeftTabs(tabKey: string) {
    setTabs((currentTabs) => {
      const targetIndex = currentTabs.findIndex((tab) => toTabKey(tab.path) === tabKey);
      if (targetIndex <= 0) return currentTabs;

      const nextTabs = currentTabs.slice(targetIndex);
      if (!nextTabs.some((tab) => toTabKey(tab.path) === activeTabKey)) {
        navigate(nextTabs[0]?.path ?? getWorkspaceFallbackTab().path);
      }
      return ensureTabsWithFallback(nextTabs);
    });
  }

  function closeRightTabs(tabKey: string) {
    setTabs((currentTabs) => {
      const targetIndex = currentTabs.findIndex((tab) => toTabKey(tab.path) === tabKey);
      if (targetIndex < 0 || targetIndex >= currentTabs.length - 1) return currentTabs;

      const nextTabs = currentTabs.slice(0, targetIndex + 1);
      if (!nextTabs.some((tab) => toTabKey(tab.path) === activeTabKey)) {
        navigate(nextTabs.at(-1)?.path ?? getWorkspaceFallbackTab().path);
      }
      return ensureTabsWithFallback(nextTabs);
    });
  }

  function openInNewWindow(path: string) {
    const nextUrl = new URL(path, window.location.origin);
    window.open(`/redirect${nextUrl.pathname}${nextUrl.search}`, '_blank', 'noopener,noreferrer');
  }

  function refreshRouteTab(tabKey: string) {
    const tab = tabs.find((item) => toTabKey(item.path) === tabKey);
    if (!tab) return;

    if (tabKey !== activeTabKey) {
      setPendingRefreshPath(tab.path);
      navigate(tab.path);
      return;
    }

    setRouteRefreshKeys((current) => ({
      ...current,
      [tab.path]: (current[tab.path] ?? 0) + 1,
    }));
  }

  function handleRenameSave(tabKey: string, newLabel: string) {
    flushSync(() => {
      setTabs((prev) =>
        prev.map((tab) =>
          toTabKey(tab.path) === tabKey ? { ...tab, label: newLabel, renamed: true } : tab,
        ),
      );
      setEditingTabKey(null);
      setEditValue('');
    });
  }

  function handleRenameCancel() {
    setEditingTabKey(null);
    setEditValue('');
  }

  const tabItems: TabsProps['items'] = tabs.map((tab) => {
    const tabKey = toTabKey(tab.path);

    return {
      key: tabKey,
      label: (
        <TabLabel
          tabKey={tabKey}
          label={tab.label}
          renameAriaLabel={t('layout.tabRenameAriaLabel')}
          editingTabKey={editingTabKey}
          editValue={editValue}
          onEditValueChange={setEditValue}
          onEditSave={(value) => handleRenameSave(tabKey, value)}
          onEditCancel={handleRenameCancel}
        />
      ),
      closable: tab.closable,
    };
  });

  function createTabContextMenuItems(tabKey: string): MenuProps['items'] {
    const targetIndex = tabs.findIndex((item) => toTabKey(item.path) === tabKey);
    const tabExists = targetIndex >= 0;

    return [
      { key: 'refresh', label: t('layout.tabContextMenu.refresh'), disabled: !tabExists },
      { key: 'close-current', label: t('layout.tabContextMenu.closeCurrent'), disabled: !tabExists },
      { key: 'close-left', label: t('layout.tabContextMenu.closeLeft'), disabled: !tabExists || targetIndex === 0 },
      {
        key: 'close-right',
        label: t('layout.tabContextMenu.closeRight'),
        disabled: !tabExists || targetIndex === tabs.length - 1,
      },
      { key: 'close-others', label: t('layout.tabContextMenu.closeOthers'), disabled: !tabExists || tabs.length <= 1 },
      { key: 'open-new-window', label: t('layout.tabContextMenu.openInNewWindow'), disabled: !tabExists },
    ];
  }

  function handleTabContextMenuClick(actionKey: string, tabKey: string) {
    const tab = tabs.find((item) => toTabKey(item.path) === tabKey);
    if (!tab) return;

    if (actionKey === 'refresh') {
      refreshRouteTab(tabKey);
    } else if (actionKey === 'close-current') {
      closeRouteTab(tabKey);
    } else if (actionKey === 'close-left') {
      closeLeftTabs(tabKey);
    } else if (actionKey === 'close-right') {
      closeRightTabs(tabKey);
    } else if (actionKey === 'close-others') {
      closeOtherTabs(tabKey);
    } else if (actionKey === 'open-new-window') {
      openInNewWindow(tab.path);
    }
  }

  return (
    <Layout hasSider className={styles.shell}>
      <PopupAnnouncement />
      <Sider
        width={nebulaTokens.siderWidth}
        collapsedWidth={nebulaTokens.siderCollapsedWidth}
        collapsible
        collapsed={siderCollapsed}
        trigger={null}
        role="navigation"
        aria-label={t('layout.sidebarAriaLabel')}
        className={styles.sider}
      >
        <div
          data-testid="nebula-sidebar-brand"
          className={cx(styles.brandHeader, siderCollapsed ? styles.brandHeaderCollapsed : styles.brandHeaderExpanded)}
        >
          <span aria-hidden="true" className={styles.brandLogo}>
            {brandLogo ?? createSidebarCollapseIcon(false, cx('nebula-sidebar-collapse-control-icon', styles.collapseIcon))}
          </span>
          {!siderCollapsed && (
            <Typography.Text strong ellipsis className={styles.brandTitle}>
              {brandTitle}
            </Typography.Text>
          )}
          <Button
            type="text"
            icon={createSidebarCollapseIcon(siderCollapsed, cx('nebula-sidebar-collapse-control-icon', styles.collapseIcon))}
            aria-label={siderCollapsed ? t('layout.sidebarExpand') : t('layout.sidebarCollapse')}
            aria-expanded={!siderCollapsed}
            onClick={() => setSiderCollapsed(!siderCollapsed)}
            className={styles.collapseButton}
            style={{
              position: 'absolute',
              insetInlineEnd: -16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              minWidth: 32,
              padding: 0,
              borderRadius: '50%',
            }}
          />
        </div>
        <div className={styles.menuWrapper}>
          <Menu
            mode="inline"
            selectedKeys={selectedMenuPath ? [toTabKey(selectedMenuPath)] : []}
            defaultOpenKeys={openMenuKeys}
            items={toMenuItems(menuItems)}
            onClick={({ key }) => openMenuKey(String(key))}
            className={styles.menu}
          />
        </div>
      </Sider>
      <Layout className={styles.workspace}>
        <Header
          className={cx(styles.header, compactHeader && styles.compactHeader)}
        >
          <Breadcrumb aria-label={t('layout.breadcrumbAriaLabel')} items={breadcrumbItems} />
          {rightContent ?? (
            <div className={cx(styles.headerActions, compactHeader && styles.compactHeaderActions)}>
              <NotificationBell onOpenInboxTab={(path) => addRouteTabWithLabel(path, t('layout.notificationInbox'))} />
              <HeaderUserMenu
                compact={compactHeader}
                onOpenProfile={() => openRouteWithLabel('/profile/info', t('layout.headerUser.profile'))}
              />
            </div>
          )}
        </Header>
        <div className={cx('nebula-route-tabs', styles.routeTabs)}>
          <Tabs
            type="editable-card"
            hideAdd
            activeKey={activeTabKey}
            items={tabItems}
            locale={{ removeAriaLabel: t('layout.tabContextMenu.closeCurrent') }}
            onChange={(sanitizedKey) => {
              const tab = tabs.find((t) => toTabKey(t.path) === sanitizedKey);
              if (tab) openRouteWithLabel(tab.path, tab.label);
            }}
            onEdit={(targetKey, action) => {
              if (action === 'remove') {
                closeRouteTab(String(targetKey));
              }
            }}
            renderTabBar={(tabBarProps, DefaultTabBar) => (
              <DefaultTabBar {...tabBarProps}>
                {(node) => {
                  const tabKey = String(node.key);
                  return (
                    <Dropdown
                      trigger={['contextMenu']}
                      menu={{
                        items: createTabContextMenuItems(tabKey),
                        selectable: false,
                        onClick: ({ key }) => handleTabContextMenuClick(String(key), tabKey),
                        'aria-label': t('layout.tabContextMenu.ariaLabel'),
                      }}
                    >
                      <div>{node}</div>
                    </Dropdown>
                  );
                }}
              </DefaultTabBar>
            )}
            className={styles.tabs}
          />
        </div>
        <Content
          role="main"
          className={styles.content}
          style={{ flex: '1 1 0%' }}
        >
          <div
            key={`${location.pathname}:${routeRefreshKeys[location.pathname] ?? 0}`}
            className={styles.contentInner}
          >
            {children ?? <Outlet />}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
