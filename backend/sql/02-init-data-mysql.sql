-- ============================================================================
-- Nebula - Database Initial Data Script
-- File: 02-init-data-mysql.sql
-- Purpose: Initialize all module seed data (MySQL)
-- Usage: mysql -u root -p nebula < 02-init-data-mysql.sql
-- Notes:
--   1. Target database: MySQL 8.0+.
--   2. Execute this script after 01-init-structure-mysql.sql.
--   3. SQL sections are grouped by module for easier future maintenance.
-- ============================================================================

SET NAMES utf8mb4;

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

-- ----------------------------------------------------------------------------
-- auth-core / role seed data
-- ----------------------------------------------------------------------------
INSERT INTO auth_role (
    id, code, name, description, status, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    'ADMIN',
    'Administrator',
    'Built-in administrator role',
    1,
    NOW(),
    NOW()
) AS new_values ON DUPLICATE KEY UPDATE
    name = new_values.name,
    description = new_values.description,
    status = new_values.status,
    update_time = new_values.update_time;

-- ----------------------------------------------------------------------------
-- auth-core / organization seed data
-- ----------------------------------------------------------------------------
INSERT INTO auth_org (
    id, name, parent_id, path, sort, code, type, status, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0003',
    'Nebula',
    NULL,
    '/',
    1,
    'ROOT',
    'COMPANY',
    1,
    NOW(),
    NOW()
) AS new_values ON DUPLICATE KEY UPDATE
    name = new_values.name,
    path = new_values.path,
    sort = new_values.sort,
    type = new_values.type,
    status = new_values.status,
    update_time = new_values.update_time;

-- ----------------------------------------------------------------------------
-- auth-core / user seed data
-- Default admin seed
-- | Field | Value | Note |
-- | username | admin | default admin account |
-- | password | 123456 (BCrypt hashed) | 部署后请及时修改密码 |
-- | status | enabled (1) | |
-- ----------------------------------------------------------------------------
INSERT INTO auth_user (
    id, username, password, nickname, avatar, email, phone, status, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0001',
    'admin',
    '$2a$10$uHC/qtYABWJ2QGDv3F0btOOtUXJeFMyw6S.Zs/QqfcRxmHmfLiIaS',
    'Administrator',
    NULL,
    'admin@nebula.local',
    NULL,
    1,
    NOW(),
    NOW()
) AS new_values ON DUPLICATE KEY UPDATE
    password = new_values.password,
    nickname = new_values.nickname,
    email = new_values.email,
    status = new_values.status,
    update_time = new_values.update_time;

-- ----------------------------------------------------------------------------
-- auth-core / relation seed data
-- ----------------------------------------------------------------------------
INSERT INTO auth_user_role (
    id, user_id, role_id, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0004',
    '0194f3c8b6b77c0d91a7d9af9c7d0001',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    NOW(),
    NOW()
) AS new_values ON DUPLICATE KEY UPDATE
    update_time = new_values.update_time;

INSERT INTO auth_user_org (
    id, user_id, org_id, is_main_org, create_time, update_time
) VALUES (
    '0194f3c8b6b77c0d91a7d9af9c7d0005',
    '0194f3c8b6b77c0d91a7d9af9c7d0001',
    '0194f3c8b6b77c0d91a7d9af9c7d0003',
    1,
    NOW(),
    NOW()
) AS new_values ON DUPLICATE KEY UPDATE
    is_main_org = new_values.is_main_org,
    update_time = new_values.update_time;

-- ----------------------------------------------------------------------------
-- auth-core / menu seed data
-- Using INSERT ... ON DUPLICATE KEY UPDATE for MySQL
-- ----------------------------------------------------------------------------
DELETE FROM auth_permission
WHERE resource_type = 'MENU'
  AND resource_id = '0196dbe0a6f17000a000000000000023';

DELETE FROM auth_menu
WHERE id = '0196dbe0a6f17000a000000000000023'
   OR code = 'NOTIFY_SEND';

