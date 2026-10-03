-- ============================================================================
-- Nebula - Upgrade Script
-- 目标版本：待定（PostgreSQL）；本目录为 unreleased，发版时整体更名为新版本号
-- Purpose: 通知类别可管理化与订阅偏好（能力 #7）
--   1. sys_notify_template 增加 category_code（可空，空值归入 DEFAULT 类别）
--   2. sys_notify_record 增加 category_code（可空；抑制复用既有 send_status/fail_reason，不新增列）
--   3. 新增 sys_notify_category（可管理的通知类别）并写入 5 条内置类别种子
--   4. 新增 sys_notify_user_preference（类别 × 渠道 × 开关）
--   5. 删除 sys_notify_user_setting（免打扰功能整体下线）
--   6. 新增「通知类别」菜单与 4 个按钮权限，并授予 ADMIN
-- Notes:
--   1. 幂等：全部语句自带 IF NOT EXISTS / ON CONFLICT，可重复执行。
--   2. category_code 必须可空，且**不要**把存量模板批量回填成某个具体类别——
--      回填会改变现有行为，DEFAULT 兜底才是等价的。
--   3. sys_notify_category.code 是模板、发送记录与用户偏好共同引用的键，创建后不可修改；
--      内置类别（is_builtin=TRUE）不可删除，只能停用。
--   4. 删除 sys_notify_user_setting 会丢弃已配置的免打扰时段，这是有意为之：免打扰功能已下线。
--   5. 表主键沿用 notify 模块现状 VARCHAR(64)，而非 docs/spec/04-database.md 的 CHAR(32)；
--      属既有模块偏差，作为独立技术债记录。
--   6. 发版前需确认偏好判定的行为变化已写入 CHANGELOG「升级注意」：
--      偏好判定没有总开关，升级后立刻生效；被显式归为 TODO/BUSINESS/ANNOUNCEMENT 的模板
--      走 EMAIL 或 PUSH 时会被 CHANNEL_NOT_ALLOWED 抑制。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 增加类别列与索引
-- ----------------------------------------------------------------------------
ALTER TABLE sys_notify_template ADD COLUMN IF NOT EXISTS category_code VARCHAR(32) DEFAULT NULL;
ALTER TABLE sys_notify_record ADD COLUMN IF NOT EXISTS category_code VARCHAR(32) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_notify_template_category ON sys_notify_template (category_code);

COMMENT ON COLUMN sys_notify_template.category_code IS '通知类别 code，须是 sys_notify_category.code；空值归入 DEFAULT';
COMMENT ON COLUMN sys_notify_record.category_code IS '通知类别 code，历史记录为空';
-- 抑制记录复用既有 send_status/fail_reason：注释同步补全取值口径，与 init 对齐
COMMENT ON COLUMN sys_notify_record.send_status IS '发送状态：SUCCESS/FAILED/SUPPRESSED（SUPPRESSED=被用户偏好抑制未投递）';
COMMENT ON COLUMN sys_notify_record.fail_reason IS '失败原因；SUPPRESSED 时为抑制原因（见 NotifyPreferenceReasons）';

