-- ============================================================================
-- Nebula 升级脚本（PostgreSQL，未发版）：接口权限 auth_api
--
-- 背景：接口权限（没有对应界面控件、只做服务端准入的权限码）原先被迫登记在
--       auth_button 里，靠一个任意菜单挂靠，语义错位且管理端看不出该不该授予。
--       本版本新增 auth_api 表与资源类型 API，并把 4 个纯查询/下载准入码迁过去。
--
-- 权限编码格式不变，仍为 resourceType:resourceCode:effect，新增一类前缀：
--       API:STORAGE_FILE_QUERY:Allow
--
-- 幂等：全部语句可重复执行。
-- 影响：迁移会重指已有授权（按 code 关联），不会让已授权主体丢权限。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 建表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_api (
    id CHAR(32) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    module VARCHAR(50),
    sort INT NOT NULL DEFAULT 0,
    remark VARCHAR(500),
    status SMALLINT NOT NULL DEFAULT 1,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_api_code ON auth_api (code);
CREATE INDEX IF NOT EXISTS idx_api_module ON auth_api (module);
CREATE INDEX IF NOT EXISTS idx_api_status ON auth_api (status);

COMMENT ON TABLE auth_api IS '接口权限表';
COMMENT ON COLUMN auth_api.code IS '接口权限编码，唯一';
COMMENT ON COLUMN auth_api.module IS '所属模块编码，取值来自字典 param_module';

-- ----------------------------------------------------------------------------
-- 2. 管理端菜单与按钮：接口管理、接口权限授权
-- ----------------------------------------------------------------------------
-- 「接口管理」复用菜单 id ...025。历史初始化脚本在 PostgreSQL 方言里把该 id 给过
-- 「站内消息」菜单（无对应前端页面，已废弃），若不清掉，下面的 ON CONFLICT (id)
-- 会把那一行改写成「接口管理」，而它原有的 MENU 授权行会顺势变成「接口管理」的授权
-- ——角色会凭空多出一个菜单权限。这里按 code 精确删除旧行与旧授权；其他环境无此行，为空操作。
DELETE FROM auth_permission
WHERE resource_type = 'MENU'
  AND resource_id IN (SELECT id FROM auth_menu WHERE code = 'NOTIFY_SITE_MESSAGE');

DELETE FROM auth_menu WHERE code = 'NOTIFY_SITE_MESSAGE';

INSERT INTO auth_menu (
    id, name, parent_id, path, sort, code, icon, component, type, status,
    hidden, external_url, visible_in_breadcrumb, visible_in_tab,
    active_menu_path, remark, create_time, update_time
) VALUES
    (
        '0196dbe0a6f17000a000000000000025',
        '接口管理',
        '0196dbe0a6f17000a000000000000003',
        '/system/operation/api',
        17,
        'system-operation-api',
        'ApiOutlined',
        'ApiManagementPage',
        'MENU',
        1, FALSE, NULL, TRUE, TRUE, NULL,
        'Built-in api permission registry menu',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        '0196dbe0a6f17000a000000000000031',
        '接口权限',
        '0196dbe0a6f17000a000000000000009',
        '/system/permission/api-permission',
        23,
        'system-permission-api',
        'KeyOutlined',
        'ApiPermissionPage',
        'MENU',
        1, FALSE, NULL, TRUE, TRUE, NULL,
        'Built-in api permission assignment page',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
    visible_in_breadcrumb = EXCLUDED.visible_in_breadcrumb,
    visible_in_tab = EXCLUDED.visible_in_tab,
    remark = EXCLUDED.remark,
    update_time = EXCLUDED.update_time;

INSERT INTO auth_button (
    id, menu_id, code, name, type, sort, status, create_time, update_time
) VALUES
    ('0196dbe0a6f17000a000000000000301', '0196dbe0a6f17000a000000000000025', 'AUTH_API_CREATE', '新增接口权限', 'add', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000302', '0196dbe0a6f17000a000000000000025', 'AUTH_API_EDIT', '编辑接口权限', 'edit', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000303', '0196dbe0a6f17000a000000000000025', 'AUTH_API_DELETE', '删除接口权限', 'delete', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
    menu_id = EXCLUDED.menu_id,
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    sort = EXCLUDED.sort,
    status = EXCLUDED.status,
    update_time = EXCLUDED.update_time;

-- ----------------------------------------------------------------------------
-- 3. 内置接口权限码
-- ----------------------------------------------------------------------------
INSERT INTO auth_api (
    id, code, name, module, sort, remark, status, create_time, update_time
) VALUES
    ('0196dbe0a6f17000a000000000000401', 'AUDIT_RECORD_VIEW', '审计记录查询', 'audit', 1, '审计记录分页与详情查询；界面上没有"查询"按钮，属列表接口准入', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000402', 'PARAM_GENERAL_CONFIG_QUERY', '通用配置查询', 'param', 2, '通用配置读取；前端初始化时按需拉取', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000403', 'FRONTEND_APP_RELEASE_QUERY', '应用版本查询', 'frontend', 3, '应用版本分页与详情查询，供升级提示使用', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('0196dbe0a6f17000a000000000000404', 'STORAGE_FILE_QUERY', '文件查询与下载', 'storage', 4, '正式文件详情、分页、按业务实体列出、下载与下载位置解析共用的准入码', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    sort = EXCLUDED.sort,
    remark = EXCLUDED.remark,
    status = EXCLUDED.status,
    update_time = EXCLUDED.update_time;

-- ----------------------------------------------------------------------------
-- 4. 迁移存量授权：把指向旧 auth_button 行的授权改指到同名 auth_api 行
--    必须在删除 auth_button 行之前执行。按 code 关联，与具体 id 无关。
-- ----------------------------------------------------------------------------
INSERT INTO auth_permission (
    id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT
    REPLACE(gen_random_uuid()::text, '-', ''),
    p.subject_type,
    p.subject_id,
    'API',
    a.id,
    p.effect,
    p.scope,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth_permission p
JOIN auth_button b ON p.resource_type = 'BUTTON' AND p.resource_id = b.id
JOIN auth_api a ON a.code = b.code
WHERE b.code IN ('AUDIT_RECORD_VIEW', 'PARAM_GENERAL_CONFIG_QUERY', 'FRONTEND_APP_RELEASE_QUERY', 'STORAGE_FILE_QUERY')
ON CONFLICT (subject_type, subject_id, resource_type, resource_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. 清理：旧按钮行及其授权。这些码在代码里已改注解为 @NebulaApiPermission，
--    留着 auth_button 行会让按钮权限对账持续报"未使用"。
-- ----------------------------------------------------------------------------
DELETE FROM auth_permission
WHERE resource_type = 'BUTTON'
  AND resource_id IN (
      SELECT id FROM auth_button
      WHERE code IN ('AUDIT_RECORD_VIEW', 'PARAM_GENERAL_CONFIG_QUERY', 'FRONTEND_APP_RELEASE_QUERY', 'STORAGE_FILE_QUERY')
  );

DELETE FROM auth_button
WHERE code IN ('AUDIT_RECORD_VIEW', 'PARAM_GENERAL_CONFIG_QUERY', 'FRONTEND_APP_RELEASE_QUERY', 'STORAGE_FILE_QUERY');

-- ----------------------------------------------------------------------------
-- 6. 为 ADMIN 角色补授权：新菜单、新按钮、接口权限
-- ----------------------------------------------------------------------------
INSERT INTO auth_permission (
    id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT REPLACE(gen_random_uuid()::text, '-', ''), 'ROLE', '0194f3c8b6b77c0d91a7d9af9c7d0002', 'MENU', m.id, 'Allow', 'ALL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM auth_menu m
WHERE m.id IN ('0196dbe0a6f17000a000000000000025', '0196dbe0a6f17000a000000000000031')
ON CONFLICT (subject_type, subject_id, resource_type, resource_id) DO NOTHING;

INSERT INTO auth_permission (
    id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT REPLACE(gen_random_uuid()::text, '-', ''), 'ROLE', '0194f3c8b6b77c0d91a7d9af9c7d0002', 'BUTTON', b.id, 'Allow', 'ALL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM auth_button b
WHERE b.code IN ('AUTH_API_CREATE', 'AUTH_API_EDIT', 'AUTH_API_DELETE')
ON CONFLICT (subject_type, subject_id, resource_type, resource_id) DO NOTHING;

INSERT INTO auth_permission (
    id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT REPLACE(gen_random_uuid()::text, '-', ''), 'ROLE', '0194f3c8b6b77c0d91a7d9af9c7d0002', 'API', a.id, 'Allow', 'ALL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM auth_api a
ON CONFLICT (subject_type, subject_id, resource_type, resource_id) DO NOTHING;
