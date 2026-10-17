-- ============================================================================
-- 增量升级脚本：暴露面治理（动态缓存查询权限码 + 密码重置通知去明文密码）
-- 方言：MySQL
-- 幂等：按 code / 唯一键 upsert，条件更新，可重复执行
-- ============================================================================
--
-- 背景（与 nebula-base-crypto 同批次的暴露面治理，见 nebula-base/docs/crypto-design.md §10）：
--
--   1. GET /api/frontend/caches 此前没有任何权限码，任何登录用户都能拿到全部缓存条目值：
--      其中 systemParamByKey 是解密后的参数实体、authSessionCache 是含原始访问令牌的会话。
--      本次给该端点加上 @NebulaApiPermission(FRONTEND_CACHE_QUERY)，因此需要在本表登记该接口权限码
--      （界面上没有独立的"查询"按钮，按 docs/spec/09-security.md 2.3.3 登记在 auth_api）。
--      代码侧另有缓存名拒绝清单兜底（会话/令牌、验证码、找回密码、在线用户、系统参数、第三方登录态
--      等命名空间不再出现在列表结果里），两层缺一不可——注解在
--      nebula.auth.permission.enforce-enabled=false（默认）时并不拦人。
--
--   2. 密码重置事件不再携带重置后的默认密码（该事件会落 event_outbox.payload_json，无脱敏），
--      通知模板因此不能再渲染 ${defaultPassword}。既有的 defaultPassword 字段行是
--      「必填且无默认值」：处理逻辑不再传它时，通知服务会直接抛「模板字段必填」导致发送失败。
--      故本脚本删除该字段行，并把正文里的"重置后密码：${defaultPassword}。"整句换成
--      「向管理员索取 / 忘记密码」文案（新密码不再随通知下发）。
--
-- 影响：只新增接口权限码与 ADMIN 的对应授权，不触碰其它授权；模板正文按整句替换，保留运维的其它定制。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 登记动态缓存查询接口权限码
-- ----------------------------------------------------------------------------
INSERT INTO auth_api (
    id, code, name, module, sort, remark, status, create_time, update_time
) VALUES
    ('0196dbe0a6f17000a000000000000405', 'FRONTEND_CACHE_QUERY', '动态缓存查询', 'frontend', 5, '动态缓存列表查询；响应会回传缓存条目值，属管理端调试准入码', 1, NOW(), NOW())
AS new_values ON DUPLICATE KEY UPDATE
    name = new_values.name,
    module = new_values.module,
    sort = new_values.sort,
    remark = new_values.remark,
    status = new_values.status,
    update_time = new_values.update_time;

-- ----------------------------------------------------------------------------
-- 2. 为 ADMIN 角色补授权
--    新权限码若不授权，非 ADMIN / SUPER_ADMIN 角色一律被拒，界面也授不出去。
-- ----------------------------------------------------------------------------
INSERT INTO auth_permission (
    id, subject_type, subject_id, resource_type, resource_id, effect, scope, create_time, update_time
)
SELECT
    REPLACE(UUID(), '-', ''),
    'ROLE',
    '0194f3c8b6b77c0d91a7d9af9c7d0002',
    'API',
    a.id,
    'Allow',
    'ALL',
    NOW(),
    NOW()
FROM auth_api a
WHERE a.code = 'FRONTEND_CACHE_QUERY'
  AND NOT EXISTS (
      SELECT 1 FROM auth_permission p
      WHERE p.subject_type = 'ROLE'
        AND p.subject_id = '0194f3c8b6b77c0d91a7d9af9c7d0002'
        AND p.resource_type = 'API'
        AND p.resource_id = a.id
  );

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
