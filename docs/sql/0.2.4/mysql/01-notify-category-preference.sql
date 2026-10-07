-- ============================================================================
-- Nebula - Upgrade Script
-- 目标版本：待定（MySQL）；本目录为 unreleased，发版时整体更名为新版本号
-- Purpose: 通知类别可管理化与订阅偏好（能力 #7）
--   1. sys_notify_template 增加 category_code（可空，空值归入 DEFAULT 类别）
--   2. sys_notify_record 增加 category_code（可空；抑制复用既有 send_status/fail_reason，不新增列）
--   3. 新增 sys_notify_category（可管理的通知类别）并写入 5 条内置类别种子
--   4. 新增 sys_notify_user_preference（类别 × 渠道 × 开关）
--   5. 删除 sys_notify_user_setting（免打扰功能整体下线）
--   6. 新增「通知类别」菜单与 4 个按钮权限，并授予 ADMIN
-- Notes:
--   1. 幂等：列与索引通过 INFORMATION_SCHEMA 判断；表用 CREATE TABLE IF NOT EXISTS；
--      种子数据用 INSERT ... ON DUPLICATE KEY UPDATE；权限用 NOT EXISTS 去重。
--   2. category_code 必须可空，且**不要**把存量模板批量回填成某个具体类别——
--      回填会改变现有行为，DEFAULT 兜底才是等价的。
--   3. sys_notify_category.code 是模板、发送记录与用户偏好共同引用的键，创建后不可修改；
--      内置类别（is_builtin=1）不可删除，只能停用。
--   4. 删除 sys_notify_user_setting 会丢弃已配置的免打扰时段，这是有意为之：免打扰功能已下线。
--   5. 表主键沿用 notify 模块现状 VARCHAR(64)（与 sys_notify_record、sys_site_message 一致），
--      而非 docs/spec/04-database.md 的 CHAR(32)；属既有模块偏差，作为独立技术债记录。
--   6. 发版前需确认偏好判定的行为变化已写入 CHANGELOG「升级注意」：
--      偏好判定没有总开关，升级后立刻生效；被显式归为 TODO/BUSINESS/ANNOUNCEMENT 的模板
--      走 EMAIL 或 PUSH 时会被 CHANNEL_NOT_ALLOWED 抑制。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. sys_notify_template / sys_notify_record 增加类别列与索引
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS nebula_upgrade_notify_category;

DELIMITER $$
CREATE PROCEDURE nebula_upgrade_notify_category()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sys_notify_template'
          AND COLUMN_NAME = 'category_code'
    ) THEN
        ALTER TABLE sys_notify_template
            ADD COLUMN category_code VARCHAR(32) DEFAULT NULL
            COMMENT '通知类别 code，须是 sys_notify_category.code；空值归入 DEFAULT' AFTER remark;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sys_notify_template'
          AND INDEX_NAME = 'idx_notify_template_category'
    ) THEN
        CREATE INDEX idx_notify_template_category ON sys_notify_template (category_code);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sys_notify_record'
          AND COLUMN_NAME = 'category_code'
    ) THEN
        ALTER TABLE sys_notify_record
            ADD COLUMN category_code VARCHAR(32) DEFAULT NULL
            COMMENT '通知类别 code，历史记录为空' AFTER receiver_user_id;
    END IF;
END$$
DELIMITER ;

CALL nebula_upgrade_notify_category();

DROP PROCEDURE nebula_upgrade_notify_category;

