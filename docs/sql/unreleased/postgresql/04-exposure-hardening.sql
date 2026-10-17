-- ============================================================================
-- 增量升级脚本：暴露面治理（动态缓存查询权限码 + 密码重置通知去明文密码）
-- 方言：PostgreSQL
-- 幂等：全部语句自带 ON CONFLICT / 条件判断，可重复执行
-- ============================================================================
--
-- 背景与处置同 mysql/04-exposure-hardening.sql，此处不重复。要点复述：
--   1. GET /api/frontend/caches 加 @NebulaApiPermission(FRONTEND_CACHE_QUERY)，需登记 auth_api 行；
--   2. 密码重置事件不再携带默认密码，模板的 defaultPassword 字段行（必填且无默认值）必须删除，
--      正文里的"重置后密码：${defaultPassword}。"整句换成「向管理员索取 / 忘记密码」文案。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 登记动态缓存查询接口权限码
-- ----------------------------------------------------------------------------
INSERT INTO auth_api (
    id, code, name, module, sort, remark, status, create_time, update_time
) VALUES
    ('0196dbe0a6f17000a000000000000405', 'FRONTEND_CACHE_QUERY', '动态缓存查询', 'frontend', 5, '动态缓存列表查询；响应会回传缓存条目值，属管理端调试准入码', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    sort = EXCLUDED.sort,
    remark = EXCLUDED.remark,
    status = EXCLUDED.status,
    update_time = EXCLUDED.update_time;

-- ----------------------------------------------------------------------------
-- 2. 为 ADMIN 角色补授权
--    新权限码若不授权，非 ADMIN / SUPER_ADMIN 角色一律被拒，界面也授不出去。
-- ----------------------------------------------------------------------------
INSERT INTO auth_permission (
    id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT
    REPLACE(gen_random_uuid()::text, '-', ''),
    'ROLE',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    'API',
    a.id,
    'Allow',
    'ALL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth_api a
WHERE a.code = 'FRONTEND_CACHE_QUERY'
ON CONFLICT (subject_type, subject_id, resource_type, resource_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. 删除密码重置模板的 defaultPassword 字段行
--    （必填且无默认值，留着会让新的发送逻辑抛「模板字段必填」）
-- ----------------------------------------------------------------------------
DELETE FROM sys_notify_template_field
WHERE field_code = 'defaultPassword'
  AND template_id IN (SELECT id FROM sys_notify_template WHERE template_code = 'PASSWORD_RESET');

-- ----------------------------------------------------------------------------
-- 4. 正文去掉密码占位符：整句替换为「向管理员索取 / 忘记密码」文案
--    只命中仍含占位符的行，运维已改过的其它文案不受影响；重跑时 LIKE 不再命中，天然幂等。
-- ----------------------------------------------------------------------------
UPDATE sys_notify_template_variant
SET content_template = REPLACE(
        content_template,
        '重置后密码：${defaultPassword}。',
        '新密码请向管理员索取，或通过忘记密码流程自助重置。'
    )
WHERE template_id IN (SELECT id FROM sys_notify_template WHERE template_code = 'PASSWORD_RESET')
  AND content_template LIKE '%${defaultPassword}%';
