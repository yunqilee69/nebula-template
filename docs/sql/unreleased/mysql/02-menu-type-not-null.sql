-- auth_menu.type 改为必填。
--
-- 背景：前端按菜单类型判定导航性，type == 'CATALOG' 渲染为目录分组，其余类型渲染为可跳转菜单。
-- type 为空的行会被判为菜单且其子菜单不再渲染，整段子树在侧边栏不可达。HTTP 入参
-- （CreateMenuReq @NotBlank）与 Service 层（normalizeRequired + validateType）早已拒绝空 type，
-- 但 DDL 层可空，绕开接口的写入（历史数据、直接 SQL、数据导入）仍能产生 type IS NULL 的行。
--
-- 先回填为 'MENU' 再加约束：无父无子的普通菜单是最安全的默认形态，CATALOG 会凭空造出
-- 不可点击的分组、EXTERNAL/IFRAME 需要 external_url，均不能作为默认。

UPDATE auth_menu SET type = 'MENU' WHERE type IS NULL;

ALTER TABLE auth_menu MODIFY COLUMN type VARCHAR(100) NOT NULL DEFAULT 'MENU' COMMENT '类型：目录、菜单、内嵌、外链';