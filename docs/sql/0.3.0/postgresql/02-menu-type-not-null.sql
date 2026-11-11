-- auth_menu.type 改为必填。说明同 mysql/02-menu-type-not-null.sql。
--
-- PostgreSQL 的 SET NOT NULL 依赖全表扫描校验，表中已有 NULL 时会直接报错，
-- 因此必须先回填再改约束。

UPDATE auth_menu SET type = 'MENU' WHERE type IS NULL;

ALTER TABLE auth_menu ALTER COLUMN type SET DEFAULT 'MENU';

ALTER TABLE auth_menu ALTER COLUMN type SET NOT NULL;