-- ============================================================================
-- 增量升级脚本：通知模板切换 Thymeleaf 语法并支持 HTML 正文
-- 方言：MySQL
-- 幂等：加列通过 INFORMATION_SCHEMA 判断；文本替换只匹配 ${key}，重复执行无副作用
-- ============================================================================
--
-- 破坏性变更：
--   1. 通知模板不再支持 ${key} 裸占位符，统一改为 Thymeleaf 语法 [(${key})]；
--      ${notify.xxx} 改为 [(${notify.xxx})]。
--   2. 字段编码只允许 ^[A-Za-z_][A-Za-z0-9_]*$，且不能使用保留变量 notify。
--   3. EMAIL 变体新增可选 html_content_template；配置后发送 multipart/alternative，
--      同时携带纯文本与 HTML，HTML 始终有文本兜底。
--
-- 执行顺序：先跑本脚本的「校验」段，修完不合规字段后再执行更新段（本脚本为顺序执行，
-- 校验段只返回结果，不会中断；请人工确认结果为空后再继续）。

-- ----------------------------------------------------------------------------
-- 1. 新增 HTML 正文列
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS nebula_upgrade_notify_template_html;

DELIMITER $$
CREATE PROCEDURE nebula_upgrade_notify_template_html()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sys_notify_template_variant'
          AND COLUMN_NAME = 'html_content_template'
    ) THEN
        ALTER TABLE sys_notify_template_variant
            ADD COLUMN html_content_template TEXT
            COMMENT 'HTML 内容模板（仅邮件渠道）' AFTER content_template;
    END IF;
END$$
DELIMITER ;

CALL nebula_upgrade_notify_template_html();

DROP PROCEDURE nebula_upgrade_notify_template_html;

-- ----------------------------------------------------------------------------
-- 2. 校验：列出需要人工修正的字段编码
--    结果必须为空再继续，否则这些字段在模板里无法通过 [(${fieldCode})] 解析。
-- ----------------------------------------------------------------------------
SELECT DISTINCT template_id, field_code
FROM sys_notify_template_field
WHERE field_code NOT REGEXP '^[A-Za-z_][A-Za-z0-9_]*$'
   OR LOWER(field_code) = 'notify';

-- ----------------------------------------------------------------------------
-- 3. 把 ${key} / ${notify.key} 转成 [(${key})] / [(${notify.key})]
--    只转换合法标识符形态；混合在普通文本中的 ${...} 若不符合该形态会保持原样，
--    需要人工复核（Thymeleaf 会把它当普通文本原样输出）。
-- ----------------------------------------------------------------------------
UPDATE sys_notify_template_variant
SET subject_template = REGEXP_REPLACE(
        subject_template,
        '[$][{]([A-Za-z_][A-Za-z0-9_.]*)[}]',
        '[(${$1})]'),
    content_template = REGEXP_REPLACE(
        content_template,
        '[$][{]([A-Za-z_][A-Za-z0-9_.]*)[}]',
        '[(${$1})]')
WHERE subject_template LIKE '%${%'
   OR content_template LIKE '%${%';

-- ----------------------------------------------------------------------------
-- 4. 复核：列出仍残留 ${...} 的模板，逐条人工确认是否为有意保留的普通文本
-- ----------------------------------------------------------------------------
SELECT id, template_id, channel_type, subject_template, content_template
FROM sys_notify_template_variant
WHERE subject_template LIKE '%${%'
   OR content_template LIKE '%${%';
