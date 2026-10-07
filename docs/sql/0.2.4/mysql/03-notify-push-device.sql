-- ============================================================================
-- Nebula - Upgrade Script
-- 目标版本：待定（MySQL）；本目录为 unreleased，发版时整体更名为新版本号
-- Purpose: 移动推送与设备注册（能力 #2，服务端部分）
--   1. 新增 sys_notify_push_device（推送设备注册表）
--   2. 新增 sys_notify_push_record_detail（逐设备投递明细）
-- Notes:
--   1. 纯新增表，不改动任何既有表，对存量环境无行为影响；
--      也不需要给 sys_notify_record 加列——PUSH 复用既有 channel_type/send_status。
--   2. 幂等：CREATE TABLE IF NOT EXISTS。
--   3. device_id 全局唯一：一台设备同时只归属一个用户。换人登录同一台设备用
--      **重归属**而不是新增行，否则已登出的用户仍会收到该设备的推送（串号泄露）。
--   4. push_token 是可定位到设备的个人数据：注销设备时会清空该列，日志中也不得完整打印。
--      push_token 允许为 NULL（注销后为空）。
--   5. 明细表**不落 push_token**，连尾部也不落：用 device_id 已足够定位问题，
--      多存一份只是扩大泄露面。
--   6. 主键沿用 notify 模块现状 VARCHAR(64)（与 sys_notify_record、sys_site_message 一致），
--      而非 docs/spec/04-database.md 的 CHAR(32)；属既有模块偏差，作为独立技术债记录。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 推送设备注册表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_notify_push_device (
    id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL COMMENT '所属用户ID，来自登录态，不接受客户端传入',
    device_id VARCHAR(128) NOT NULL COMMENT '客户端生成的稳定设备标识，全局唯一',
    platform VARCHAR(16) NOT NULL COMMENT '平台：IOS/ANDROID/OHOS',
    vendor VARCHAR(32) NOT NULL COMMENT '推送厂商通道：APNS/HMS/XIAOMI/OPPO/VIVO/HONOR/AGGREGATOR',
    push_token VARCHAR(512) DEFAULT NULL COMMENT '厂商推送token，个人数据；注销时清空',
    is_notification_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '用户是否已授予通知权限；拒绝授权也注册并置0',
    device_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT '设备状态：ACTIVE/INVALID/UNREGISTERED，仅 ACTIVE 参与扇出',
    app_version VARCHAR(64) DEFAULT NULL COMMENT '客户端版本号',
    app_build INT DEFAULT NULL COMMENT '客户端构建号',
    os_version VARCHAR(64) DEFAULT NULL COMMENT '系统版本',
    device_model VARCHAR(128) DEFAULT NULL COMMENT '设备型号',
    last_active_time DATETIME DEFAULT NULL COMMENT '最后活跃时间，用于老化清理失效设备（卸载不会调用注销）',
    invalid_reason VARCHAR(255) DEFAULT NULL COMMENT '失效原因，由厂商反馈回填',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_notify_push_device (device_id),
    KEY idx_notify_push_device_user_status (user_id, device_status),
    KEY idx_notify_push_device_token (push_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='移动推送设备注册表';

-- ----------------------------------------------------------------------------
-- 2. 逐设备推送投递明细
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_notify_push_record_detail (
    id VARCHAR(64) NOT NULL,
    record_id VARCHAR(64) NOT NULL COMMENT '关联 sys_notify_record.id（channel_type=PUSH）',
    device_id VARCHAR(128) NOT NULL COMMENT '设备标识',
    user_id VARCHAR(64) DEFAULT NULL COMMENT '设备所属用户ID',
    vendor VARCHAR(32) DEFAULT NULL COMMENT '推送厂商通道',
    send_status VARCHAR(20) NOT NULL COMMENT '投递结果：SUCCESS/FAILED/SUPPRESSED',
    fail_reason VARCHAR(500) DEFAULT NULL COMMENT '失败或跳过原因（见 NotifyPushReasons）',
    message_id VARCHAR(128) DEFAULT NULL COMMENT '厂商返回的消息ID，用于排障对账',
    send_time DATETIME DEFAULT NULL COMMENT '投递时间；未实际投递（跳过）时为空',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_notify_push_detail_record (record_id),
    KEY idx_notify_push_detail_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='逐设备推送投递明细表';