-- ----------------------------------------------------------------------------
-- 2. 通知类别表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_notify_category (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    is_default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort INT NOT NULL DEFAULT 100,
    allowed_channels VARCHAR(255) NOT NULL,
    is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    remark VARCHAR(500),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_notify_category_code ON sys_notify_category (code);

COMMENT ON TABLE sys_notify_category IS '通知类别表';
COMMENT ON COLUMN sys_notify_category.code IS '类别编码，唯一且创建后不可修改';
COMMENT ON COLUMN sys_notify_category.name IS '类别名称';
COMMENT ON COLUMN sys_notify_category.description IS '类别说明，用于设置页展示';
COMMENT ON COLUMN sys_notify_category.is_mandatory IS '是否强制类别：忽略用户偏好，始终放行';
COMMENT ON COLUMN sys_notify_category.is_default_enabled IS '用户无偏好记录时的默认开关';
COMMENT ON COLUMN sys_notify_category.sort IS '设置页排序号，值越小越靠前';
COMMENT ON COLUMN sys_notify_category.allowed_channels IS '允许使用的渠道，逗号分隔，如 SITE,PUSH';
COMMENT ON COLUMN sys_notify_category.is_builtin IS '是否内置类别：不可删、编码不可改';
COMMENT ON COLUMN sys_notify_category.is_enabled IS '是否启用；停用后不出现在设置页、不可被新模板选中';
COMMENT ON COLUMN sys_notify_category.remark IS '备注';

-- 内置类别种子（与 docs/sql/init 保持一致）
INSERT INTO sys_notify_category (
    id, code, name, description, is_mandatory, is_default_enabled, sort, allowed_channels, is_builtin, is_enabled, remark, create_time, update_time
) VALUES
    ('019cf114a00070008000000000000046', 'SECURITY', '安全与账号', '登录异常、密码变更等账号安全提醒', TRUE, TRUE, 10, 'SITE,EMAIL,PUSH', TRUE, TRUE, '强制类别：忽略用户偏好，始终放行', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000047', 'TODO', '待办与审批', '指派给你的待办、审批与流转提醒', FALSE, TRUE, 20, 'SITE,PUSH', TRUE, TRUE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000048', 'BUSINESS', '业务提醒', '订单、库存等业务状态变化提醒', FALSE, TRUE, 30, 'SITE,PUSH', TRUE, TRUE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a00070008000000000000049', 'ANNOUNCEMENT', '公告通知', '系统公告与运营通知', FALSE, TRUE, 40, 'SITE', TRUE, TRUE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('019cf114a0007000800000000000004a', 'DEFAULT', '其他通知', '未归类通知的兜底类别', FALSE, TRUE, 90, 'SITE,EMAIL,PUSH', TRUE, TRUE, '未指定类别的模板与临时消息归入此类', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
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

-- ----------------------------------------------------------------------------
-- 3. 用户通知订阅偏好表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_notify_user_preference (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    category_code VARCHAR(32) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_notify_user_preference ON sys_notify_user_preference (user_id, category_code, channel);
CREATE INDEX IF NOT EXISTS idx_notify_user_preference_user ON sys_notify_user_preference (user_id);

COMMENT ON TABLE sys_notify_user_preference IS '用户通知订阅偏好表';
COMMENT ON COLUMN sys_notify_user_preference.category_code IS '通知类别 code';
COMMENT ON COLUMN sys_notify_user_preference.channel IS '渠道：SITE/EMAIL/PUSH';
COMMENT ON COLUMN sys_notify_user_preference.is_enabled IS '是否接收';

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
    FALSE,
    NULL,
    TRUE,
    TRUE,
    NULL,
    'Built-in notify category management menu',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    path = EXCLUDED.path,
    sort = EXCLUDED.sort,
    icon = EXCLUDED.icon,
    component = EXCLUDED.component,
    type = EXCLUDED.type,
    status = EXCLUDED.status,
    hidden = EXCLUDED.hidden,
    visible_in_breadcrumb = EXCLUDED.visible_in_breadcrumb,
    visible_in_tab = EXCLUDED.visible_in_tab,
    remark = EXCLUDED.remark,
    update_time = EXCLUDED.update_time;

INSERT INTO auth_button (
    id, menu_id, code, name, type, sort, status, create_time, update_time
) VALUES
    ('0196dbe0a6f17000a000000000000104', '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_CREATE', '新增通知类别', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000105', '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_EDIT', '编辑通知类别', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000106', '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_DELETE', '删除通知类别', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000107', '0196dbe0a6f17000a000000000000030', 'NOTIFY_CATEGORY_QUERY', '查询通知类别', 'query', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    sort = EXCLUDED.sort,
    status = EXCLUDED.status,
    update_time = EXCLUDED.update_time;

-- 为 ADMIN 角色补授权：菜单 + 按钮（已存在的跳过）
INSERT INTO auth_permission (
    id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT
    REPLACE(gen_random_uuid()::text, '-', ''),
    'ROLE',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    'MENU',
    m.id,
    'Allow',
    'ALL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
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
    REPLACE(gen_random_uuid()::text, '-', ''),
    'ROLE',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    'BUTTON',
    b.id,
    'Allow',
    'ALL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth_button b
WHERE b.menu_id = '0196dbe0a6f17000a000000000000030'
  AND NOT EXISTS (
    SELECT 1 FROM auth_permission p
    WHERE p.subject_type = 'ROLE'
      AND p.subject_id = '0194f3c8b6b77c0d91a7d9af9c7d0002'
      AND p.resource_type = 'BUTTON'
      AND p.resource_id = b.id
);
