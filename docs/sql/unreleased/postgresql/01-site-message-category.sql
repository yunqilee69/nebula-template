-- 站内信增加通知类别冗余列。说明同 mysql/01-site-message-category.sql。

ALTER TABLE sys_site_message
    ADD COLUMN category_code VARCHAR(32) NOT NULL DEFAULT 'DEFAULT';

COMMENT ON COLUMN sys_site_message.category_code IS '通知类别 code，随发送记录冗余';

UPDATE sys_site_message sm
SET category_code = COALESCE(r.category_code, 'DEFAULT')
FROM sys_notify_record r
WHERE r.id = sm.record_id;

CREATE INDEX idx_site_message_receiver_category ON sys_site_message (receiver_user_id, category_code);
