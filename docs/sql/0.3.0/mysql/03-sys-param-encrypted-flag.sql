-- ============================================================================
-- 增量升级脚本：sys_param 增加「加密存储」标记列
-- 方言：MySQL
-- 幂等：通过 INFORMATION_SCHEMA 判断列是否已存在，中断后可直接重跑
-- ============================================================================
--
-- 背景：sys_param.param_value 中存放着 SMTP 授权码、重置默认密码等机密
-- （notify.email.password、login.username.reset-default-password），此前除「接口不回填明文」
-- 这一前端约定外没有任何保护——数据库、备份、日志、缓存转储四处都是明文。
-- 应用侧新增 nebula-base-crypto（AES-256-GCM，密钥只来自环境变量）后，本列用于逐行声明
-- 「该参数的值必须加密存储」。
--
-- 语义（务必按此理解，理解错会损坏数据）：
--   1. is_encrypted 是**写意图**：该参数的值应当被加密存储；值是否真的是密文由
--      「是否以 enc: 前缀开头」判定（**存储事实**）。
--   2. 冲突时始终信任事实：**读取永远按前缀判定，不按本列判定**。因此本列为 1 而值仍是
--      明文时不会读错（按历史明文直通并告警），首次写入时自动自愈为密文。
--   3. 本列只在**创建**参数时可设置；翻转标记必须走 SQL + 重新加密存量值，否则同一列会
--      混存明文与密文，且没有任何代码会去重加密旧值。
--   4. is_encrypted = 1 要求 data_type = 'STRING'：密文不再是可解析的 INT/BOOLEAN。
--
-- 存量值不在本脚本中加密：密钥只存在于环境变量（NEBULA_CRYPTO_KEY_*），SQL 无法加密。
-- 存量明文由应用侧的幂等回填作业处理（判据 param_value <> ''
-- AND param_value NOT LIKE 'enc:%'），该作业可重复执行。

DROP PROCEDURE IF EXISTS nebula_upgrade_sys_param_encrypted_flag;

DELIMITER $$
CREATE PROCEDURE nebula_upgrade_sys_param_encrypted_flag()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sys_param'
          AND COLUMN_NAME = 'is_encrypted'
    ) THEN
        ALTER TABLE sys_param
            ADD COLUMN is_encrypted TINYINT(1) NOT NULL DEFAULT 0
            COMMENT '是否加密存储：0-否，1-是' AFTER param_value;
    END IF;
END$$
DELIMITER ;

CALL nebula_upgrade_sys_param_encrypted_flag();

DROP PROCEDURE nebula_upgrade_sys_param_encrypted_flag;

-- ----------------------------------------------------------------------------
-- 声明既有的两个机密参数使用加密存储
--
-- 只改标记不改值：值由回填作业加密，本语句可重复执行。
-- ----------------------------------------------------------------------------
UPDATE sys_param
SET is_encrypted = 1
WHERE param_key IN ('notify.email.password', 'login.username.reset-default-password')
  AND is_encrypted = 0;
