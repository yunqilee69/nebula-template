-- ============================================================================
-- Nebula 升级脚本（PostgreSQL，未发版）：补登记各模块内置按钮权限码
--
-- 背景：auth_button 的种子行一直是手工维护的，只覆盖 auth 模块自身的 29 个按钮
--       加通知模块的 7 个。param / scheduler / frontend 以及通知模块后续新增的按钮码
--       只在代码里加了 @NebulaPermission，从未登记——后果是静默的：管理端「按钮权限」
--       页看不到这些码，授不出去，而端点对非 ADMIN / SUPER_ADMIN 一律拒绝。
--       启动期「权限登记对账」会把它们报成「未登记」（默认 WARN，strict-registry=true 时失败）。
--
-- 本脚本补登记 12 个按钮码。**只补有真实归属菜单的码**：按钮权限页是按菜单树
--       逐个菜单拉取按钮的，menu_id 指向不存在的菜单会让按钮在授权页不可见，
--       等于没登记。以下 8 个码在框架内没有对应的管理端页面，没有可挂的菜单，
--       因此不在本脚本范围（应改判为接口权限 auth_api，见 docs/spec/09-security.md 2.3.3）：
--         STORAGE_UPLOAD、STORAGE_FILE_DELETE（由 ne-upload 组件跨页调用，无归属菜单）
--         FRONTEND_CONFIG_SAVE、FRONTEND_APP_RELEASE_CREATE/EDIT/DELETE（框架内无管理端页面）
--         NOTIFY_PUSH_DEVICE_QUERY、NOTIFY_PUSH_TEST（框架内无管理端页面）
--
-- 幂等：按 code upsert，可重复执行；已存在的行只更新归属菜单与名称。
-- 影响：不改动既有授权，只新增按钮行与 ADMIN 的对应授权行。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 补登记按钮码
-- ----------------------------------------------------------------------------
INSERT INTO auth_button (
    id, menu_id, code, name, type, sort, status, create_time, update_time
) VALUES
    -- 通知模块（通知模板页承载模板管理与发送；公告、通知记录、渠道目标各自成页）
    ('0196dbe0a6f17000a000000000000108', '0196dbe0a6f17000a000000000000021', 'NOTIFY_TEMPLATE_MANAGE', '管理通知模板', 'edit', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000109', '0196dbe0a6f17000a000000000000021', 'NOTIFY_SEND', '发送通知', 'send', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a00000000000010a', '0196dbe0a6f17000a000000000000022', 'NOTIFY_ANNOUNCEMENT_MANAGE', '管理公告', 'edit', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a00000000000010b', '0196dbe0a6f17000a000000000000024', 'NOTIFY_RECORD_VIEW', '查看通知记录', 'query', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a00000000000010c', '0196dbe0a6f17000a000000000000028', 'NOTIFY_CHANNEL_TARGET_QUERY', '查询渠道目标', 'query', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- 参数模块
    ('0196dbe0a6f17000a000000000000501', '0196dbe0a6f17000a000000000000013', 'PARAM_CREATE', '新增参数', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000502', '0196dbe0a6f17000a000000000000013', 'PARAM_UPDATE', '编辑参数', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000503', '0196dbe0a6f17000a000000000000013', 'PARAM_DELETE', '删除参数', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000504', '0196dbe0a6f17000a000000000000014', 'PARAM_GENERAL_CONFIG_EDIT', '编辑高级配置', 'edit', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- 调度模块
    ('0196dbe0a6f17000a000000000000601', '0196dbe0a6f17000a000000000000017', 'SCHEDULER_JOB_MANAGE', '管理定时任务', 'edit', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000602', '0196dbe0a6f17000a000000000000017', 'SCHEDULER_JOB_TRIGGER', '手动触发任务', 'trigger', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    -- 前端模块
    ('0196dbe0a6f17000a000000000000701', '0196dbe0a6f17000a000000000000026', 'FRONTEND_CACHE_DELETE', '清除前端缓存', 'delete', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    sort = EXCLUDED.sort,
    status = EXCLUDED.status,
    update_time = EXCLUDED.update_time;

-- ----------------------------------------------------------------------------
-- 2. 为 ADMIN 角色补授权
--    新增按钮码若不授权，ADMIN 也看不到（超管按码绕过校验，但界面按钮靠授权数据下发）
-- ----------------------------------------------------------------------------
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
WHERE b.code IN (
    'NOTIFY_TEMPLATE_MANAGE', 'NOTIFY_SEND', 'NOTIFY_ANNOUNCEMENT_MANAGE',
    'NOTIFY_RECORD_VIEW', 'NOTIFY_CHANNEL_TARGET_QUERY',
    'PARAM_CREATE', 'PARAM_UPDATE', 'PARAM_DELETE', 'PARAM_GENERAL_CONFIG_EDIT',
    'SCHEDULER_JOB_MANAGE', 'SCHEDULER_JOB_TRIGGER',
    'FRONTEND_CACHE_DELETE'
)
ON CONFLICT (subject_type, subject_id, resource_type, resource_id) DO NOTHING;
