-- ============================================================================
-- Nebula - Upgrade Script
-- 目标版本：待定（PostgreSQL）；本目录为 unreleased，发版时整体更名为新版本号
-- Purpose: 移动推送与设备注册（能力 #2，服务端部分）
--   1. 新增 sys_notify_push_device（推送设备注册表）
--   2. 新增 sys_notify_push_record_detail（逐设备投递明细）
-- Notes:
--   1. 纯新增表，不改动任何既有表，对存量环境无行为影响。
--   2. 幂等：CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS。
--   3. device_id 全局唯一：一台设备同时只归属一个用户。换人登录同一台设备用
--      **重归属**而不是新增行，否则已登出的用户仍会收到该设备的推送（串号泄露）。
--   4. push_token 是可定位到设备的个人数据：注销设备时会清空该列，日志中也不得完整打印。
--   5. 明细表**不落 push_token**：用 device_id 已足够定位问题，多存一份只是扩大泄露面。
--   6. 主键沿用 notify 模块现状 VARCHAR(64)，而非 docs/spec/04-database.md 的 CHAR(32)；
--      属既有模块偏差，作为独立技术债记录。
-- ============================================================================

CREATE TABLE IF NOT EXISTS sys_notify_push_device (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(128) NOT NULL,
    platform VARCHAR(16) NOT NULL,
    vendor VARCHAR(32) NOT NULL,
    push_token VARCHAR(512),
    is_notification_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    device_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    app_version VARCHAR(64),
    app_build INT,
    os_version VARCHAR(64),
    device_model VARCHAR(128),
    last_active_time TIMESTAMP,
    invalid_reason VARCHAR(255),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_notify_push_device ON sys_notify_push_device (device_id);
CREATE INDEX IF NOT EXISTS idx_notify_push_device_user_status ON sys_notify_push_device (user_id, device_status);
CREATE INDEX IF NOT EXISTS idx_notify_push_device_token ON sys_notify_push_device (push_token);

COMMENT ON TABLE sys_notify_push_device IS '移动推送设备注册表';
COMMENT ON COLUMN sys_notify_push_device.user_id IS '所属用户ID，来自登录态，不接受客户端传入';
COMMENT ON COLUMN sys_notify_push_device.device_id IS '客户端生成的稳定设备标识，全局唯一';
COMMENT ON COLUMN sys_notify_push_device.platform IS '平台：IOS/ANDROID/OHOS';
COMMENT ON COLUMN sys_notify_push_device.vendor IS '推送厂商通道：APNS/HMS/XIAOMI/OPPO/VIVO/HONOR/AGGREGATOR';
COMMENT ON COLUMN sys_notify_push_device.push_token IS '厂商推送token，个人数据；注销时清空';
COMMENT ON COLUMN sys_notify_push_device.is_notification_enabled IS '用户是否已授予通知权限；拒绝授权也注册并置false';
COMMENT ON COLUMN sys_notify_push_device.device_status IS '设备状态：ACTIVE/INVALID/UNREGISTERED，仅 ACTIVE 参与扇出';
COMMENT ON COLUMN sys_notify_push_device.last_active_time IS '最后活跃时间，用于老化清理失效设备（卸载不会调用注销）';
COMMENT ON COLUMN sys_notify_push_device.invalid_reason IS '失效原因，由厂商反馈回填';

CREATE TABLE IF NOT EXISTS sys_notify_push_record_detail (
    id VARCHAR(64) PRIMARY KEY,
    record_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(128) NOT NULL,
    user_id VARCHAR(64),
    vendor VARCHAR(32),
    send_status VARCHAR(20) NOT NULL,
    fail_reason VARCHAR(500),
    message_id VARCHAR(128),
    send_time TIMESTAMP,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notify_push_detail_record ON sys_notify_push_record_detail (record_id);
CREATE INDEX IF NOT EXISTS idx_notify_push_detail_device ON sys_notify_push_record_detail (device_id);

COMMENT ON TABLE sys_notify_push_record_detail IS '逐设备推送投递明细表';
COMMENT ON COLUMN sys_notify_push_record_detail.record_id IS '关联 sys_notify_record.id（channel_type=PUSH）';
COMMENT ON COLUMN sys_notify_push_record_detail.device_id IS '设备标识';
COMMENT ON COLUMN sys_notify_push_record_detail.send_status IS '投递结果：SUCCESS/FAILED/SUPPRESSED';
COMMENT ON COLUMN sys_notify_push_record_detail.fail_reason IS '失败或跳过原因（见 NotifyPushReasons）';
COMMENT ON COLUMN sys_notify_push_record_detail.message_id IS '厂商返回的消息ID，用于排障对账';
COMMENT ON COLUMN sys_notify_push_record_detail.send_time IS '投递时间；未实际投递（跳过）时为空';
