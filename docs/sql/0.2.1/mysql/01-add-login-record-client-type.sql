-- ============================================================================
-- 增量升级脚本：auth_login_record 增加客户端端类型列
-- 目标版本：0.2.1（目录名即目标版本，环境版本低于 0.2.1 时执行本目录脚本即可升级到 0.2.1，见 docs/sql/README.md）
-- 方言：MySQL
-- 幂等：通过 INFORMATION_SCHEMA 判断列与索引是否已存在，中断后可直接重跑
-- ============================================================================

DROP PROCEDURE IF EXISTS nebula_upgrade_login_record_client_type;

DELIMITER $$
CREATE PROCEDURE nebula_upgrade_login_record_client_type()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'auth_login_record'
          AND COLUMN_NAME = 'client_type'
    ) THEN
        ALTER TABLE auth_login_record
            ADD COLUMN client_type VARCHAR(20) DEFAULT NULL
            COMMENT '客户端端类型：WEB/H5/MP_WEIXIN/MP_ALIPAY/APP/API/UNKNOWN' AFTER user_agent;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'auth_login_record'
          AND COLUMN_NAME = 'client_type_source'
    ) THEN
        ALTER TABLE auth_login_record
            ADD COLUMN client_type_source VARCHAR(20) DEFAULT NULL
            COMMENT '端类型判定来源：HEADER/USER_AGENT/DEFAULT' AFTER client_type;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'auth_login_record'
          AND INDEX_NAME = 'idx_login_record_client_type'
    ) THEN
        CREATE INDEX idx_login_record_client_type ON auth_login_record (client_type);
    END IF;
END$$
DELIMITER ;

CALL nebula_upgrade_login_record_client_type();

DROP PROCEDURE nebula_upgrade_login_record_client_type;
