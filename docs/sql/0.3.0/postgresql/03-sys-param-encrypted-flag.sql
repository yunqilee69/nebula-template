-- ============================================================================
-- 增量升级脚本：sys_param 增加「加密存储」标记列
-- 方言：PostgreSQL
-- 幂等：全部语句自带 IF NOT EXISTS / 条件判断，可重复执行
-- ============================================================================
--
-- 背景与语义同 mysql/03-sys-param-encrypted-flag.sql，此处不重复。
-- 要点复述：本列是**写意图**，「是否真的是密文」以值的 enc: 前缀为准（存储事实），
-- 冲突时读取端始终信任事实；存量明文由应用侧幂等回填作业加密，SQL 无法加密（密钥在环境变量）。

ALTER TABLE sys_param ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN sys_param.is_encrypted IS '是否加密存储：false-否，true-是';

-- ----------------------------------------------------------------------------
-- 声明既有的两个机密参数使用加密存储（只改标记不改值，可重复执行）
-- ----------------------------------------------------------------------------
UPDATE sys_param
SET is_encrypted = TRUE
WHERE param_key IN ('notify.email.password', 'login.username.reset-default-password')
  AND is_encrypted = FALSE;
