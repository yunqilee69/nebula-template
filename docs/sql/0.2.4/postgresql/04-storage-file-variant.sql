-- ============================================================================
-- Nebula - Upgrade Script
-- 目标版本：待定（PostgreSQL）；本目录为 unreleased，发版时整体更名为新版本号
-- Purpose: 存储增强——文件派生版本（缩略图等）（能力 #5）
--   新增 storage_file_variant，存放缩略图等派生内容，供移动端列表页取小图。
-- Notes:
--   1. 纯新增表，不改动任何既有表，对存量环境无行为影响。
--   2. 幂等：CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS。
--   3. 派生是"可选存在"：未开启图片处理或处理失败时没有派生行，读取端回退原图。
--   4. 内容寻址去重：content_key 由 (file_hash, variant) 派生，多个业务引用同一张图只存一份缩略图。
--   5. uk_file_variant 保证一个文件每个派生版本只有一条记录。
-- ============================================================================

CREATE TABLE IF NOT EXISTS storage_file_variant (
    id CHAR(32) PRIMARY KEY,
    file_id CHAR(32) NOT NULL,
    variant VARCHAR(50) NOT NULL,
    content_key VARCHAR(500) NOT NULL,
    width INT,
    height INT,
    file_size BIGINT,
    file_hash VARCHAR(64),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_file_variant ON storage_file_variant (file_id, variant);
CREATE INDEX IF NOT EXISTS idx_file_variant_hash ON storage_file_variant (file_hash);

COMMENT ON TABLE storage_file_variant IS '文件派生版本表';
COMMENT ON COLUMN storage_file_variant.id IS '主键，UUID';
COMMENT ON COLUMN storage_file_variant.file_id IS '源文件ID';
COMMENT ON COLUMN storage_file_variant.variant IS '派生标识，如 thumb';
COMMENT ON COLUMN storage_file_variant.content_key IS '派生内容存储Key';
COMMENT ON COLUMN storage_file_variant.width IS '宽（图片类）';
COMMENT ON COLUMN storage_file_variant.height IS '高（图片类）';
COMMENT ON COLUMN storage_file_variant.file_size IS '字节数';
COMMENT ON COLUMN storage_file_variant.file_hash IS '内容哈希';
COMMENT ON COLUMN storage_file_variant.create_time IS '创建时间';
COMMENT ON COLUMN storage_file_variant.update_time IS '更新时间';
