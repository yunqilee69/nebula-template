-- ============================================================================
-- Nebula - Upgrade Script
-- 目标版本：待定（MySQL）；本目录为 unreleased，发版时整体更名为新版本号
-- Purpose: 应用版本与升级检查（能力 #4）
--   新增 frontend_app_release（应用版本发布记录），供客户端启动期做"建议更新/强制更新"判定。
-- Notes:
--   1. 纯新增表，不改动任何既有表，对存量环境无行为影响。
--   2. 幂等：CREATE TABLE IF NOT EXISTS + 索引存在性判断。
--   3. 版本比较用整数 version_code，**不要**用 version_name 做字符串比较
--      （"1.10.0" < "1.9.0" 是字符串比较的结果，是同类功能最常见的缺陷）。
--   4. 状态列名为 release_status 而非 status：status 在 docs/spec/04-database.md 中是
--      "启用/禁用"的标准列（SMALLINT），与 DRAFT/PUBLISHED/WITHDRAWN 这类工作流状态语义不同。
--   5. 撤回发布用把 release_status 置为 WITHDRAWN 来完成（记录保留），物理删除只用于误录入。
-- ============================================================================

CREATE TABLE IF NOT EXISTS frontend_app_release (
    id CHAR(32) NOT NULL,
    platform VARCHAR(16) NOT NULL COMMENT '平台：IOS/ANDROID/OHOS/H5',
    channel VARCHAR(32) NOT NULL COMMENT '分发渠道，如 APP_STORE/HUAWEI/APP_GALLERY/INTERNAL/WEB；客户端未传时取平台默认渠道',
    version_code INT NOT NULL COMMENT '整数构建号，比较用；不要用字符串版本号比较',
    version_name VARCHAR(64) NOT NULL COMMENT '展示用版本号，如 1.4.1',
    min_supported_version_code INT DEFAULT NULL COMMENT '最低可接受构建号，低于此值的客户端必须强制升级',
    download_url VARCHAR(1000) DEFAULT NULL COMMENT '下载地址；声明了最低支持版本时必须提供',
    release_notes VARCHAR(2000) DEFAULT NULL COMMENT '更新说明',
    release_status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT '发布状态：DRAFT/PUBLISHED/WITHDRAWN，仅 PUBLISHED 参与"最新版本"计算',
    published_at DATETIME DEFAULT NULL COMMENT '发布时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_app_release (platform, channel, version_code),
    KEY idx_app_release_latest (platform, channel, release_status, version_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应用版本发布记录表';