INSERT INTO auth_menu (
    id, name, parent_id, path, sort, code, icon, component, type, status,
    hidden, external_url, visible_in_breadcrumb, visible_in_tab,
    active_menu_path, remark, create_time, update_time
) VALUES
    -- Dashboard
    (
        '0196dbe0a6f17000a000000000000001',
        'Dashboard',
        NULL,
        '/dashboard',
        1,
        'dashboard',
        'DashboardOutlined',
        'DashboardPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in dashboard menu',
        NOW(),
        NOW()
    ),
    -- 系统管理 (一级菜单组)
    (
        '0196dbe0a6f17000a000000000000002',
        '系统管理',
        NULL,
        '/system',
        100,
        'system-management',
        'SettingOutlined',
        NULL,
        'CATALOG',
        1,
        0,
        NULL,
        1,
        0,
        NULL,
        'Built-in system management catalog menu',
        NOW(),
        NOW()
    ),
    -- 运营管理 (二级菜单组)
    (
        '0196dbe0a6f17000a000000000000003',
        '运营管理',
        '0196dbe0a6f17000a000000000000002',
        '/system/operation',
        11,
        'system-operation',
        'TeamOutlined',
        NULL,
        'CATALOG',
        1,
        0,
        NULL,
        1,
        0,
        NULL,
        'Built-in operation management catalog menu',
        NOW(),
        NOW()
    ),
    -- 用户管理
    (
        '0196dbe0a6f17000a000000000000004',
        '用户管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/user',
        12,
        'system-operation-user',
        'UserOutlined',
        'UserManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in user management menu',
        NOW(),
        NOW()
    ),
    -- 组织管理
    (
        '0196dbe0a6f17000a000000000000005',
        '组织管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/org',
        13,
        'system-operation-org',
        'ApartmentOutlined',
        'OrgManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in organization management menu',
        NOW(),
        NOW()
    ),
    -- 角色管理
    (
        '0196dbe0a6f17000a000000000000006',
        '角色管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/role',
        14,
        'system-operation-role',
        'UserSwitchOutlined',
        'RoleManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in role management menu',
        NOW(),
        NOW()
    ),
    -- 菜单管理
    (
        '0196dbe0a6f17000a000000000000007',
        '菜单管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/menu',
        15,
        'system-operation-menu',
        'MenuOutlined',
        'MenuManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in menu management menu',
        NOW(),
        NOW()
    ),
    -- 按钮管理
    (
        '0196dbe0a6f17000a000000000000008',
        '按钮管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/button',
        16,
        'system-operation-button',
        'AppstoreOutlined',
        'ButtonManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in button management menu',
        NOW(),
        NOW()
    ),
    -- 通知管理 (二级菜单组)
    (
        '0196dbe0a6f17000a000000000000020',
        '通知管理',
        '0196dbe0a6f17000a000000000000002',
        '/system/notify',
        17,
        'system-notify',
        'BellOutlined',
        NULL,
        'CATALOG',
        1,
        0,
        NULL,
        1,
        0,
        NULL,
        'Built-in notify management catalog menu',
        NOW(),
        NOW()
    ),
    -- 通知模板
    (
        '0196dbe0a6f17000a000000000000021',
        '通知模板',
        '0196dbe0a6f17000a000000000000020',
        '/system/notify/template',
        18,
        'NOTIFY_TEMPLATE',
        'FileTextOutlined',
        'TemplateManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in notify template management menu',
        NOW(),
        NOW()
    ),
    -- 公告管理
    (
        '0196dbe0a6f17000a000000000000022',
        '公告管理',
        '0196dbe0a6f17000a000000000000020',
        '/system/notify/announcement',
        19,
        'NOTIFY_ANNOUNCEMENT',
        'NotificationOutlined',
        'AnnouncementManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in announcement management menu',
        NOW(),
        NOW()
    ),
    -- 通知记录
    (
        '0196dbe0a6f17000a000000000000024',
        '通知记录',
        '0196dbe0a6f17000a000000000000020',
        '/system/notify/record',
        20,
        'NOTIFY_RECORD',
        'HistoryOutlined',
        'NotifyRecordPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in notify record menu',
        NOW(),
        NOW()
    ),
    -- 渠道目标
    (
        '0196dbe0a6f17000a000000000000028',
        '渠道目标',
        '0196dbe0a6f17000a000000000000020',
        '/system/notify/channel-target',
        22,
        'NOTIFY_CHANNEL_TARGET',
        'LinkOutlined',
        'ChannelTargetManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in notify channel target management menu',
        NOW(),
        NOW()
    ),
    -- 权限管理 (二级菜单组)
    (
        '0196dbe0a6f17000a000000000000009',
        '权限管理',
        '0196dbe0a6f17000a000000000000002',
        '/system/permission',
        20,
        'system-permission',
        'SafetyCertificateOutlined',
        NULL,
        'CATALOG',
        1,
        0,
        NULL,
        1,
        0,
        NULL,
        'Built-in permission management catalog menu',
        NOW(),
        NOW()
    ),
    -- 菜单权限
    (
        '0196dbe0a6f17000a000000000000010',
        '菜单权限',
        '0196dbe0a6f17000a000000000000009',
        '/system/permission/menu-permission',
        21,
        'system-permission-menu',
        'LockOutlined',
        'MenuPermissionPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in menu permission page',
        NOW(),
        NOW()
    ),
    -- 按钮权限
    (
        '0196dbe0a6f17000a000000000000019',
        '按钮权限',
        '0196dbe0a6f17000a000000000000009',
        '/system/permission/button-permission',
        22,
        'system-permission-button',
        'SafetyCertificateOutlined',
        'ButtonPermissionPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in button permission page',
        NOW(),
        NOW()
    ),
    -- 系统配置 (二级菜单组)
    (
        '0196dbe0a6f17000a000000000000011',
        '系统配置',
        '0196dbe0a6f17000a000000000000002',
        '/system/config',
        30,
        'system-config',
        'ToolOutlined',
        NULL,
        'CATALOG',
        1,
        0,
        NULL,
        1,
        0,
        NULL,
        'Built-in system configuration catalog menu',
        NOW(),
        NOW()
    ),
    -- 字典管理
    (
        '0196dbe0a6f17000a000000000000012',
        '字典管理',
        '0196dbe0a6f17000a000000000000011',
        '/system/config/dict',
        31,
        'system-config-dict',
        'BookOutlined',
        'DictManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in dictionary management menu',
        NOW(),
        NOW()
    ),
    -- 参数管理
    (
        '0196dbe0a6f17000a000000000000013',
        '参数管理',
        '0196dbe0a6f17000a000000000000011',
        '/system/config/param',
        32,
        'system-config-param',
        'SettingOutlined',
        'ParamManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in parameter management menu',
        NOW(),
        NOW()
    ),
    -- 高级配置
    (
        '0196dbe0a6f17000a000000000000014',
        '高级配置',
        '0196dbe0a6f17000a000000000000011',
        '/system/config/general',
        33,
        'system-config-general',
        'ControlOutlined',
        'GeneralConfigPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in general configuration menu',
        NOW(),
        NOW()
    ),
    -- 系统监控 (二级菜单组)
    (
        '0196dbe0a6f17000a000000000000015',
        '系统监控',
        '0196dbe0a6f17000a000000000000002',
        '/system/monitor',
        40,
        'system-monitor',
        'MonitorOutlined',
        NULL,
        'CATALOG',
        1,
        0,
        NULL,
        1,
        0,
        NULL,
        'Built-in system monitoring catalog menu',
        NOW(),
        NOW()
    ),
    -- 审计日志
    (
        '0196dbe0a6f17000a000000000000016',
        '审计日志',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/audit-log',
        41,
        'system-monitor-audit-log',
        'FileSearchOutlined',
        'AuditLogPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in audit log menu',
        NOW(),
        NOW()
    ),
    -- 定时任务
    (
        '0196dbe0a6f17000a000000000000017',
        '定时任务',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/scheduled-task',
        42,
        'system-monitor-scheduled-task',
        'ClockCircleOutlined',
        'ScheduledTaskPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in scheduled task menu',
        NOW(),
        NOW()
    ),
    -- 事件记录
    (
        '0196dbe0a6f17000a000000000000018',
        '事件记录',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/event-log',
        43,
        'system-monitor-event-log',
        'HistoryOutlined',
        'EventLogPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in event log menu',
        NOW(),
        NOW()
    ),
    -- 缓存管理
    (
        '0196dbe0a6f17000a000000000000026',
        '缓存管理',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/cache-management',
        44,
        'system-monitor-cache-management',
        'DatabaseOutlined',
        'CacheManagementPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in cache management menu',
        NOW(),
        NOW()
    ),
    -- 在线用户
    (
        '0196dbe0a6f17000a000000000000027',
        '在线用户',
        '0196dbe0a6f17000a000000000000015',
        '/system/monitor/online-user',
        45,
        'system-monitor-online-user',
        'TeamOutlined',
        'OnlineUserPage',
        'MENU',
        1,
        0,
        NULL,
        1,
        1,
        NULL,
        'Built-in online user menu',
        NOW(),
        NOW()
    )
