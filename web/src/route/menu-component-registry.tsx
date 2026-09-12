import { lazy, Suspense } from 'react';
import { RouteLoading } from './route-loading';
import type { MenuComponentRegistry } from './types';

export function createMenuComponentRegistry(registry: MenuComponentRegistry): MenuComponentRegistry {
  return registry;
}

// 菜单管理页需要拿到注册表本身，这里用动态导入保证内置页面同样按需加载。
const LazyMenuManagementPage = lazy(() =>
  import('@/pages/system/operation/menu').then((module) => ({ default: module.MenuManagementPage })),
);

function BuiltInMenuManagementPage() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <LazyMenuManagementPage componentRegistry={builtInMenuComponentRegistry} />
    </Suspense>
  );
}

// Component names here are the contract with backend menu records.
// 所有页面组件由后端菜单下发 path/component 后在这里解析。
// loader 使用动态 import()，页面代码只在对应路由被访问时才加载。
// 系统管理 - 运营管理
export const builtInMenuComponentRegistry = createMenuComponentRegistry({
  // 仪表盘
  DashboardPage: {
    component: 'DashboardPage',
    defaultName: '仪表盘',
    defaultCode: 'DASHBOARD',
    defaultPath: '/dashboard',
    loader: () => import('@/pages/dashboard').then((module) => ({ default: module.DashboardPage })),
  },
  // 系统管理 - 运营管理
  UserManagementPage: {
    component: 'UserManagementPage',
    defaultName: '用户管理',
    defaultCode: 'USER_MANAGEMENT',
    defaultPath: '/system/operation/user',
    defaultIcon: 'UserOutlined',
    loader: () => import('@/pages/system/operation/user').then((module) => ({ default: module.UserManagementPage })),
  },
  OrgManagementPage: {
    component: 'OrgManagementPage',
    defaultName: '组织管理',
    defaultCode: 'ORG_MANAGEMENT',
    defaultPath: '/system/operation/org',
    loader: () => import('@/pages/system/operation/org').then((module) => ({ default: module.OrgManagementPage })),
  },
  RoleManagementPage: {
    component: 'RoleManagementPage',
    defaultName: '角色管理',
    defaultCode: 'ROLE_MANAGEMENT',
    defaultPath: '/system/operation/role',
    loader: () => import('@/pages/system/operation/role').then((module) => ({ default: module.RoleManagementPage })),
  },
  MenuManagementPage: {
    component: 'MenuManagementPage',
    defaultName: '菜单管理',
    defaultCode: 'MENU_MANAGEMENT',
    defaultPath: '/system/operation/menu',
    loader: () => Promise.resolve({ default: BuiltInMenuManagementPage }),
  },
  ButtonManagementPage: {
    component: 'ButtonManagementPage',
    defaultName: '按钮管理',
    defaultCode: 'BUTTON_MANAGEMENT',
    defaultPath: '/system/operation/button',
    loader: () => import('@/pages/system/operation/button').then((module) => ({ default: module.ButtonManagementPage })),
  },
  // 系统管理 - 权限管理
  MenuPermissionPage: {
    component: 'MenuPermissionPage',
    defaultName: '菜单权限',
    defaultCode: 'MENU_PERMISSION',
    defaultPath: '/system/permission/menu-permission',
    loader: () =>
      import('@/pages/system/permission/menu-permission').then((module) => ({ default: module.MenuPermissionPage })),
  },
  ButtonPermissionPage: {
    component: 'ButtonPermissionPage',
    defaultName: '按钮权限',
    defaultCode: 'BUTTON_PERMISSION',
    defaultPath: '/system/permission/button-permission',
    loader: () =>
      import('@/pages/system/permission/button-permission').then((module) => ({ default: module.ButtonPermissionPage })),
  },
  // 系统管理 - 系统配置
  DictManagementPage: {
    component: 'DictManagementPage',
    defaultName: '字典管理',
    defaultCode: 'DICT_MANAGEMENT',
    defaultPath: '/system/config/dict',
    loader: () => import('@/pages/system/config/dict').then((module) => ({ default: module.DictManagementPage })),
  },
  ParamManagementPage: {
    component: 'ParamManagementPage',
    defaultName: '参数管理',
    defaultCode: 'PARAM_MANAGEMENT',
    defaultPath: '/system/config/param',
    loader: () => import('@/pages/system/config/param').then((module) => ({ default: module.ParamManagementPage })),
  },
  GeneralConfigPage: {
    component: 'GeneralConfigPage',
    defaultName: '通用配置',
    defaultCode: 'GENERAL_CONFIG',
    defaultPath: '/system/config/general',
    loader: () => import('@/pages/system/config/general').then((module) => ({ default: module.GeneralConfigPage })),
  },
  // 系统管理 - 系统监控
  AuditLogPage: {
    component: 'AuditLogPage',
    defaultName: '审计日志',
    defaultCode: 'AUDIT_LOG',
    defaultPath: '/system/monitor/audit-log',
    loader: () => import('@/pages/system/monitor/audit-log').then((module) => ({ default: module.AuditLogPage })),
  },
  ScheduledTaskPage: {
    component: 'ScheduledTaskPage',
    defaultName: '定时任务',
    defaultCode: 'SCHEDULED_TASK',
    defaultPath: '/system/monitor/scheduled-task',
    loader: () => import('@/pages/system/monitor/scheduled-task').then((module) => ({ default: module.ScheduledTaskPage })),
  },
  CacheManagementPage: {
    component: 'CacheManagementPage',
    defaultName: '缓存管理',
    defaultCode: 'CACHE_MANAGEMENT',
    defaultPath: '/system/monitor/cache-management',
    defaultIcon: 'DatabaseOutlined',
    loader: () =>
      import('@/pages/system/monitor/cache-management').then((module) => ({ default: module.CacheManagementPage })),
  },
  OnlineUserPage: {
    component: 'OnlineUserPage',
    defaultName: '在线用户',
    defaultCode: 'ONLINE_USER',
    defaultPath: '/system/monitor/online-user',
    defaultIcon: 'TeamOutlined',
    loader: () => import('@/pages/system/monitor/online-user').then((module) => ({ default: module.OnlineUserPage })),
  },
  // 系统管理 - 通知管理
  TemplateManagementPage: {
    component: 'TemplateManagementPage',
    defaultName: '通知模板',
    defaultCode: 'NOTIFY_TEMPLATE',
    defaultPath: '/system/notify/template',
    defaultIcon: 'NotificationOutlined',
    loader: () => import('@/pages/system/notify/template').then((module) => ({ default: module.TemplateManagementPage })),
  },
  AnnouncementManagementPage: {
    component: 'AnnouncementManagementPage',
    defaultName: '公告管理',
    defaultCode: 'NOTIFY_ANNOUNCEMENT',
    defaultPath: '/system/notify/announcement',
    defaultIcon: 'SoundOutlined',
    loader: () =>
      import('@/pages/system/notify/announcement').then((module) => ({ default: module.AnnouncementManagementPage })),
  },
  NotifyRecordPage: {
    component: 'NotifyRecordPage',
    defaultName: '通知记录',
    defaultCode: 'NOTIFY_RECORD',
    defaultPath: '/system/notify/record',
    defaultIcon: 'FileTextOutlined',
    loader: () => import('@/pages/system/notify/record').then((module) => ({ default: module.NotifyRecordPage })),
  },
  ChannelTargetManagementPage: {
    component: 'ChannelTargetManagementPage',
    defaultName: '渠道目标',
    defaultCode: 'NOTIFY_CHANNEL_TARGET',
    defaultPath: '/system/notify/channel-target',
    defaultIcon: 'LinkOutlined',
    loader: () =>
      import('@/pages/system/notify/channel-target').then((module) => ({ default: module.ChannelTargetManagementPage })),
  },
});
