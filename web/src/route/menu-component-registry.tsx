import { DashboardPage } from '@/pages/dashboard';
import { MenuManagementPage } from '@/pages/system/operation/menu';
import { OrgManagementPage } from '@/pages/system/operation/org';
import { RoleManagementPage } from '@/pages/system/operation/role';
import { UserManagementPage } from '@/pages/system/operation/user';
import { ButtonManagementPage } from '@/pages/system/operation/button';
import { MenuPermissionPage } from '@/pages/system/permission/menu-permission';
import { ButtonPermissionPage } from '@/pages/system/permission/button-permission';
import { DictManagementPage } from '@/pages/system/config/dict';
import { ParamManagementPage } from '@/pages/system/config/param';
import { GeneralConfigPage } from '@/pages/system/config/general';
import { AuditLogPage } from '@/pages/system/monitor/audit-log';
import { CacheManagementPage } from '@/pages/system/monitor/cache-management';
import { OnlineUserPage } from '@/pages/system/monitor/online-user';
import { ScheduledTaskPage } from '@/pages/system/monitor/scheduled-task';
import AnnouncementManagementPage from '@/pages/system/notify/announcement';
import ChannelTargetManagementPage from '@/pages/system/notify/channel-target';
import NotifyRecordPage from '@/pages/system/notify/record';
import TemplateManagementPage from '@/pages/system/notify/template';
import type { MenuComponentRegistry } from './types';

export function createMenuComponentRegistry(registry: MenuComponentRegistry): MenuComponentRegistry {
  return registry;
}

function BuiltInMenuManagementPage() {
  return <MenuManagementPage componentRegistry={builtInMenuComponentRegistry} />;
}

// Component names here are the contract with backend menu records.
// 所有页面组件由后端菜单下发 path/component 后在这里解析。
// 系统管理 - 运营管理
export const builtInMenuComponentRegistry = createMenuComponentRegistry({
  // 仪表盘
  DashboardPage: {
    component: 'DashboardPage',
    defaultName: '仪表盘',
    defaultCode: 'DASHBOARD',
    defaultPath: '/dashboard',
    loader: () => Promise.resolve({ default: DashboardPage }),
  },
  // 系统管理 - 运营管理
  UserManagementPage: {
    component: 'UserManagementPage',
    defaultName: '用户管理',
    defaultCode: 'USER_MANAGEMENT',
    defaultPath: '/system/operation/user',
    defaultIcon: 'UserOutlined',
    loader: () => Promise.resolve({ default: UserManagementPage }),
  },
  OrgManagementPage: {
    component: 'OrgManagementPage',
    defaultName: '组织管理',
    defaultCode: 'ORG_MANAGEMENT',
    defaultPath: '/system/operation/org',
    loader: () => Promise.resolve({ default: OrgManagementPage }),
  },
  RoleManagementPage: {
    component: 'RoleManagementPage',
    defaultName: '角色管理',
    defaultCode: 'ROLE_MANAGEMENT',
    defaultPath: '/system/operation/role',
    loader: () => Promise.resolve({ default: RoleManagementPage }),
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
    loader: () => Promise.resolve({ default: ButtonManagementPage }),
  },
  // 系统管理 - 权限管理
  MenuPermissionPage: {
    component: 'MenuPermissionPage',
    defaultName: '菜单权限',
    defaultCode: 'MENU_PERMISSION',
    defaultPath: '/system/permission/menu-permission',
    loader: () => Promise.resolve({ default: MenuPermissionPage }),
  },
  ButtonPermissionPage: {
    component: 'ButtonPermissionPage',
    defaultName: '按钮权限',
    defaultCode: 'BUTTON_PERMISSION',
    defaultPath: '/system/permission/button-permission',
    loader: () => Promise.resolve({ default: ButtonPermissionPage }),
  },
  // 系统管理 - 系统配置
  DictManagementPage: {
    component: 'DictManagementPage',
    defaultName: '字典管理',
    defaultCode: 'DICT_MANAGEMENT',
    defaultPath: '/system/config/dict',
    loader: () => Promise.resolve({ default: DictManagementPage }),
  },
  ParamManagementPage: {
    component: 'ParamManagementPage',
    defaultName: '参数管理',
    defaultCode: 'PARAM_MANAGEMENT',
    defaultPath: '/system/config/param',
    loader: () => Promise.resolve({ default: ParamManagementPage }),
  },
  GeneralConfigPage: {
    component: 'GeneralConfigPage',
    defaultName: '通用配置',
    defaultCode: 'GENERAL_CONFIG',
    defaultPath: '/system/config/general',
    loader: () => Promise.resolve({ default: GeneralConfigPage }),
  },
  // 系统管理 - 系统监控
  AuditLogPage: {
    component: 'AuditLogPage',
    defaultName: '审计日志',
    defaultCode: 'AUDIT_LOG',
    defaultPath: '/system/monitor/audit-log',
    loader: () => Promise.resolve({ default: AuditLogPage }),
  },
  ScheduledTaskPage: {
    component: 'ScheduledTaskPage',
    defaultName: '定时任务',
    defaultCode: 'SCHEDULED_TASK',
    defaultPath: '/system/monitor/scheduled-task',
    loader: () => Promise.resolve({ default: ScheduledTaskPage }),
  },
  CacheManagementPage: {
    component: 'CacheManagementPage',
    defaultName: '缓存管理',
    defaultCode: 'CACHE_MANAGEMENT',
    defaultPath: '/system/monitor/cache-management',
    defaultIcon: 'DatabaseOutlined',
    loader: () => Promise.resolve({ default: CacheManagementPage }),
  },
  OnlineUserPage: {
    component: 'OnlineUserPage',
    defaultName: '在线用户',
    defaultCode: 'ONLINE_USER',
    defaultPath: '/system/monitor/online-user',
    defaultIcon: 'TeamOutlined',
    loader: () => Promise.resolve({ default: OnlineUserPage }),
  },
  // 系统管理 - 通知管理
  TemplateManagementPage: {
    component: 'TemplateManagementPage',
    defaultName: '通知模板',
    defaultCode: 'NOTIFY_TEMPLATE',
    defaultPath: '/system/notify/template',
    defaultIcon: 'NotificationOutlined',
    loader: () => Promise.resolve({ default: TemplateManagementPage }),
  },
  AnnouncementManagementPage: {
    component: 'AnnouncementManagementPage',
    defaultName: '公告管理',
    defaultCode: 'NOTIFY_ANNOUNCEMENT',
    defaultPath: '/system/notify/announcement',
    defaultIcon: 'SoundOutlined',
    loader: () => Promise.resolve({ default: AnnouncementManagementPage }),
  },
  NotifyRecordPage: {
    component: 'NotifyRecordPage',
    defaultName: '通知记录',
    defaultCode: 'NOTIFY_RECORD',
    defaultPath: '/system/notify/record',
    defaultIcon: 'FileTextOutlined',
    loader: () => Promise.resolve({ default: NotifyRecordPage }),
  },
  ChannelTargetManagementPage: {
    component: 'ChannelTargetManagementPage',
    defaultName: '渠道目标',
    defaultCode: 'NOTIFY_CHANNEL_TARGET',
    defaultPath: '/system/notify/channel-target',
    defaultIcon: 'LinkOutlined',
    loader: () => Promise.resolve({ default: ChannelTargetManagementPage }),
  },
});
