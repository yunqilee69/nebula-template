-- ============================================================================
-- Nebula - Database Initial Data Script
-- File: 02-init-data.sql
-- Purpose: Initialize all module seed data (PostgreSQL)
-- Usage: psql -d nebula -f 02-init-data.sql
-- Notes:
--   1. Target database: PostgreSQL 14+.
--   2. Execute this script after 01-init-structure.sql.
--   3. SQL sections are grouped by module for easier future maintenance.
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- Module: auth
-- Source: auth/02-auth-init-data-mysql.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- auth-core / built-in seed constants
-- ----------------------------------------------------------------------------
-- admin user id      : 0194f3c8b6b77c0d91a7d9af9c7d0001
-- admin role id      : 0194f3c8b6b77c0d91a7d9af9c7d0002
-- root org id        : 0194f3c8b6b77c0d91a7d9af9c7d0003
-- user-role relation : 0194f3c8b6b77c0d91a7d9af9c7d0004
-- user-org relation  : 0194f3c8b6b77c0d91a7d9af9c7d0005
-- system template admin user : F194f3c8b6b77c0d91a7d9af9c7d0001
-- system template admin role : F194f3c8b6b77c0d91a7d9af9c7d0002
-- system template root org   : F194f3c8b6b77c0d91a7d9af9c7d0003


