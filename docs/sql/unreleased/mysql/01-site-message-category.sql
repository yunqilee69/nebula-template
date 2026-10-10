-- 站内信增加通知类别冗余列。
--
-- 背景：站内信列表要展示类别标签、支持按类别筛选，但 sys_site_message 此前没有类别字段，
-- 类别只存在于 sys_notify_record.category_code（通过 record_id 关联）。分页查询是单表
-- MyBatis-Plus lambda 查询，为它引 JOIN 需要改造成自定义 SQL，而写入侧类别已经算好、
-- 数据量级也小，因此选择在站内信上冗余一份。
--
-- 回填用 UPDATE ... JOIN 而非相关子查询（docs/spec/04-database.md 子查询规范）。
-- COALESCE 保证回填后无 NULL，与 NOT NULL DEFAULT 'DEFAULT' 对齐。

ALTER TABLE sys_site_message
    ADD COLUMN category_code VARCHAR(32) NOT NULL DEFAULT 'DEFAULT'
        COMMENT '通知类别 code，随发送记录冗余' AFTER record_id;

UPDATE sys_site_message sm
    INNER JOIN sys_notify_record r ON r.id = sm.record_id
SET sm.category_code = COALESCE(r.category_code, 'DEFAULT');

CREATE INDEX idx_site_message_receiver_category ON sys_site_message (receiver_user_id, category_code);
