-- ============================================================================
-- Nebula - Upgrade Script
-- 目标版本：待定（MySQL）；本目录为 unreleased，发版时整体更名为新版本号
-- Purpose: 存储增强——文件派生版本（缩略图等）（能力 #5）
--   新增 storage_file_variant，存放缩略图等派生内容，供移动端列表页取小图。
-- Notes:
--   1. 纯新增表，不改动任何既有表，对存量环境无行为影响。
--   2. 幂等：CREATE TABLE IF NOT EXISTS，唯一约束内联。
--   3. 派生是"可选存在"：未开启图片处理或处理失败时没有派生行，读取端回退原图。
--   4. 内容寻址去重：content_key 由 (file_hash, variant) 派生，多个业务引用同一张图只存一份缩略图。
--   5. uk_file_variant 保证一个文件每个派生版本只有一条记录。
-- ============================================================================

CREATE TABLE IF NOT EXISTS storage_file_variant (
    id CHAR(32) NOT NULL,
    file_id CHAR(32) NOT NULL COMMENT '源文件ID',
    variant VARCHAR(50) NOT NULL COMMENT '派生标识，如 thumb',
    content_key VARCHAR(500) NOT NULL COMMENT '派生内容存储Key',
    width INT DEFAULT NULL COMMENT '宽（图片类）',
    height INT DEFAULT NULL COMMENT '高（图片类）',
    file_size BIGINT DEFAULT NULL COMMENT '字节数',
    file_hash VARCHAR(64) DEFAULT NULL COMMENT '内容哈希',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_file_variant (file_id, variant),
    KEY idx_file_variant_hash (file_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件派生版本表';