-- ----------------------------------------------------------------------------
-- auth-core / tenant & platform account seed data
-- default tenant id : 0194f3c8b6b77c0d91a7d9af9c7d0100
-- system tenant id  : __system__
-- superadmin id     : 0194f3c8b6b77c0d91a7d9af9c7d0101
-- 控制平面平台管理员：只存在于 auth_person，不绑定默认租户 auth_user，也不持有租户角色。
-- ----------------------------------------------------------------------------
INSERT INTO auth_tenant (
    id, code, name, status, logo, contact_email, settings_json, create_time, update_time
) VALUES
    ('0194f3c8b6b77c0d91a7d9af9c7d0100', 'default', 'Default Tenant', 'ACTIVE', NULL, 'admin@nebula.local', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('__system__', 'system', 'System', 'ACTIVE', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    contact_email = EXCLUDED.contact_email,
    update_time = EXCLUDED.update_time;

SELECT set_config('nebula.default_tenant_id', (SELECT id FROM auth_tenant WHERE code = 'default'), false);

INSERT INTO auth_person (
    id, username, display_name, password_hash, status, platform_admin,
    last_login_time, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0101',
    'superadmin',
    'Super Administrator',
    '$2a$10$uHC/qtYABWJ2QGDv3F0btOOtUXJeFMyw6S.Zs/QqfcRxmHmfLiIaS',
    'ACTIVE',
    TRUE,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    password_hash = EXCLUDED.password_hash,
    status = EXCLUDED.status,
    platform_admin = EXCLUDED.platform_admin,
    update_time = EXCLUDED.update_time;


-- ----------------------------------------------------------------------------
-- auth-core / role seed data
-- ----------------------------------------------------------------------------
INSERT INTO auth_role (
    id, tenant_id, code, name, description, status, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0002', current_setting('nebula.default_tenant_id'),
    'ADMIN',
    'Administrator',
    'Built-in administrator role',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- auth-core / organization seed data
-- ----------------------------------------------------------------------------
INSERT INTO auth_org (
    id, tenant_id, name, parent_id, path, sort, code, type, status, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0003', current_setting('nebula.default_tenant_id'),
    'Nebula',
    NULL,
    '/',
    1,
    'ROOT',
    'COMPANY',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- auth-core / user seed data
-- Default admin seed
-- | Field | Value | Note |
-- | username | admin | default admin account |
-- | password | 123456 (BCrypt hashed) | 部署后请及时修改密码 |
-- | status | enabled (1) | |
-- ----------------------------------------------------------------------------
INSERT INTO auth_user (
    id, tenant_id, username, password, nickname, avatar, email, phone, status, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0001', current_setting('nebula.default_tenant_id'),
    'admin',
    '$2a$10$uHC/qtYABWJ2QGDv3F0btOOtUXJeFMyw6S.Zs/QqfcRxmHmfLiIaS',
    'Administrator',
    NULL,
    'admin@nebula.local',
    NULL,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (tenant_id, username) DO NOTHING;

-- ----------------------------------------------------------------------------
-- auth-core / relation seed data
-- ----------------------------------------------------------------------------
INSERT INTO auth_user_role (
    id, tenant_id, user_id, role_id, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0004', current_setting('nebula.default_tenant_id'),
    '0194f3c8b6b77c0d91a7d9af9c7d0001',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (tenant_id, user_id, role_id) DO NOTHING;

INSERT INTO auth_user_org (
    id, tenant_id, user_id, org_id, is_main_org, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0005', current_setting('nebula.default_tenant_id'),
    '0194f3c8b6b77c0d91a7d9af9c7d0001',
    '0194f3c8b6b77c0d91a7d9af9c7d0003',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (tenant_id, user_id, org_id) DO NOTHING;

DELETE FROM auth_permission
WHERE tenant_id = current_setting('nebula.default_tenant_id')
  AND resource_type = 'MENU'
  AND resource_id = '0196dbe0a6f17000a000000000000023';

DELETE FROM auth_menu
WHERE tenant_id = current_setting('nebula.default_tenant_id')
  AND (id = '0196dbe0a6f17000a000000000000023'
   OR code = 'NOTIFY_SEND');

-- 「站内消息」管理菜单没有对应的前端页面（菜单组件注册表里没有 SiteMessagePage），
-- 已从种子菜单中移除；存量库若还有这一行，在此显式清理，并释放菜单 id ...025
-- 给下面复用了该 id 的「接口管理」。按 tenant_id + code 删除，避免误伤其他租户或 id 已改作他用的环境。
DELETE FROM auth_permission
WHERE tenant_id = current_setting('nebula.default_tenant_id')
  AND resource_type = 'MENU'
  AND resource_id IN (
    SELECT id FROM auth_menu
    WHERE tenant_id = current_setting('nebula.default_tenant_id')
      AND code = 'NOTIFY_SITE_MESSAGE'
  );

DELETE FROM auth_menu
WHERE tenant_id = current_setting('nebula.default_tenant_id')
  AND code = 'NOTIFY_SITE_MESSAGE';

INSERT INTO auth_menu (
    id, tenant_id, name, parent_id, path, sort, code, icon, component, type, status,
    hidden, external_url, visible_in_breadcrumb, visible_in_tab,
    active_menu_path, remark, create_time, update_time
) VALUES
    -- Dashboard
    (
        '0196dbe0a6f17000a000000000000001', current_setting('nebula.default_tenant_id'),
        'Dashboard',
        NULL,
        '/dashboard',
        1,
        'dashboard',
        'DashboardOutlined',
        'DashboardPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in dashboard menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 系统管理 (一级菜单组)
    (
        '0196dbe0a6f17000a000000000000002', current_setting('nebula.default_tenant_id'),
        '系统管理',
        NULL,
        '/system',
        100,
        'system-management',
        'SettingOutlined',
        NULL,
        'CATALOG',
        1,
        FALSE,
        NULL,
        TRUE,
        FALSE,
        NULL,
        'Built-in system management catalog menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 企业设置
    (
        '0196dbe0a6f17000a000000000000032', current_setting('nebula.default_tenant_id'),
        '企业设置',
        '0196dbe0a6f17000a000000000000002',
        '/system/settings/tenant',
        5,
        'TENANT_ENTERPRISE_SETTINGS',
        'ShopOutlined',
        'TenantEnterpriseSettingsPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in tenant enterprise settings menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 运营管理 (二级菜单组)
    (
        '0196dbe0a6f17000a000000000000003', current_setting('nebula.default_tenant_id'),
        '运营管理',
        '0196dbe0a6f17000a000000000000002',
        '/system/operation',
        11,
        'system-operation',
        'TeamOutlined',
        NULL,
        'CATALOG',
        1,
        FALSE,
        NULL,
        TRUE,
        FALSE,
        NULL,
        'Built-in operation management catalog menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 用户管理
    (
        '0196dbe0a6f17000a000000000000004', current_setting('nebula.default_tenant_id'),
        '用户管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/user',
        12,
        'system-operation-user',
        'UserOutlined',
        'UserManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in user management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 组织管理
    (
        '0196dbe0a6f17000a000000000000005', current_setting('nebula.default_tenant_id'),
        '组织管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/org',
        13,
        'system-operation-org',
        'ApartmentOutlined',
        'OrgManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in organization management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 角色管理
    (
        '0196dbe0a6f17000a000000000000006', current_setting('nebula.default_tenant_id'),
        '角色管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/role',
        14,
        'system-operation-role',
        'UserSwitchOutlined',
        'RoleManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in role management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 菜单管理
    (
        '0196dbe0a6f17000a000000000000007', current_setting('nebula.default_tenant_id'),
        '菜单管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/menu',
        15,
        'system-operation-menu',
        'MenuOutlined',
        'MenuManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in menu management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 按钮管理
    (
        '0196dbe0a6f17000a000000000000008', current_setting('nebula.default_tenant_id'),
        '按钮管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/button',
        16,
        'system-operation-button',
        'AppstoreOutlined',
        'ButtonManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in button management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 通知管理 (二级菜单组)
    (
        '0196dbe0a6f17000a000000000000020', current_setting('nebula.default_tenant_id'),
        '通知管理',
        '0196dbe0a6f17000a000000000000002',
        '/system/notify',
        17,
        'system-notify',
        'BellOutlined',
        NULL,
        'CATALOG',
        1,
        FALSE,
        NULL,
        TRUE,
        FALSE,
        NULL,
        'Built-in notify management catalog menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 通知模板
    (
        '0196dbe0a6f17000a000000000000021', current_setting('nebula.default_tenant_id'),
        '通知模板',
        '0196dbe0a6f17000a000000000000020',
        '/system/notify/template',
        18,
        'NOTIFY_TEMPLATE',
        'FileTextOutlined',
        'TemplateManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in notify template management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 公告管理
    (
        '0196dbe0a6f17000a000000000000022', current_setting('nebula.default_tenant_id'),
        '公告管理',
        '0196dbe0a6f17000a000000000000020',
        '/system/notify/announcement',
        19,
        'NOTIFY_ANNOUNCEMENT',
        'NotificationOutlined',
        'AnnouncementManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in announcement management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 通知记录
    (
        '0196dbe0a6f17000a000000000000024', current_setting('nebula.default_tenant_id'),
        '通知记录',
        '0196dbe0a6f17000a000000000000020',
        '/system/notify/record',
        20,
        'NOTIFY_RECORD',
        'HistoryOutlined',
        'NotifyRecordPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in notify record menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 渠道目标
    (
        '0196dbe0a6f17000a000000000000028', current_setting('nebula.default_tenant_id'),
        '渠道目标',
        '0196dbe0a6f17000a000000000000020',
        '/system/notify/channel-target',
        22,
        'NOTIFY_CHANNEL_TARGET',
        'LinkOutlined',
        'ChannelTargetManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in notify channel target management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 通知类别
    (
        '0196dbe0a6f17000a000000000000030', current_setting('nebula.default_tenant_id'),
        '通知类别',
        '0196dbe0a6f17000a000000000000020',
        '/system/notify/category',
        23,
        'NOTIFY_CATEGORY',
        'TagsOutlined',
        'CategoryManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in notify category management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 权限管理 (二级菜单组)
    (
        '0196dbe0a6f17000a000000000000009', current_setting('nebula.default_tenant_id'),
        '权限管理',
        '0196dbe0a6f17000a000000000000002',
        '/system/permission',
        20,
        'system-permission',
        'SafetyCertificateOutlined',
        NULL,
        'CATALOG',
        1,
        FALSE,
        NULL,
        TRUE,
        FALSE,
        NULL,
        'Built-in permission management catalog menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 菜单权限
    (
        '0196dbe0a6f17000a000000000000010', current_setting('nebula.default_tenant_id'),
        '菜单权限',
        '0196dbe0a6f17000a000000000000009',
        '/system/permission/menu-permission',
        21,
        'system-permission-menu',
        'LockOutlined',
        'MenuPermissionPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in menu permission page',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 按钮权限
    (
        '0196dbe0a6f17000a000000000000019', current_setting('nebula.default_tenant_id'),
        '按钮权限',
        '0196dbe0a6f17000a000000000000009',
        '/system/permission/button-permission',
        22,
        'system-permission-button',
        'SafetyCertificateOutlined',
        'ButtonPermissionPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in button permission page',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 系统配置 (二级菜单组)
    (
        '0196dbe0a6f17000a000000000000011', current_setting('nebula.default_tenant_id'),
        '系统配置',
        '0196dbe0a6f17000a000000000000002',
        '/system/config',
        30,
        'system-config',
        'ToolOutlined',
        NULL,
        'CATALOG',
        1,
        FALSE,
        NULL,
        TRUE,
        FALSE,
        NULL,
        'Built-in system configuration catalog menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 字典管理
    (
        '0196dbe0a6f17000a000000000000012', current_setting('nebula.default_tenant_id'),
        '字典管理',
        '0196dbe0a6f17000a000000000000011',
        '/system/config/dict',
        31,
        'system-config-dict',
        'BookOutlined',
        'DictManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in dictionary management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 参数管理
    (
        '0196dbe0a6f17000a000000000000013', current_setting('nebula.default_tenant_id'),
        '参数管理',
        '0196dbe0a6f17000a000000000000011',
        '/system/config/param',
        32,
        'system-config-param',
        'SettingOutlined',
        'ParamManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in parameter management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 高级配置
    (
        '0196dbe0a6f17000a000000000000014', current_setting('nebula.default_tenant_id'),
        '高级配置',
        '0196dbe0a6f17000a000000000000011',
        '/system/config/general',
        33,
        'system-config-general',
        'ControlOutlined',
        'GeneralConfigPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in general configuration menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 系统监控 (二级菜单组)
    (
        '0196dbe0a6f17000a000000000000015', current_setting('nebula.default_tenant_id'),
        '系统监控',
        '0196dbe0a6f17000a000000000000002',
        '/system/monitor',
        40,
        'system-monitor',
        'MonitorOutlined',
        NULL,
        'CATALOG',
        1,
        FALSE,
        NULL,
        TRUE,
        FALSE,
        NULL,
        'Built-in system monitoring catalog menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 审计日志
    (
        '0196dbe0a6f17000a000000000000016', current_setting('nebula.default_tenant_id'),
        '审计日志',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/audit-log',
        41,
        'system-monitor-audit-log',
        'FileSearchOutlined',
        'AuditLogPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in audit log menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 定时任务
    (
        '0196dbe0a6f17000a000000000000017', current_setting('nebula.default_tenant_id'),
        '定时任务',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/scheduled-task',
        42,
        'system-monitor-scheduled-task',
        'ClockCircleOutlined',
        'ScheduledTaskPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in scheduled task menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 事件记录
    (
        '0196dbe0a6f17000a000000000000018', current_setting('nebula.default_tenant_id'),
        '事件记录',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/event-log',
        43,
        'system-monitor-event-log',
        'HistoryOutlined',
        'EventLogPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in event log menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 缓存管理
    (
        '0196dbe0a6f17000a000000000000026', current_setting('nebula.default_tenant_id'),
        '缓存管理',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/cache-management',
        44,
        'system-monitor-cache-management',
        'DatabaseOutlined',
        'CacheManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in cache management menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 在线用户
    (
        '0196dbe0a6f17000a000000000000027', current_setting('nebula.default_tenant_id'),
        '在线用户',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/online-user',
        45,
        'system-monitor-online-user',
        'TeamOutlined',
        'OnlineUserPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in online user menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 登录日志
    (
        '0196dbe0a6f17000a000000000000029', current_setting('nebula.default_tenant_id'),
        '登录日志',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/login-log',
        46,
        'system-monitor-login-log',
        'LoginOutlined',
        'LoginLogPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in login log menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 接口管理（接口权限登记，按模块分组）
    (
        '0196dbe0a6f17000a000000000000025', current_setting('nebula.default_tenant_id'),
        '接口管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/api',
        17,
        'system-operation-api',
        'ApiOutlined',
        'ApiManagementPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in api permission registry menu',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    -- 接口权限（把接口权限授予主体）
    (
        '0196dbe0a6f17000a000000000000031', current_setting('nebula.default_tenant_id'),
        '接口权限',
        '0196dbe0a6f17000a000000000000009',
        '/system/permission/api-permission',
        23,
        'system-permission-api',
        'KeyOutlined',
        'ApiPermissionPage',
        'MENU',
        1,
        FALSE,
        NULL,
        TRUE,
        TRUE,
        NULL,
        'Built-in api permission assignment page',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    path = EXCLUDED.path,
    sort = EXCLUDED.sort,
    icon = EXCLUDED.icon,
    component = EXCLUDED.component,
    type = EXCLUDED.type,
    status = EXCLUDED.status,
    hidden = EXCLUDED.hidden,
    external_url = EXCLUDED.external_url,
    visible_in_breadcrumb = EXCLUDED.visible_in_breadcrumb,
    visible_in_tab = EXCLUDED.visible_in_tab,
    active_menu_path = EXCLUDED.active_menu_path,
    remark = EXCLUDED.remark,
    update_time = EXCLUDED.update_time;

-- 内置按钮（认证 / 通知 / 参数 / 调度 / 前端）
-- menu_id 必须指向真实存在的菜单：按钮权限页按菜单树逐个菜单拉取按钮，
-- menu_id 指向不存在的菜单会让按钮在授权页不可见、授不出去（静默失败）。
-- 新增按钮码时三件事缺一不可：所属模块的 *ButtonCodes 定义常量、控制器方法加
-- @NebulaPermission、在此处或对应版本增量脚本里登记同名 code 与真实 menu_id。
INSERT INTO auth_button (
    id, tenant_id, menu_id, code, name, type, sort, status, create_time, update_time
) VALUES
    ('0196dbe0a6f17000a000000000000201', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000004', 'AUTH_USER_CREATE', '新增用户', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000202', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000004', 'AUTH_USER_EDIT', '编辑用户', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000203', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000004', 'AUTH_USER_ASSIGN', '分配用户角色组织', 'assign', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000204', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000004', 'AUTH_USER_RESET_PASSWORD', '重置用户密码', 'reset-password', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000205', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000004', 'AUTH_USER_CHANGE_PASSWORD', '修改用户密码', 'change-password', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000206', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000004', 'AUTH_USER_DELETE', '删除用户', 'delete', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000207', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000006', 'AUTH_ROLE_CREATE', '新增角色', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000208', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000006', 'AUTH_ROLE_EDIT', '编辑角色', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000209', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000006', 'AUTH_ROLE_DELETE', '删除角色', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000210', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000005', 'AUTH_ORG_CREATE', '新增组织', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000211', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000005', 'AUTH_ORG_EDIT', '编辑组织', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000212', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000005', 'AUTH_ORG_DELETE', '删除组织', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000213', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000007', 'AUTH_MENU_CREATE', '新增菜单', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000214', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000007', 'AUTH_MENU_EDIT', '编辑菜单', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000215', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000007', 'AUTH_MENU_DELETE', '删除菜单', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000216', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000008', 'AUTH_BUTTON_CREATE', '新增按钮', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000217', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000008', 'AUTH_BUTTON_EDIT', '编辑按钮', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000218', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000008', 'AUTH_BUTTON_DELETE', '删除按钮', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000301', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000025', 'AUTH_API_CREATE', '新增接口权限', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000302', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000025', 'AUTH_API_EDIT', '编辑接口权限', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000303', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000025', 'AUTH_API_DELETE', '删除接口权限', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000219', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000019', 'AUTH_PERMISSION_CREATE', '新增授权', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000220', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000019', 'AUTH_PERMISSION_EDIT', '编辑授权', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000221', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000019', 'AUTH_PERMISSION_DELETE', '删除授权', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000222', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000010', 'AUTH_DATA_SCOPE_CREATE', '新增数据范围', 'add', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000223', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000010', 'AUTH_DATA_SCOPE_EDIT', '编辑数据范围', 'edit', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000224', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000010', 'AUTH_DATA_SCOPE_DELETE', '删除数据范围', 'delete', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000225', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000027', 'AUTH_ONLINE_USER_KICK_OUT', '踢出在线用户', 'kick-out', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000226', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000027', 'AUTH_ONLINE_USER_KICK_OUT_ALL', '踢出用户全部会话', 'kick-out-all', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000101', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000028', 'NOTIFY_CHANNEL_TARGET_CREATE', '新增渠道目标', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000102', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000028', 'NOTIFY_CHANNEL_TARGET_EDIT', '编辑渠道目标', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000103', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000028', 'NOTIFY_CHANNEL_TARGET_DELETE', '删除渠道目标', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000104', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_CREATE', '新增通知类别', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000105', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_EDIT', '编辑通知类别', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000106', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_DELETE', '删除通知类别', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000107', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_QUERY', '查询通知类别', 'query', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- 通知模块其余按钮
    ('0196dbe0a6f17000a000000000000108', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000021', 'NOTIFY_TEMPLATE_MANAGE', '管理通知模板', 'edit', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000109', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000021', 'NOTIFY_SEND', '发送通知', 'send', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a00000000000010a', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000022', 'NOTIFY_ANNOUNCEMENT_MANAGE', '管理公告', 'edit', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a00000000000010b', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000024', 'NOTIFY_RECORD_VIEW', '查看通知记录', 'query', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a00000000000010c', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000028', 'NOTIFY_CHANNEL_TARGET_QUERY', '查询渠道目标', 'query', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- 参数模块按钮
    ('0196dbe0a6f17000a000000000000501', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000013', 'PARAM_CREATE', '新增参数', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000502', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000013', 'PARAM_UPDATE', '编辑参数', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000503', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000013', 'PARAM_DELETE', '删除参数', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000504', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000014', 'PARAM_GENERAL_CONFIG_EDIT', '编辑高级配置', 'edit', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- 调度模块按钮
    ('0196dbe0a6f17000a000000000000601', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000017', 'SCHEDULER_JOB_MANAGE', '管理定时任务', 'edit', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000602', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000017', 'SCHEDULER_JOB_TRIGGER', '手动触发任务', 'trigger', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- 前端模块按钮
    ('0196dbe0a6f17000a000000000000701', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000026', 'FRONTEND_CACHE_DELETE', '清除前端缓存', 'delete', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- 企业设置按钮
    ('0196dbe0a6f17000a000000000000801', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000032', 'TENANT_PROFILE_QUERY', '查询企业资料', 'query', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000802', current_setting('nebula.default_tenant_id'), '0196dbe0a6f17000a000000000000032', 'TENANT_PROFILE_UPDATE', '编辑企业资料', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    sort = EXCLUDED.sort,
    status = EXCLUDED.status,
    update_time = EXCLUDED.update_time;

-- ----------------------------------------------------------------------------
-- auth-core / 接口权限种子数据
-- 这些权限码没有对应的界面控件，只做服务端准入，因此登记在 auth_api 而非 auth_button。
-- module 取值来自字典 param_module，供授权树分组展示。
-- 新增接口权限码时：在所属模块的 *ApiCodes 里定义常量、控制器上加 @NebulaApiPermission，
-- 并在此处（或对应的版本增量脚本）登记同名 code，缺一不可。
-- ----------------------------------------------------------------------------
INSERT INTO auth_api (
    id, tenant_id, code, name, module, sort, remark, status, create_time, update_time
) VALUES
    ('0196dbe0a6f17000a000000000000401', current_setting('nebula.default_tenant_id'), 'AUDIT_RECORD_VIEW', '审计记录查询', 'audit', 1, '审计记录分页与详情查询；界面上没有"查询"按钮，属列表接口准入', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000402', current_setting('nebula.default_tenant_id'), 'PARAM_GENERAL_CONFIG_QUERY', '通用配置查询', 'param', 2, '通用配置读取；前端初始化时按需拉取', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000403', current_setting('nebula.default_tenant_id'), 'FRONTEND_APP_RELEASE_QUERY', '应用版本查询', 'frontend', 3, '应用版本分页与详情查询，供升级提示使用', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000404', current_setting('nebula.default_tenant_id'), 'STORAGE_FILE_QUERY', '文件查询与下载', 'storage', 4, '正式文件详情、分页、按业务实体列出、下载与下载位置解析共用的准入码', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000405', current_setting('nebula.default_tenant_id'), 'FRONTEND_CACHE_QUERY', '动态缓存查询', 'frontend', 5, '动态缓存列表查询；响应会回传缓存条目值，属管理端调试准入码', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    sort = EXCLUDED.sort,
    remark = EXCLUDED.remark,
    status = EXCLUDED.status,
    update_time = EXCLUDED.update_time;

-- ----------------------------------------------------------------------------
-- auth-core / 系统租户完整模板
-- 系统租户不是可登录租户，只保存新建租户的默认组织、角色、管理员账号、菜单和权限目录。
-- 新建租户时由 TenantResourceProvisioner 从这里整体复制一份；复制出的账号默认 admin / 123456。
-- 使用 F 前缀生成系统租户侧资源 ID；默认租户保留上面的固定 ID，二者互不覆盖。
-- ----------------------------------------------------------------------------
INSERT INTO auth_role (
    id, tenant_id, code, name, description, status, create_time, update_time
) VALUES (
    'F194f3c8b6b77c0d91a7d9af9c7d0002',
    '__system__',
    'ADMIN',
    'Administrator',
    'Built-in administrator role',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    update_time = EXCLUDED.update_time;

INSERT INTO auth_org (
    id, tenant_id, name, parent_id, path, sort, code, type, status, create_time, update_time
) VALUES (
    'F194f3c8b6b77c0d91a7d9af9c7d0003',
    '__system__',
    'Nebula',
    NULL,
    '/',
    1,
    'ROOT',
    'COMPANY',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    path = EXCLUDED.path,
    sort = EXCLUDED.sort,
    type = EXCLUDED.type,
    status = EXCLUDED.status,
    update_time = EXCLUDED.update_time;

INSERT INTO auth_user (
    id, tenant_id, username, password, nickname, avatar, email, phone, status, create_time, update_time
) VALUES (
    'F194f3c8b6b77c0d91a7d9af9c7d0001',
    '__system__',
    'admin',
    '$2a$10$uHC/qtYABWJ2QGDv3F0btOOtUXJeFMyw6S.Zs/QqfcRxmHmfLiIaS',
    'Administrator',
    NULL,
    NULL,
    NULL,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    password = EXCLUDED.password,
    nickname = EXCLUDED.nickname,
    status = EXCLUDED.status,
    update_time = EXCLUDED.update_time;

INSERT INTO auth_user_role (
    id, tenant_id, user_id, role_id, create_time, update_time
) VALUES (
    'F194f3c8b6b77c0d91a7d9af9c7d0004',
    '__system__',
    'F194f3c8b6b77c0d91a7d9af9c7d0001',
    'F194f3c8b6b77c0d91a7d9af9c7d0002',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

INSERT INTO auth_user_org (
    id, tenant_id, user_id, org_id, is_main_org, create_time, update_time
) VALUES (
    'F194f3c8b6b77c0d91a7d9af9c7d0005',
    '__system__',
    'F194f3c8b6b77c0d91a7d9af9c7d0001',
    'F194f3c8b6b77c0d91a7d9af9c7d0003',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

INSERT INTO auth_menu (
    id, tenant_id, name, parent_id, path, sort, code, icon, component, type, status,
    hidden, external_url, visible_in_breadcrumb, visible_in_tab,
    active_menu_path, remark, create_time, update_time
)
SELECT
    ('F' || SUBSTRING(id FROM 2))::CHAR(32),
    '__system__',
    name,
    CASE WHEN parent_id IS NULL THEN NULL
         ELSE ('F' || SUBSTRING(parent_id FROM 2))::CHAR(32) END,
    path,
    sort,
    code,
    icon,
    component,
    type,
    status,
    hidden,
    external_url,
    visible_in_breadcrumb,
    visible_in_tab,
    active_menu_path,
    remark,
    create_time,
    update_time
FROM auth_menu
WHERE tenant_id = current_setting('nebula.default_tenant_id')
ON CONFLICT DO NOTHING;

INSERT INTO auth_button (
    id, tenant_id, menu_id, code, name, type, sort, status, create_time, update_time
)
SELECT
    ('F' || SUBSTRING(id FROM 2))::CHAR(32),
    '__system__',
    ('F' || SUBSTRING(menu_id FROM 2))::CHAR(32),
    code,
    name,
    type,
    sort,
    status,
    create_time,
    update_time
FROM auth_button
WHERE tenant_id = current_setting('nebula.default_tenant_id')
ON CONFLICT DO NOTHING;

INSERT INTO auth_api (
    id, tenant_id, code, name, module, sort, remark, status, create_time, update_time
)
SELECT
    ('F' || SUBSTRING(id FROM 2))::CHAR(32),
    '__system__',
    code,
    name,
    module,
    sort,
    remark,
    status,
    create_time,
    update_time
FROM auth_api
WHERE tenant_id = current_setting('nebula.default_tenant_id')
ON CONFLICT DO NOTHING;




-- ----------------------------------------------------------------------------
-- auth-core / oauth2 seed data
-- Notes: Keep this section intentionally empty by default.
--        Add environment-specific clients here during deployment.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Module: dict
-- Purpose: Seed dictionaries referenced by system parameters and management UI
-- ============================================================================
INSERT INTO sys_dict_type (
    id, tenant_id, code, name, remark, create_time, update_time
) VALUES
    ('019cf114a00070008000000000000001', current_setting('nebula.default_tenant_id'), 'param_module', '参数模块', '系统参数所属模块分类，用于按模块分组展示参数', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000002', current_setting('nebula.default_tenant_id'), 'common_enable_status', '启用状态', '通用启用/禁用状态，字典项值使用0/1编码', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000005', current_setting('nebula.default_tenant_id'), 'NOTIFY_CHANNEL_TYPE', '通知渠道', '通知发送支持的渠道类型', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    remark = EXCLUDED.remark,
    update_time = EXCLUDED.update_time;

INSERT INTO sys_dict_item (
    id, tenant_id, dict_code, name, item_value, sort, is_enabled, tag_color, remark, create_time, update_time
) VALUES
    ('019cf114a00070008000000000000011', current_setting('nebula.default_tenant_id'), 'param_module', '认证模块', 'auth', 1, TRUE, NULL, '认证授权相关参数', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000012', current_setting('nebula.default_tenant_id'), 'param_module', '字典模块', 'dict', 2, TRUE, NULL, '数据字典相关参数', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000013', current_setting('nebula.default_tenant_id'), 'param_module', '参数模块', 'param', 3, TRUE, NULL, '系统参数中心相关参数', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000014', current_setting('nebula.default_tenant_id'), 'param_module', '通知模块', 'notify', 4, TRUE, NULL, '公告通知相关参数', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000016', current_setting('nebula.default_tenant_id'), 'param_module', '存储模块', 'storage', 6, TRUE, NULL, '文件存储相关参数', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000017', current_setting('nebula.default_tenant_id'), 'param_module', '调度模块', 'scheduler', 7, TRUE, NULL, '任务调度相关参数', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000018', current_setting('nebula.default_tenant_id'), 'param_module', '前端配置模块', 'frontend', 8, TRUE, NULL, '前端初始化、主题、语言和布局相关参数', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000019', current_setting('nebula.default_tenant_id'), 'param_module', '审计模块', 'audit', 9, TRUE, NULL, '审计日志相关参数', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000021', current_setting('nebula.default_tenant_id'), 'common_enable_status', '禁用', '0', 1, TRUE, NULL, '禁用状态', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000022', current_setting('nebula.default_tenant_id'), 'common_enable_status', '启用', '1', 2, TRUE, NULL, '启用状态', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000041', current_setting('nebula.default_tenant_id'), 'NOTIFY_CHANNEL_TYPE', '站内信', 'SITE', 1, TRUE, NULL, '站内消息通知渠道', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000042', current_setting('nebula.default_tenant_id'), 'NOTIFY_CHANNEL_TYPE', '邮件', 'EMAIL', 2, TRUE, NULL, '邮件通知渠道', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000043', current_setting('nebula.default_tenant_id'), 'NOTIFY_CHANNEL_TYPE', '企业微信群机器人', 'WECOM_GROUP_WEBHOOK', 3, TRUE, NULL, '企业微信群机器人 Webhook 通知渠道', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000044', current_setting('nebula.default_tenant_id'), 'NOTIFY_CHANNEL_TYPE', '飞书群机器人', 'FEISHU_GROUP_WEBHOOK', 4, TRUE, NULL, '飞书群机器人 Webhook 通知渠道', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000045', current_setting('nebula.default_tenant_id'), 'NOTIFY_CHANNEL_TYPE', '钉钉群机器人', 'DINGTALK_GROUP_WEBHOOK', 5, TRUE, NULL, '钉钉群机器人 Webhook 通知渠道', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a0007000800000000000004b', current_setting('nebula.default_tenant_id'), 'NOTIFY_CHANNEL_TYPE', '移动推送', 'PUSH', 6, TRUE, NULL, '移动端推送通知渠道', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    dict_code = EXCLUDED.dict_code,
    name = EXCLUDED.name,
    item_value = EXCLUDED.item_value,
    sort = EXCLUDED.sort,
    is_enabled = EXCLUDED.is_enabled,
    tag_color = EXCLUDED.tag_color,
    remark = EXCLUDED.remark,
    update_time = EXCLUDED.update_time;

-- ============================================================================
-- Module: notify
-- Purpose: Seed built-in notification categories and templates
-- ============================================================================
-- 内置通知类别：模板的归类维度，用于按类控制用户是否接收。
-- code 是模板、发送记录与用户偏好共同引用的键，创建后不可修改；is_builtin=TRUE 不可删除。
INSERT INTO sys_notify_category (
    id, tenant_id, code, name, description, is_mandatory, is_default_enabled, sort, allowed_channels, is_builtin, is_enabled, remark, create_time, update_time
) VALUES
    ('019cf114a00070008000000000000046', current_setting('nebula.default_tenant_id'), 'SECURITY', '安全与账号', '登录异常、密码变更等账号安全提醒', TRUE, TRUE, 10, 'SITE,EMAIL,PUSH', TRUE, TRUE, '强制类别：忽略用户偏好，始终放行', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000047', current_setting('nebula.default_tenant_id'), 'TODO', '待办与审批', '指派给你的待办、审批与流转提醒', FALSE, TRUE, 20, 'SITE,PUSH', TRUE, TRUE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000048', current_setting('nebula.default_tenant_id'), 'BUSINESS', '业务提醒', '订单、库存等业务状态变化提醒', FALSE, TRUE, 30, 'SITE,PUSH', TRUE, TRUE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000049', current_setting('nebula.default_tenant_id'), 'ANNOUNCEMENT', '公告通知', '系统公告与运营通知', FALSE, TRUE, 40, 'SITE', TRUE, TRUE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a0007000800000000000004a', current_setting('nebula.default_tenant_id'), 'DEFAULT', '其他通知', '未归类通知的兜底类别', FALSE, TRUE, 90, 'SITE,EMAIL,PUSH', TRUE, TRUE, '未指定类别的模板与临时消息归入此类', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_mandatory = EXCLUDED.is_mandatory,
    is_default_enabled = EXCLUDED.is_default_enabled,
    sort = EXCLUDED.sort,
    allowed_channels = EXCLUDED.allowed_channels,
    is_builtin = EXCLUDED.is_builtin,
    is_enabled = EXCLUDED.is_enabled,
    remark = EXCLUDED.remark,
    update_time = EXCLUDED.update_time;

INSERT INTO sys_notify_template (
    id, tenant_id, template_code, template_name, remark, create_time, update_time
) VALUES (
    '019cf114a00090008000000000000001', current_setting('nebula.default_tenant_id'),
    'PASSWORD_RESET',
    '用户密码重置通知',
    '管理员重置用户密码后通知对应用户',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (tenant_id, template_code) DO UPDATE SET
    template_name = EXCLUDED.template_name,
    remark = EXCLUDED.remark,
    update_time = EXCLUDED.update_time;

INSERT INTO sys_notify_template_field (
    id, tenant_id, template_id, field_code, field_name, is_required, default_value, example_value, remark, create_time, update_time
) VALUES
    ('019cf114a00090008000000000000004', current_setting('nebula.default_tenant_id'), '019cf114a00090008000000000000001', 'userId', '接收用户ID', TRUE, NULL, 'user-1', '被重置密码的用户ID', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00090008000000000000005', current_setting('nebula.default_tenant_id'), '019cf114a00090008000000000000001', 'username', '登录账号', TRUE, NULL, 'alice', '被重置密码的登录账号', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00090008000000000000006', current_setting('nebula.default_tenant_id'), '019cf114a00090008000000000000001', 'nickname', '用户昵称', FALSE, '', 'Alice', '被重置密码的用户昵称', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, template_id, field_code) DO UPDATE SET
    field_name = EXCLUDED.field_name,
    is_required = EXCLUDED.is_required,
    default_value = EXCLUDED.default_value,
    example_value = EXCLUDED.example_value,
    remark = EXCLUDED.remark,
    update_time = EXCLUDED.update_time;

INSERT INTO sys_notify_template_variant (
    id, tenant_id, template_id, channel_type, subject_template, content_template, html_content_template,
    is_enabled, remark, create_time, update_time
) VALUES
    (
        '019cf114a00090008000000000000002', current_setting('nebula.default_tenant_id'),
        '019cf114a00090008000000000000001',
        'SITE',
        '密码已重置',
        '您的 Nebula 账号密码已由管理员重置。接收用户：[(${nickname})]（账号：[(${username})]，用户ID：[(${userId})]）。新密码请向管理员索取，或通过忘记密码流程自助重置。请登录后及时修改密码。重置时间：[(${notify.currentDateTime})]',
        NULL,
        TRUE,
        '密码重置站内信通知',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        '019cf114a00090008000000000000003', current_setting('nebula.default_tenant_id'),
        '019cf114a00090008000000000000001',
        'EMAIL',
        'Nebula 账号密码已重置',
        '您好，您的 Nebula 账号密码已由管理员重置。接收用户：[(${nickname})]（账号：[(${username})]，用户ID：[(${userId})]）。新密码请向管理员索取，或通过忘记密码流程自助重置。如非本人预期，请联系管理员。重置时间：[(${notify.currentDateTime})]',
        '<!DOCTYPE html><html lang="zh-CN" xmlns:th="http://www.thymeleaf.org"><body style="margin:0;padding:24px;font-family:Arial,sans-serif;color:#333;line-height:1.6;"><p>您好，</p><p>您的 Nebula 账号密码已由管理员重置。</p><p>接收用户：<strong th:text="${nickname}">用户</strong>（账号：<span th:text="${username}">account</span>，用户ID：<span th:text="${userId}">id</span>）</p><p>新密码请向管理员索取，或通过忘记密码流程自助重置。如非本人预期，请联系管理员。</p><p>重置时间：<span th:text="${notify.currentDateTime}">2026-01-01 00:00:00</span></p></body></html>',
        TRUE,
        '密码重置邮件通知',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (tenant_id, template_id, channel_type) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    content_template = EXCLUDED.content_template,
    html_content_template = EXCLUDED.html_content_template,
    is_enabled = EXCLUDED.is_enabled,
    remark = EXCLUDED.remark,
    update_time = EXCLUDED.update_time;

-- ============================================================================
-- Module: param
-- Sources: auth/02-auth-init-data-mysql.sql, param/02-param-init-data-mysql.sql
-- ============================================================================
INSERT INTO sys_param (
    id, tenant_id,
    param_key,
    param_name,
    description,
    param_value,
    data_type,
    option_code,
    module_code,
    is_builtin,
    create_time,
    update_time
) VALUES
    ('01959f0aa4d37c0d91a7d9af9c7d1001', current_setting('nebula.default_tenant_id'), 'login.username.allow-register', '用户名注册开关', '用户名密码登录固定开启，仅注册开关允许运行时调整', 'true', 'BOOLEAN', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1002', current_setting('nebula.default_tenant_id'), 'login.username.password-min-length', '用户名密码最小长度', '用户名注册密码最小长度', '8', 'INT', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1003', current_setting('nebula.default_tenant_id'), 'login.username.password-max-length', '用户名密码最大长度', '用户名注册密码最大长度', '20', 'INT', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1024', current_setting('nebula.default_tenant_id'), 'login.username.reset-default-password', '用户名重置默认密码', '管理员重置用户密码时使用的默认密码', '12345678', 'STRING', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1004', current_setting('nebula.default_tenant_id'), 'login.username.login-fail-max-count', '用户名登录失败最大次数', '用户名登录失败最大次数，0表示不开启失败锁定', '5', 'INT', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1005', current_setting('nebula.default_tenant_id'), 'login.username.lock-time-hours', '用户名锁定时长(小时)', '用户名登录锁定时长，按小时配置', '1', 'INT', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1006', current_setting('nebula.default_tenant_id'), 'login.phone.enabled', '手机号登录开关', '手机号登录开关', 'true', 'BOOLEAN', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1007', current_setting('nebula.default_tenant_id'), 'login.phone.allow-register', '手机号注册开关', '手机号注册开关', 'true', 'BOOLEAN', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1008', current_setting('nebula.default_tenant_id'), 'login.phone.code-expire-minutes', '手机号验证码有效期(分钟)', '手机号验证码有效期', '5', 'INT', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1009', current_setting('nebula.default_tenant_id'), 'login.phone.send-interval-seconds', '手机号验证码发送间隔(秒)', '手机号验证码发送间隔', '60', 'INT', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1010', current_setting('nebula.default_tenant_id'), 'login.email.enabled', '邮箱登录开关', '邮箱登录开关', 'true', 'BOOLEAN', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1011', current_setting('nebula.default_tenant_id'), 'login.email.allow-register', '邮箱注册开关', '邮箱注册开关', 'true', 'BOOLEAN', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1012', current_setting('nebula.default_tenant_id'), 'login.email.code-expire-minutes', '邮箱验证码有效期(分钟)', '邮箱验证码有效期', '10', 'INT', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1013', current_setting('nebula.default_tenant_id'), 'login.email.send-interval-seconds', '邮箱验证码发送间隔(秒)', '邮箱验证码发送间隔', '60', 'INT', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1014', current_setting('nebula.default_tenant_id'), 'login.oauth2.enabled', 'OAuth2登录开关', 'OAuth2登录总开关', 'true', 'BOOLEAN', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1015', current_setting('nebula.default_tenant_id'), 'login.oauth2.allow-register', 'OAuth2注册开关', 'OAuth2注册开关', 'true', 'BOOLEAN', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1038', current_setting('nebula.default_tenant_id'), 'login.oauth2.default-role-id', '自助注册默认角色ID', '自助注册自动建号（OAuth2 首登、用户名注册、手机号/邮箱首次登录）绑定的默认角色ID，留空则不绑定；填写的角色必须存在，否则建号失败', NULL, 'STRING', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1039', current_setting('nebula.default_tenant_id'), 'login.oauth2.default-org-id', '自助注册默认组织ID', '自助注册自动建号绑定的默认组织ID（标记为主组织），留空则不绑定；填写的组织必须存在，否则建号失败', NULL, 'STRING', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1020', current_setting('nebula.default_tenant_id'), 'login.oauth2.provider.github.enabled', 'GitHub登录开关', 'GitHub登录提供商开关', 'false', 'BOOLEAN', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1025', current_setting('nebula.default_tenant_id'), 'login.oauth2.provider.wechat.enabled', '微信登录开关', '微信登录提供商开关，覆盖网站应用（扫码）与小程序两个渠道', 'false', 'BOOLEAN', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1026', current_setting('nebula.default_tenant_id'), 'notify.email.smtp-host', 'SMTP服务器地址', '通知模块邮件SMTP服务器地址', '', 'STRING', NULL, 'notify', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1027', current_setting('nebula.default_tenant_id'), 'notify.email.smtp-port', 'SMTP端口', '通知模块邮件SMTP端口', '587', 'INT', NULL, 'notify', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1028', current_setting('nebula.default_tenant_id'), 'notify.email.security', 'SMTP加密方式', 'SMTP加密方式，可选 NONE、STARTTLS、SSL', 'STARTTLS', 'STRING', NULL, 'notify', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1029', current_setting('nebula.default_tenant_id'), 'notify.email.username', '邮箱账号', 'SMTP登录邮箱账号，同时作为邮件发件人', '', 'STRING', NULL, 'notify', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1030', current_setting('nebula.default_tenant_id'), 'notify.email.password', '邮箱密码', 'SMTP登录邮箱密码或授权码', '', 'STRING', NULL, 'notify', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1033', current_setting('nebula.default_tenant_id'), 'storage.upload.max-file-size', '单文件大小上限(MB)', '单个文件上传大小上限，单位 MB；必须不大于 application.yml 中 spring.servlet.multipart.max-file-size 的静态传输口径，否则请求会被容器提前以 413 拒绝；不变式 chunk-size <= chunk-threshold <= max-file-size', '100', 'INT', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1034', current_setting('nebula.default_tenant_id'), 'storage.upload.chunk-threshold', '分片上传阈值(MB)', '文件超过该值必须走分片上传，单位 MB；不变式 chunk-size <= chunk-threshold <= max-file-size', '10', 'INT', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1035', current_setting('nebula.default_tenant_id'), 'storage.upload.chunk-size', '分片大小(MB)', '分片上传的单片大小，单位 MB；不变式 chunk-size <= chunk-threshold <= max-file-size，且不超过 2047（超过会溢出 Integer 字节数）', '5', 'INT', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1036', current_setting('nebula.default_tenant_id'), 'storage.upload.allowed-extensions', '允许的扩展名', '允许上传的文件扩展名，逗号分隔，可带或不带前导点（jpg,png 与 .jpg,.png 等价），大小写不敏感，留空表示不限制', '', 'STRING', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1037', current_setting('nebula.default_tenant_id'), 'storage.upload.temp-retention-days', '临时任务保留天数', '临时上传任务及其临时文件的保留天数，超期由定时清理任务删除', '14', 'INT', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, param_key) DO UPDATE SET
    param_name = EXCLUDED.param_name,
    description = EXCLUDED.description,
    param_value = EXCLUDED.param_value,
    data_type = EXCLUDED.data_type,
    option_code = EXCLUDED.option_code,
    module_code = EXCLUDED.module_code,
    is_builtin = EXCLUDED.is_builtin,
    update_time = EXCLUDED.update_time;

-- ----------------------------------------------------------------------------
-- param / 租户集成参数
-- ----------------------------------------------------------------------------
-- 验证码通道、邮箱、存储后端都属于每个租户自己的配置，运行时只读当前租户的行。
-- 默认租户是超级管理员所在租户，平台级操作（创建租户、邀请成员）用默认租户的配置发送通知；
-- 其他租户各自维护配置，不存在跨租户兜底。
INSERT INTO sys_param (
    id, tenant_id,
    param_key,
    param_name,
    description,
    param_value,
    data_type,
    option_code,
    module_code,
    is_builtin,
    create_time,
    update_time
) VALUES
    ('01959f0aa4d37c0d91a7d9af9c7d1101', current_setting('nebula.default_tenant_id'), 'auth.code.email.provider', '邮箱验证码提供商', '邮箱验证码下发通道。builtin-smtp 使用本租户配置的 SMTP 邮箱；none 表示关闭', 'builtin-smtp', 'STRING', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1102', current_setting('nebula.default_tenant_id'), 'auth.code.sms.provider', '短信验证码提供商', '短信验证码下发通道。框架不内置短信实现，none 表示未接入', 'none', 'STRING', NULL, 'auth', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, param_key) DO UPDATE SET
    param_name = EXCLUDED.param_name,
    description = EXCLUDED.description,
    data_type = EXCLUDED.data_type,
    module_code = EXCLUDED.module_code,
    is_builtin = EXCLUDED.is_builtin,
    update_time = EXCLUDED.update_time;

-- 存储后端参数：每个租户都可独立选择后端，未配置时由代码默认值/启动配置兜底。
INSERT INTO sys_param (
    id, tenant_id,
    param_key,
    param_name,
    description,
    param_value,
    data_type,
    option_code,
    module_code,
    is_builtin,
    create_time,
    update_time
) VALUES
    ('01959f0aa4d37c0d91a7d9af9c7d1103', current_setting('nebula.default_tenant_id'), 'storage.backend.type', '存储后端类型', '正式文件存储后端：filesystem / db / minio / aliyun-oss / tencent-cos', 'filesystem', 'STRING', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1104', current_setting('nebula.default_tenant_id'), 'storage.backend.filesystem.base-dir', '文件系统存储根目录', 'storage.backend.type=filesystem 时的文件根目录', 'build/nebula-storage/files', 'STRING', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1105', current_setting('nebula.default_tenant_id'), 'storage.backend.endpoint', '对象存储 Endpoint', 'MinIO / 阿里云 OSS 的服务地址', '', 'STRING', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1106', current_setting('nebula.default_tenant_id'), 'storage.backend.region', '对象存储 Region', '腾讯云 COS 的地域，如 ap-guangzhou', '', 'STRING', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1107', current_setting('nebula.default_tenant_id'), 'storage.backend.bucket', '对象存储 Bucket', '正式文件写入的桶名称', 'nebula-storage', 'STRING', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1108', current_setting('nebula.default_tenant_id'), 'storage.backend.access-key', '对象存储 Access Key', '对象存储访问凭据，加密存储，接口不回显', '', 'STRING', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1109', current_setting('nebula.default_tenant_id'), 'storage.backend.secret-key', '对象存储 Secret Key', '对象存储访问密钥，加密存储，接口不回显', '', 'STRING', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1110', current_setting('nebula.default_tenant_id'), 'storage.backend.create-bucket-if-missing', 'Bucket 不存在时自动创建', '多数云厂商的 AK 无建桶权限，生产建议关闭', 'true', 'BOOLEAN', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1111', current_setting('nebula.default_tenant_id'), 'storage.backend.direct-download-enabled', '启用对象存储直链下载', '开启后客户端可通过预签名地址直接访问对象存储', 'false', 'BOOLEAN', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('01959f0aa4d37c0d91a7d9af9c7d1112', current_setting('nebula.default_tenant_id'), 'storage.backend.direct-download-expire-seconds', '直链有效期(秒)', '预签名下载地址有效期，上限 3600 秒', '300', 'INT', NULL, 'storage', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, param_key) DO UPDATE SET
    param_name = EXCLUDED.param_name,
    description = EXCLUDED.description,
    data_type = EXCLUDED.data_type,
    module_code = EXCLUDED.module_code,
    is_builtin = EXCLUDED.is_builtin,
    update_time = EXCLUDED.update_time;

-- ----------------------------------------------------------------------------
-- param / 加密标记
-- ----------------------------------------------------------------------------
-- 密钥不在库中（只来自环境变量 NEBULA_CRYPTO_KEY_*），这里只声明「哪些参数的值必须加密
-- 存储」。全新环境的种子值是明文，应用按「无 enc: 前缀即历史明文」直通读取，首次写入时
-- 自愈为密文；存量环境的值由幂等回填作业加密。
UPDATE sys_param
SET is_encrypted = TRUE
WHERE param_key IN (
    'notify.email.password',
    'login.username.reset-default-password',
    'storage.backend.access-key',
    'storage.backend.secret-key'
);

-- ----------------------------------------------------------------------------
-- param / 清理已废弃参数
-- ----------------------------------------------------------------------------
-- 上面是 upsert，删掉 INSERT 行不会删掉存量库中已有的记录，必须显式清理。
-- spring.servlet.multipart.* 是启动期装配项，参数中心改它不会生效（容器在请求解析阶段就已限流），
-- 现改由 application.yml 静态配置，并由 nebula-storage 启动自检保证口径不小于业务上限。
DELETE FROM sys_param
WHERE param_key IN (
    'spring.servlet.multipart.max-file-size',
    'spring.servlet.multipart.max-request-size'
);

-- ----------------------------------------------------------------------------
-- auth-core / 权限种子数据（基于 menu 和 button 表自动生成）
-- ----------------------------------------------------------------------------

-- 为 ADMIN 角色生成所有 MENU 类型权限
-- 使用 gen_random_uuid() 生成 UUID（PostgreSQL 13+ 内置支持）
INSERT INTO auth_permission (
    id, tenant_id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT
    REPLACE(gen_random_uuid()::text, '-', ''),
    current_setting('nebula.default_tenant_id'),
    'ROLE',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    'MENU',
    m.id,
    'Allow',
    'ALL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth_menu m
WHERE m.tenant_id = current_setting('nebula.default_tenant_id')
    ON CONFLICT (tenant_id, subject_type, subject_id, resource_type, resource_id) DO NOTHING;

-- 步骤 3：为 ADMIN 角色生成所有 BUTTON 类型权限
INSERT INTO auth_permission (
    id, tenant_id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT
    REPLACE(gen_random_uuid()::text, '-', ''),
    current_setting('nebula.default_tenant_id'),
    'ROLE',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    'BUTTON',
    b.id,
    'Allow',
    'ALL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth_button b
WHERE b.tenant_id = current_setting('nebula.default_tenant_id')
    ON CONFLICT (tenant_id, subject_type, subject_id, resource_type, resource_id) DO NOTHING;

-- 步骤 4：为 ADMIN 角色生成所有 API 类型权限
-- 接口权限是资源类型 API，与 MENU/BUTTON 并列，授权行同样落在 auth_permission
INSERT INTO auth_permission (
    id, tenant_id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT
    REPLACE(gen_random_uuid()::text, '-', ''),
    current_setting('nebula.default_tenant_id'),
    'ROLE',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    'API',
    a.id,
    'Allow',
    'ALL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth_api a
WHERE a.tenant_id = current_setting('nebula.default_tenant_id')
    ON CONFLICT (tenant_id, subject_type, subject_id, resource_type, resource_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- auth-core / 系统租户 ADMIN 权限模板
-- 系统租户的 ADMIN 角色持有全部模板资源的权限，新建租户复制时按新 ID 重新映射。
-- 使用 UNION ALL 一次覆盖 MENU / BUTTON / API 三类资源。
-- ----------------------------------------------------------------------------
INSERT INTO auth_permission (
    id, tenant_id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT
    REPLACE(gen_random_uuid()::text, '-', ''),
    '__system__',
    'ROLE',
    'F194f3c8b6b77c0d91a7d9af9c7d0002',
    r.resource_type,
    r.resource_id,
    'Allow',
    'ALL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT 'MENU' AS resource_type, id AS resource_id FROM auth_menu WHERE tenant_id = '__system__'
    UNION ALL
    SELECT 'BUTTON', id FROM auth_button WHERE tenant_id = '__system__'
    UNION ALL
    SELECT 'API', id FROM auth_api WHERE tenant_id = '__system__'
) r
ON CONFLICT (tenant_id, subject_type, subject_id, resource_type, resource_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 模板种子数据写入系统租户
-- 系统租户只作为新建租户的模板源：建租户时由各模块把字典/通知模板复制到目标租户，
-- 租户数据自包含，运行时不再回退系统租户。
-- sys_param 不写模板行：建租户时按代码定义物化该租户的全部内建参数默认值。
-- 主键与模板外键用 'S' + 原 ID 后 31 位重映射，保证与默认租户数据共存。
-- 字典项 path 不在此重写：建租户复制时由 DictTenantDataProvisioner 按 parent_id 重新生成。
-- ----------------------------------------------------------------------------
INSERT INTO sys_dict_type (id, tenant_id, code, name, remark, create_time, update_time)
SELECT 'S' || substr(id, 2), '__system__', code, name, remark, create_time, update_time
FROM sys_dict_type WHERE tenant_id = current_setting('nebula.default_tenant_id')
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO sys_dict_item (id, tenant_id, dict_code, name, parent_id, path, item_value,
                           sort, is_enabled, tag_color, remark, create_time, update_time)
SELECT 'S' || substr(id, 2), '__system__', dict_code, name,
       CASE WHEN parent_id IS NULL THEN NULL ELSE 'S' || substr(parent_id, 2) END,
       path, item_value, sort, is_enabled, tag_color, remark, create_time, update_time
FROM sys_dict_item WHERE tenant_id = current_setting('nebula.default_tenant_id')
ON CONFLICT DO NOTHING;

INSERT INTO sys_notify_category (id, tenant_id, code, name, description, is_mandatory,
                                 is_default_enabled, sort, allowed_channels, is_builtin,
                                 is_enabled, remark, create_time, update_time)
SELECT 'S' || substr(id, 2), '__system__', code, name, description, is_mandatory,
       is_default_enabled, sort, allowed_channels, is_builtin, is_enabled, remark, create_time, update_time
FROM sys_notify_category WHERE tenant_id = current_setting('nebula.default_tenant_id')
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO sys_notify_template (id, tenant_id, template_code, template_name, remark,
                                 category_code, create_time, update_time)
SELECT 'S' || substr(id, 2), '__system__', template_code, template_name, remark,
       category_code, create_time, update_time
FROM sys_notify_template WHERE tenant_id = current_setting('nebula.default_tenant_id')
ON CONFLICT (tenant_id, template_code) DO NOTHING;

INSERT INTO sys_notify_template_field (id, tenant_id, template_id, field_code, field_name,
                                       is_required, default_value, example_value, remark,
                                       create_time, update_time)
SELECT 'S' || substr(id, 2), '__system__', 'S' || substr(template_id, 2),
       field_code, field_name, is_required, default_value, example_value, remark, create_time, update_time
FROM sys_notify_template_field WHERE tenant_id = current_setting('nebula.default_tenant_id')
ON CONFLICT (tenant_id, template_id, field_code) DO NOTHING;

INSERT INTO sys_notify_template_variant (id, tenant_id, template_id, channel_type,
                                         subject_template, content_template,
                                         html_content_template, is_enabled,
                                         remark, create_time, update_time)
SELECT 'S' || substr(id, 2), '__system__', 'S' || substr(template_id, 2),
       channel_type, subject_template, content_template, html_content_template,
       is_enabled, remark, create_time, update_time
FROM sys_notify_template_variant WHERE tenant_id = current_setting('nebula.default_tenant_id')
ON CONFLICT (tenant_id, template_id, channel_type) DO NOTHING;
