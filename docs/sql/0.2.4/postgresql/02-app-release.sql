-- ============================================================================
-- Nebula - Upgrade Script
-- 目标版本：待定（PostgreSQL）；本目录为 unreleased，发版时整体更名为新版本号
-- Purpose: 应用版本与升级检查（能力 #4）
--   新增 frontend_app_release（应用版本发布记录），供客户端启动期做"建议更新/强制更新"判定。
-- Notes:
--   1. 纯新增表，不改动任何既有表，对存量环境无行为影响。
--   2. 幂等：CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS。
--   3. 版本比较用整数 version_code，**不要**用 version_name 做字符串比较。
--   4. 状态列名为 release_status 而非 status（与 docs/spec/04-database.md 的启用/禁用列区分）。
--   5. 撤回发布用把 release_status 置为 WITHDRAWN 来完成（记录保留），物理删除只用于误录入。
-- ============================================================================

CREATE TABLE IF NOT EXISTS frontend_app_release (
    id CHAR(32) PRIMARY KEY,
    platform VARCHAR(16) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    version_code INT NOT NULL,
    version_name VARCHAR(64) NOT NULL,
    min_supported_version_code INT,
    download_url VARCHAR(1000),
    release_notes VARCHAR(2000),
    release_status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMP,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_app_release ON frontend_app_release (platform, channel, version_code);
CREATE INDEX IF NOT EXISTS idx_app_release_latest ON frontend_app_release (platform, channel, release_status, version_code);

COMMENT ON TABLE frontend_app_release IS '应用版本发布记录表';
COMMENT ON COLUMN frontend_app_release.id IS '主键，UUID';
COMMENT ON COLUMN frontend_app_release.platform IS '平台：IOS/ANDROID/OHOS/H5';
COMMENT ON COLUMN frontend_app_release.channel IS '分发渠道；客户端未传时取平台默认渠道';
COMMENT ON COLUMN frontend_app_release.version_code IS '整数构建号，比较用；不要用字符串版本号比较';
COMMENT ON COLUMN frontend_app_release.version_name IS '展示用版本号，如 1.4.1';
COMMENT ON COLUMN frontend_app_release.min_supported_version_code IS '最低可接受构建号，低于此值的客户端必须强制升级';
COMMENT ON COLUMN frontend_app_release.download_url IS '下载地址；声明了最低支持版本时必须提供';
COMMENT ON COLUMN frontend_app_release.release_notes IS '更新说明';
COMMENT ON COLUMN frontend_app_release.release_status IS '发布状态：DRAFT/PUBLISHED/WITHDRAWN，仅 PUBLISHED 参与"最新版本"计算';
COMMENT ON COLUMN frontend_app_release.published_at IS '发布时间';
COMMENT ON COLUMN frontend_app_release.create_time IS '创建时间';
COMMENT ON COLUMN frontend_app_release.update_time IS '更新时间';