-- ----------------------------------------------------------------------------
-- 2. 通知类别表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_notify_category (
    id VARCHAR(64) NOT NULL,
    code VARCHAR(32) NOT NULL COMMENT '类别编码，唯一且创建后不可修改',
    name VARCHAR(50) NOT NULL COMMENT '类别名称',
    description VARCHAR(200) DEFAULT NULL COMMENT '类别说明，用于设置页展示',
    is_mandatory TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否强制类别：忽略用户偏好，始终放行',
    is_default_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '用户无偏好记录时的默认开关',
    sort INT NOT NULL DEFAULT 100 COMMENT '设置页排序号，值越小越靠前',
    allowed_channels VARCHAR(255) NOT NULL COMMENT '允许使用的渠道，逗号分隔，如 SITE,PUSH',
    is_builtin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否内置类别：不可删、编码不可改',
    is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用；停用后不出现在设置页、不可被新模板选中',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_notify_category_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知类别表';

-- 内置类别种子（与 docs/sql/init 保持一致）
INSERT INTO sys_notify_category (
    id, code, name, description, is_mandatory, is_default_enabled, sort, allowed_channels, is_builtin, is_enabled, remark, create_time, update_time
) VALUES
    ('019cf114a00070008000000000000046', 'SECURITY', '安全与账号', '登录异常、密码变更等账号安全提醒', 1, 1, 10, 'SITE,EMAIL,PUSH', 1, 1, '强制类别：忽略用户偏好，始终放行', NOW(), NOW()),
    ('019cf114a00070008000000000000047', 'TODO', '待办与审批', '指派给你的待办、审批与流转提醒', 0, 1, 20, 'SITE,PUSH', 1, 1, NULL, NOW(), NOW()),
    ('019cf114a00070008000000000000048', 'BUSINESS', '业务提醒', '订单、库存等业务状态变化提醒', 0, 1, 30, 'SITE,PUSH', 1, 1, NULL, NOW(), NOW()),
    ('019cf114a00070008000000000000049', 'ANNOUNCEMENT', '公告通知', '系统公告与运营通知', 0, 1, 40, 'SITE', 1, 1, NULL, NOW(), NOW()),
    ('019cf114a0007000800000000000004a', 'DEFAULT', '其他通知', '未归类通知的兜底类别', 0, 1, 90, 'SITE,EMAIL,PUSH', 1, 1, '未指定类别的模板与临时消息归入此类', NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    name = new_values.name,
    description = new_values.description,
    is_mandatory = new_values.is_mandatory,
    is_default_enabled = new_values.is_default_enabled,
    sort = new_values.sort,
    allowed_channels = new_values.allowed_channels,
    is_builtin = new_values.is_builtin,
    is_enabled = new_values.is_enabled,
    remark = new_values.remark,
    update_time = new_values.update_time;

-- ----------------------------------------------------------------------------
-- 3. 用户通知订阅偏好表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_notify_user_preference (
    id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    category_code VARCHAR(32) NOT NULL COMMENT '通知类别 code',
    channel VARCHAR(32) NOT NULL COMMENT '渠道：SITE/EMAIL/PUSH',
    is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否接收',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_notify_user_preference (user_id, category_code, channel),
    KEY idx_notify_user_preference_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户通知订阅偏好表';

-- ----------------------------------------------------------------------------
-- 4. 下线免打扰：删除用户通知全局设置表
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS sys_notify_user_setting;

-- ----------------------------------------------------------------------------
-- 5. 「通知类别」菜单、按钮权限与 ADMIN 授权
-- ----------------------------------------------------------------------------
INSERT INTO auth_menu (
    id, name, parent_id, path, sort, code, icon, component, type, status,
    hidden, external_url, visible_in_breadcrumb, visible_in_tab,
    active_menu_path, remark, create_time, update_time
) VALUES (
    '0196dbe0a6f17000a000000000000030',
    '通知类别',
    '0196dbe0a6f17000a000000000000020',
    '/system/notify/category',
    23,
    'NOTIFY_CATEGORY',
    'TagsOutlined',
    'CategoryManagementPage',
    'MENU',
    1,
    0,
    NULL,
    1,
    1,
    NULL,
    'Built-in notify category management menu',
    NOW(),
    NOW()
) AS new_values ON DUPLICATE KEY UPDATE
    name = new_values.name,
    parent_id = new_values.parent_id,
    path = new_values.path,
    sort = new_values.sort,
    icon = new_values.icon,
    component = new_values.component,
    type = new_values.type,
    status = new_values.status,
    hidden = new_values.hidden,
    visible_in_breadcrumb = new_values.visible_in_breadcrumb,
    visible_in_tab = new_values.visible_in_tab,
    remark = new_values.remark,
    update_time = new_values.update_time;

INSERT INTO auth_button (
    id, menu_id, code, name, type, sort, status, create_time, update_time
) VALUES
    ('0196dbe0a6f17000a000000000000104', '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_CREATE', '新增通知类别', 'add', 1, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000105', '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_EDIT', '编辑通知类别', 'edit', 2, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000106', '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_DELETE', '删除通知类别', 'delete', 3, 1, NOW(), NOW()),
    ('0196dbe0a6f17000a000000000000107', '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_QUERY', '查询通知类别', 'query', 4, 1, NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    menu_id = new_values.menu_id,
    name = new_values.name,
    type = new_values.type,
    sort = new_values.sort,
    status = new_values.status,
    update_time = new_values.update_time;

-- 为 ADMIN 角色补授权：菜单 + 按钮（已存在的跳过）
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
WHERE m.id = '0196dbe0a6f17000a000000000000030'
  AND NOT EXISTS (
    SELECT 1 FROM auth_permission p
    WHERE p.subject_type = 'ROLE'
      AND p.subject_id = '0194f3c8b6b77c0d91a7d9af9c7d0002'
      AND p.resource_type = 'MENU'
      AND p.resource_id = m.id
);

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
WHERE b.menu_id = '0196dbe0a6f17000a000000000000030'
  AND NOT EXISTS (
    SELECT 1 FROM auth_permission p
    WHERE p.subject_type = 'ROLE'
      AND p.subject_id = '0194f3c8b6b77c0d91a7d9af9c7d0002'
      AND p.resource_type = 'BUTTON'
      AND p.resource_id = b.id
);
