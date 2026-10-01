-- ============================================================================
-- 增量升级脚本：auth_login_record 增加客户端端类型列
-- 目标版本：0.2.1（目录名即目标版本，环境版本低于 0.2.1 时执行本目录脚本即可升级到 0.2.1，见 docs/sql/README.md）
-- 方言：PostgreSQL
-- 幂等：全部语句自带 IF NOT EXISTS，可重复执行
-- 说明：早先版本的 PostgreSQL 全量初始化脚本遗漏了 auth_login_record 表，
--       因此这里先补建整张表，再补齐端类型列；两者对既有环境均为增量。
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_login_record (
    id CHAR(32) PRIMARY KEY,
    user_id CHAR(32) NOT NULL,
    login_account VARCHAR(100) NOT NULL,
    login_type VARCHAR(20) NOT NULL,
    login_result VARCHAR(20) NOT NULL,
    is_success SMALLINT NOT NULL DEFAULT 0,
    login_ip VARCHAR(50) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    client_type VARCHAR(20) DEFAULT NULL,
    client_type_source VARCHAR(20) DEFAULT NULL,
    device_info VARCHAR(500) DEFAULT NULL,
    oauth_provider VARCHAR(50) DEFAULT NULL,
    fail_reason VARCHAR(200) DEFAULT NULL,
    login_time TIMESTAMP NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE auth_login_record ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT NULL;
ALTER TABLE auth_login_record ADD COLUMN IF NOT EXISTS client_type_source VARCHAR(20) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_login_record_user_id ON auth_login_record (user_id);
CREATE INDEX IF NOT EXISTS idx_login_record_login_time ON auth_login_record (login_time);
CREATE INDEX IF NOT EXISTS idx_login_record_client_type ON auth_login_record (client_type);

COMMENT ON TABLE auth_login_record IS '用户登录记录表';
COMMENT ON COLUMN auth_login_record.client_type IS '客户端端类型：WEB/H5/MP_WEIXIN/MP_ALIPAY/APP/API/UNKNOWN';
COMMENT ON COLUMN auth_login_record.client_type_source IS '端类型判定来源：HEADER/USER_AGENT/DEFAULT';