AS new_values ON DUPLICATE KEY UPDATE
    name = new_values.name,
    parent_id = new_values.parent_id,
    path = new_values.path,
    sort = new_values.sort,
    icon = new_values.icon,
    component = new_values.component,
    type = new_values.type,
    status = new_values.status,
    hidden = new_values.hidden,
    external_url = new_values.external_url,
    visible_in_breadcrumb = new_values.visible_in_breadcrumb,
    visible_in_tab = new_values.visible_in_tab,
    active_menu_path = new_values.active_menu_path,
    remark = new_values.remark,
    update_time = new_values.update_time;

-- 认证与通知按钮
INSERT INTO auth_button (
    id, menu_id, code, name, type, sort, status, create_time, update_time
) VALUES
    ('0196dbe0a6f17000a000000000000201', '0196dbe0a6f17000a000000000000004', 'AUTH_USER_CREATE', '新增用户', 'add', 1, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000202', '0196dbe0a6f17000a000000000000004', 'AUTH_USER_EDIT', '编辑用户', 'edit', 2, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000203', '0196dbe0a6f17000a000000000000004', 'AUTH_USER_ASSIGN', '分配用户角色组织', 'assign', 3, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000204', '0196dbe0a6f17000a000000000000004', 'AUTH_USER_RESET_PASSWORD', '重置用户密码', 'reset-password', 4, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000205', '0196dbe0a6f17000a000000000000004', 'AUTH_USER_CHANGE_PASSWORD', '修改用户密码', 'change-password', 5, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000206', '0196dbe0a6f17000a000000000000004', 'AUTH_USER_DELETE', '删除用户', 'delete', 6, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000207', '0196dbe0a6f17000a000000000000006', 'AUTH_ROLE_CREATE', '新增角色', 'add', 1, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000208', '0196dbe0a6f17000a000000000000006', 'AUTH_ROLE_EDIT', '编辑角色', 'edit', 2, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000209', '0196dbe0a6f17000a000000000000006', 'AUTH_ROLE_DELETE', '删除角色', 'delete', 3, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000210', '0196dbe0a6f17000a000000000000005', 'AUTH_ORG_CREATE', '新增组织', 'add', 1, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000211', '0196dbe0a6f17000a000000000000005', 'AUTH_ORG_EDIT', '编辑组织', 'edit', 2, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000212', '0196dbe0a6f17000a000000000000005', 'AUTH_ORG_DELETE', '删除组织', 'delete', 3, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000213', '0196dbe0a6f17000a000000000000007', 'AUTH_MENU_CREATE', '新增菜单', 'add', 1, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000214', '0196dbe0a6f17000a000000000000007', 'AUTH_MENU_EDIT', '编辑菜单', 'edit', 2, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000215', '0196dbe0a6f17000a000000000000007', 'AUTH_MENU_DELETE', '删除菜单', 'delete', 3, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000216', '0196dbe0a6f17000a000000000000008', 'AUTH_BUTTON_CREATE', '新增按钮', 'add', 1, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000217', '0196dbe0a6f17000a000000000000008', 'AUTH_BUTTON_EDIT', '编辑按钮', 'edit', 2, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000218', '0196dbe0a6f17000a000000000000008', 'AUTH_BUTTON_DELETE', '删除按钮', 'delete', 3, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000219', '0196dbe0a6f17000a000000000000019', 'AUTH_PERMISSION_CREATE', '新增授权', 'add', 1, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000220', '0196dbe0a6f17000a000000000000019', 'AUTH_PERMISSION_EDIT', '编辑授权', 'edit', 2, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000221', '0196dbe0a6f17000a000000000000019', 'AUTH_PERMISSION_DELETE', '删除授权', 'delete', 3, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000222', '0196dbe0a6f17000a000000000000010', 'AUTH_DATA_SCOPE_CREATE', '新增数据范围', 'add', 4, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000223', '0196dbe0a6f17000a000000000000010', 'AUTH_DATA_SCOPE_EDIT', '编辑数据范围', 'edit', 5, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000224', '0196dbe0a6f17000a000000000000010', 'AUTH_DATA_SCOPE_DELETE', '删除数据范围', 'delete', 6, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000225', '0196dbe0a6f17000a000000000000027', 'AUTH_ONLINE_USER_KICK_OUT', '踢出在线用户', 'kick-out', 1, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000101', '0196dbe0a6f17000a000000000000028', 'NOTIFY_CHANNEL_TARGET_CREATE', '新增渠道目标', 'add', 1, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000102', '0196dbe0a6f17000a000000000000028', 'NOTIFY_CHANNEL_TARGET_EDIT', '编辑渠道目标', 'edit', 2, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000103', '0196dbe0a6f17000a000000000000028', 'NOTIFY_CHANNEL_TARGET_DELETE', '删除渠道目标', 'delete', 3, 1, NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    menu_id = new_values.menu_id,
    name = new_values.name,
    type = new_values.type,
    sort = new_values.sort,
    status = new_values.status,
    update_time = new_values.update_time;

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
    id, code, name, remark, create_time, update_time
) VALUES
    ('019cf114a00070008000000000000001', 'param_module', '参数模块', '系统参数所属模块分类，用于按模块分组展示参数', NOW(), NOW()),
    ('019cf114a00070008000000000000002', 'common_enable_status', '启用状态', '通用启用/禁用状态，字典项值使用0/1编码', NOW(), NOW()),
    ('019cf114a00070008000000000000004', 'audit_action', '审计动作', '审计动作编码与中文名称映射', NOW(), NOW()),
    ('019cf114a00070008000000000000005', 'NOTIFY_CHANNEL_TYPE', '通知渠道', '通知发送支持的渠道类型', NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    name = new_values.name,
    remark = new_values.remark,
    update_time = new_values.update_time;

INSERT INTO sys_dict_item (
    id, dict_code, name, item_value, sort, is_enabled, tag_color, remark, create_time, update_time
) VALUES
    ('019cf114a00070008000000000000011', 'param_module', '认证模块', 'auth', 1, 1, NULL, '认证授权相关参数', NOW(), NOW()),
    ('019cf114a00070008000000000000012', 'param_module', '字典模块', 'dict', 2, 1, NULL, '数据字典相关参数', NOW(), NOW()),
    ('019cf114a00070008000000000000013', 'param_module', '参数模块', 'param', 3, 1, NULL, '系统参数中心相关参数', NOW(), NOW()),
    ('019cf114a00070008000000000000014', 'param_module', '通知模块', 'notify', 4, 1, NULL, '公告通知相关参数', NOW(), NOW()),
    ('019cf114a00070008000000000000015', 'param_module', '通信模块', 'comms', 5, 1, NULL, '企业通信平台相关参数', NOW(), NOW()),
    ('019cf114a00070008000000000000016', 'param_module', '存储模块', 'storage', 6, 1, NULL, '文件存储相关参数', NOW(), NOW()),
    ('019cf114a00070008000000000000017', 'param_module', '调度模块', 'scheduler', 7, 1, NULL, '任务调度相关参数', NOW(), NOW()),
    ('019cf114a00070008000000000000018', 'param_module', '前端配置模块', 'frontend', 8, 1, NULL, '前端初始化、主题、语言和布局相关参数', NOW(), NOW()),
    ('019cf114a00070008000000000000019', 'param_module', '审计模块', 'audit', 9, 1, NULL, '审计日志相关参数', NOW(), NOW()),
    ('019cf114a00070008000000000000021', 'common_enable_status', '禁用', '0', 1, 1, NULL, '禁用状态', NOW(), NOW()),
    ('019cf114a00070008000000000000022', 'common_enable_status', '启用', '1', 2, 1, NULL, '启用状态', NOW(), NOW()),
    ('019cf114a00070008000000000000041', 'NOTIFY_CHANNEL_TYPE', '站内信', 'SITE', 1, 1, NULL, '站内消息通知渠道', NOW(), NOW()),
    ('019cf114a00070008000000000000042', 'NOTIFY_CHANNEL_TYPE', '邮件', 'EMAIL', 2, 1, NULL, '邮件通知渠道', NOW(), NOW()),
    ('019cf114a00070008000000000000043', 'NOTIFY_CHANNEL_TYPE', '企业微信群机器人', 'WECOM_GROUP_WEBHOOK', 3, 1, NULL, '企业微信群机器人 Webhook 通知渠道', NOW(), NOW()),
    ('019cf114a00070008000000000000044', 'NOTIFY_CHANNEL_TYPE', '飞书群机器人', 'FEISHU_GROUP_WEBHOOK', 4, 1, NULL, '飞书群机器人 Webhook 通知渠道', NOW(), NOW()),
    ('019cf114a00070008000000000000045', 'NOTIFY_CHANNEL_TYPE', '钉钉群机器人', 'DINGTALK_GROUP_WEBHOOK', 5, 1, NULL, '钉钉群机器人 Webhook 通知渠道', NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    dict_code = new_values.dict_code,
    name = new_values.name,
    item_value = new_values.item_value,
    sort = new_values.sort,
    is_enabled = new_values.is_enabled,
    tag_color = new_values.tag_color,
    remark = new_values.remark,
    update_time = new_values.update_time;

-- ============================================================================
-- Module: notify
-- Purpose: Seed built-in notification templates
-- ============================================================================
INSERT INTO sys_notify_template (
    id, template_code, template_name, remark, create_time, update_time
) VALUES (
    '019cf114a00090008000000000000001',
    'PASSWORD_RESET',
    '用户密码重置通知',
    '管理员重置用户密码后通知对应用户',
    NOW(),
    NOW()
)
AS new_values ON DUPLICATE KEY UPDATE
    template_name = new_values.template_name,
    remark = new_values.remark,
    update_time = new_values.update_time;

INSERT INTO sys_notify_template_field (
    id, template_id, field_code, field_name, is_required, default_value, example_value, remark, create_time, update_time
) VALUES
    ('019cf114a00090008000000000000004', '019cf114a00090008000000000000001', 'userId', '接收用户ID', 1, NULL, 'user-1', '被重置密码的用户ID', NOW(), NOW()),
    ('019cf114a00090008000000000000005', '019cf114a00090008000000000000001', 'username', '登录账号', 1, NULL, 'alice', '被重置密码的登录账号', NOW(), NOW()),
    ('019cf114a00090008000000000000006', '019cf114a00090008000000000000001', 'nickname', '用户昵称', 0, '', 'Alice', '被重置密码的用户昵称', NOW(), NOW()),
    ('019cf114a00090008000000000000007', '019cf114a00090008000000000000001', 'defaultPassword', '重置后密码', 1, NULL, '12345678', '管理员重置后的默认密码', NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    field_name = new_values.field_name,
    is_required = new_values.is_required,
    default_value = new_values.default_value,
    example_value = new_values.example_value,
    remark = new_values.remark,
    update_time = new_values.update_time;

INSERT INTO sys_notify_template_variant (
    id, template_id, channel_type, subject_template, content_template, is_enabled, remark, create_time, update_time
) VALUES
    (
        '019cf114a00090008000000000000002',
        '019cf114a00090008000000000000001',
        'SITE',
        '密码已重置',
        '您的 Nebula 账号密码已由管理员重置。接收用户：${nickname}（账号：${username}，用户ID：${userId}）。重置后密码：${defaultPassword}。请登录后及时修改密码。重置时间：${notify.currentDateTime}',
        1,
        '密码重置站内信通知',
        NOW(),
        NOW()
    ),
    (
        '019cf114a00090008000000000000003',
        '019cf114a00090008000000000000001',
        'EMAIL',
        'Nebula 账号密码已重置',
        '您好，您的 Nebula 账号密码已由管理员重置。接收用户：${nickname}（账号：${username}，用户ID：${userId}）。重置后密码：${defaultPassword}。请登录后及时修改密码。如非本人预期，请联系管理员。重置时间：${notify.currentDateTime}',
        1,
        '密码重置邮件通知',
        NOW(),
        NOW()
    )
AS new_values ON DUPLICATE KEY UPDATE
    subject_template = new_values.subject_template,
    content_template = new_values.content_template,
    is_enabled = new_values.is_enabled,
    remark = new_values.remark,
    update_time = new_values.update_time;

-- ============================================================================
-- Module: param
-- Sources: auth/02-auth-init-data-mysql.sql, param/02-param-init-data-mysql.sql
-- ============================================================================
INSERT INTO sys_param (
    id,
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
    ('01959f0aa4d37c0d91a7d9af9c7d1001', 'login.username.allow-register', '用户名注册开关', '用户名密码登录固定开启，仅注册开关允许运行时调整', 'true', 'BOOLEAN', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1002', 'login.username.password-min-length', '用户名密码最小长度', '用户名注册密码最小长度', '8', 'INT', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1003', 'login.username.password-max-length', '用户名密码最大长度', '用户名注册密码最大长度', '20', 'INT', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1024', 'login.username.reset-default-password', '用户名重置默认密码', '管理员重置用户密码时使用的默认密码', '12345678', 'STRING', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1004', 'login.username.login-fail-max-count', '用户名登录失败最大次数', '用户名登录失败最大次数，0表示不开启失败锁定', '5', 'INT', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1005', 'login.username.lock-time-hours', '用户名锁定时长(小时)', '用户名登录锁定时长，按小时配置', '1', 'INT', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1006', 'login.phone.enabled', '手机号登录开关', '手机号登录开关', 'true', 'BOOLEAN', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1007', 'login.phone.allow-register', '手机号注册开关', '手机号注册开关', 'true', 'BOOLEAN', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1008', 'login.phone.code-expire-minutes', '手机号验证码有效期(分钟)', '手机号验证码有效期', '5', 'INT', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1009', 'login.phone.send-interval-seconds', '手机号验证码发送间隔(秒)', '手机号验证码发送间隔', '60', 'INT', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1010', 'login.email.enabled', '邮箱登录开关', '邮箱登录开关', 'true', 'BOOLEAN', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1011', 'login.email.allow-register', '邮箱注册开关', '邮箱注册开关', 'true', 'BOOLEAN', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1012', 'login.email.code-expire-minutes', '邮箱验证码有效期(分钟)', '邮箱验证码有效期', '10', 'INT', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1013', 'login.email.send-interval-seconds', '邮箱验证码发送间隔(秒)', '邮箱验证码发送间隔', '60', 'INT', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1014', 'login.oauth2.enabled', 'OAuth2登录开关', 'OAuth2登录总开关', 'true', 'BOOLEAN', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1015', 'login.oauth2.allow-register', 'OAuth2注册开关', 'OAuth2注册开关', 'true', 'BOOLEAN', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1020', 'login.oauth2.provider.github.enabled', 'GitHub登录开关', 'GitHub登录提供商开关', 'false', 'BOOLEAN', NULL, 'auth', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1021', 'audit.request.max.length', '审计请求参数最大长度', '审计请求参数JSON最大字符数', '4000', 'INT', NULL, 'audit', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1022', 'audit.response.max.length', '审计响应数据最大长度', '审计响应数据JSON最大字符数', '4000', 'INT', NULL, 'audit', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1023', 'audit.retention.days', '审计记录保留天数', '审计记录定时清理保留天数', '180', 'INT', NULL, 'audit', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1026', 'notify.email.smtp-host', 'SMTP服务器地址', '通知模块邮件SMTP服务器地址', '', 'STRING', NULL, 'notify', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1027', 'notify.email.smtp-port', 'SMTP端口', '通知模块邮件SMTP端口', '587', 'INT', NULL, 'notify', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1028', 'notify.email.security', 'SMTP加密方式', 'SMTP加密方式，可选 NONE、STARTTLS、SSL', 'STARTTLS', 'STRING', NULL, 'notify', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1029', 'notify.email.username', '邮箱账号', 'SMTP登录邮箱账号，同时作为邮件发件人', '', 'STRING', NULL, 'notify', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1030', 'notify.email.password', '邮箱密码', 'SMTP登录邮箱密码或授权码', '', 'STRING', NULL, 'notify', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1031', 'spring.servlet.multipart.max-file-size', '单文件上传上限', 'Spring multipart 单个文件大小上限，例如 100MB，超过后可能触发 content too large/413', '100MB', 'STRING', NULL, 'storage', 1, NOW(), NOW()),
    ('01959f0aa4d37c0d91a7d9af9c7d1032', 'spring.servlet.multipart.max-request-size', '单次请求上传上限', 'Spring multipart 单次请求总大小上限，例如 120MB，分片上传时应不小于单片文件大小', '120MB', 'STRING', NULL, 'storage', 1, NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    param_name = new_values.param_name,
    description = new_values.description,
    param_value = new_values.param_value,
    data_type = new_values.data_type,
    option_code = new_values.option_code,
    module_code = new_values.module_code,
    is_builtin = new_values.is_builtin,
    update_time = new_values.update_time;

-- ----------------------------------------------------------------------------
-- auth-core / 权限种子数据（基于 menu 和 button 表自动生成）
-- MySQL 使用预生成的 UUID 替代 PostgreSQL 的 gen_random_uuid()
-- ----------------------------------------------------------------------------

-- 为 ADMIN 角色生成所有 MENU 类型权限
-- 使用 REPLACE(UUID(), '-', '') 生成32位无横线UUID
INSERT INTO auth_permission (
    id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT
    REPLACE(UUID(), '-', ''),
    'ROLE',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    'MENU',
    m.id,
    'Allow',
    'ALL',
    NOW(),
    NOW()
FROM auth_menu m
WHERE NOT EXISTS (
    SELECT 1 FROM auth_permission p
    WHERE p.subject_type = 'ROLE'
      AND p.subject_id = '0194f3c8b6b77c0d91a7d9af9c7d0002'
      AND p.resource_type = 'MENU'
      AND p.resource_id = m.id
);

-- 为 ADMIN 角色生成所有 BUTTON 类型权限
INSERT INTO auth_permission (
    id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT
    REPLACE(UUID(), '-', ''),
    'ROLE',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    'BUTTON',
    b.id,
    'Allow',
    'ALL',
    NOW(),
    NOW()
FROM auth_button b
WHERE NOT EXISTS (
    SELECT 1 FROM auth_permission p
    WHERE p.subject_type = 'ROLE'
      AND p.subject_id = '0194f3c8b6b77c0d91a7d9af9c7d0002'
      AND p.resource_type = 'BUTTON'
      AND p.resource_id = b.id
);
