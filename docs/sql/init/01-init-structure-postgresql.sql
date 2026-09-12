-- ============================================================================
-- Nebula - Database Structure Initialization Script
-- File: 01-init-structure-postgresql.sql
-- Purpose: Initialize all module table structures (PostgreSQL)
-- Usage: psql -d nebula -f 01-init-structure-postgresql.sql
-- Notes:
--   1. Target database: PostgreSQL 14+.
--   2. Execute this script before 02-init-data-postgresql.sql.
--   3. SQL sections are grouped by module for easier future maintenance.
--   4. This script assumes the target database already exists.
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- Module: auth
-- Source: auth/01-auth-schema-mysql.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- auth-core / user
-- Tables: auth_user
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_user (
    id CHAR(32) PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(500),
    email VARCHAR(50),
    phone VARCHAR(50),
    status SMALLINT NOT NULL DEFAULT 1,
    permission_updated_at BIGINT,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_user_username ON auth_user (username);
CREATE INDEX IF NOT EXISTS idx_user_status ON auth_user (status);

COMMENT ON TABLE auth_user IS '用户表';
COMMENT ON COLUMN auth_user.id IS '主键，UUID v7';
COMMENT ON COLUMN auth_user.username IS '用户名，唯一';
COMMENT ON COLUMN auth_user.password IS '密码';
COMMENT ON COLUMN auth_user.nickname IS '昵称';
COMMENT ON COLUMN auth_user.avatar IS '头像URL';
COMMENT ON COLUMN auth_user.email IS '邮箱';
COMMENT ON COLUMN auth_user.phone IS '手机号';
COMMENT ON COLUMN auth_user.status IS '状态：0禁用 1启用';
COMMENT ON COLUMN auth_user.permission_updated_at IS '权限更新时间戳(epoch毫秒), 用于判断权限新鲜度';
COMMENT ON COLUMN auth_user.create_time IS '创建时间';
COMMENT ON COLUMN auth_user.update_time IS '更新时间';

-- ----------------------------------------------------------------------------
-- auth-core / role
-- Tables: auth_role
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_role (
    id CHAR(32) PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    status SMALLINT NOT NULL DEFAULT 1,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_role_code ON auth_role (code);
CREATE INDEX IF NOT EXISTS idx_role_status ON auth_role (status);

COMMENT ON TABLE auth_role IS '角色表';
COMMENT ON COLUMN auth_role.id IS '主键，UUID v7';
COMMENT ON COLUMN auth_role.code IS '角色编码，唯一';
COMMENT ON COLUMN auth_role.name IS '角色名称';
COMMENT ON COLUMN auth_role.description IS '描述';
COMMENT ON COLUMN auth_role.status IS '状态：0禁用 1启用';
COMMENT ON COLUMN auth_role.create_time IS '创建时间';
COMMENT ON COLUMN auth_role.update_time IS '更新时间';

-- ----------------------------------------------------------------------------
-- auth-core / organization
-- Tables: auth_org, auth_user_org
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_org (
    id CHAR(32) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id CHAR(32),
    path VARCHAR(500),
    sort INT NOT NULL DEFAULT 0,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(32) NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_org_code ON auth_org (code);
CREATE INDEX IF NOT EXISTS idx_org_status ON auth_org (status);
CREATE INDEX IF NOT EXISTS idx_org_parent_id ON auth_org (parent_id);

COMMENT ON TABLE auth_org IS '组织表';
COMMENT ON COLUMN auth_org.id IS '主键，UUID v7';
COMMENT ON COLUMN auth_org.name IS '组织名称';
COMMENT ON COLUMN auth_org.parent_id IS '父组织ID，NULL为根节点';
COMMENT ON COLUMN auth_org.path IS '层级路径';
COMMENT ON COLUMN auth_org.sort IS '排序，越大越靠前';
COMMENT ON COLUMN auth_org.code IS '组织编码，唯一';
COMMENT ON COLUMN auth_org.type IS '类型：COMPANY公司 DEPARTMENT部门 TEAM小组';
COMMENT ON COLUMN auth_org.status IS '状态：0禁用 1启用';
COMMENT ON COLUMN auth_org.create_time IS '创建时间';
COMMENT ON COLUMN auth_org.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS auth_user_org (
    id CHAR(32) PRIMARY KEY,
    user_id CHAR(32) NOT NULL,
    org_id CHAR(32) NOT NULL,
    is_main_org BOOLEAN NOT NULL DEFAULT FALSE,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_user_org ON auth_user_org (user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_user_org_user_id ON auth_user_org (user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_org_id ON auth_user_org (org_id);

COMMENT ON TABLE auth_user_org IS '用户-组织关联表';
COMMENT ON COLUMN auth_user_org.id IS '主键，UUID v7';
COMMENT ON COLUMN auth_user_org.user_id IS '用户ID';
COMMENT ON COLUMN auth_user_org.org_id IS '组织ID';
COMMENT ON COLUMN auth_user_org.is_main_org IS '是否主组织：0否 1是';
COMMENT ON COLUMN auth_user_org.create_time IS '创建时间';
COMMENT ON COLUMN auth_user_org.update_time IS '更新时间';

-- ----------------------------------------------------------------------------
-- auth-core / user-role relation
-- Tables: auth_user_role
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_user_role (
    id CHAR(32) PRIMARY KEY,
    user_id CHAR(32) NOT NULL,
    role_id CHAR(32) NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_user_role ON auth_user_role (user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON auth_user_role (user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_role_id ON auth_user_role (role_id);

COMMENT ON TABLE auth_user_role IS '用户-角色关联表';
COMMENT ON COLUMN auth_user_role.id IS '主键，UUID v7';
COMMENT ON COLUMN auth_user_role.user_id IS '用户ID';
COMMENT ON COLUMN auth_user_role.role_id IS '角色ID';
COMMENT ON COLUMN auth_user_role.create_time IS '创建时间';
COMMENT ON COLUMN auth_user_role.update_time IS '更新时间';

-- ----------------------------------------------------------------------------
-- auth-core / resource
-- Tables: auth_menu, auth_button
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_menu (
    id CHAR(32) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id CHAR(32),
    path VARCHAR(200),
    sort INT NOT NULL DEFAULT 0,
    code VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    component VARCHAR(200),
    type VARCHAR(100),
    status SMALLINT NOT NULL DEFAULT 1,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    external_url VARCHAR(500),
    visible_in_breadcrumb BOOLEAN NOT NULL DEFAULT TRUE,
    visible_in_tab BOOLEAN NOT NULL DEFAULT TRUE,
    active_menu_path VARCHAR(200),
    remark VARCHAR(500),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_menu_code ON auth_menu (code);
CREATE INDEX IF NOT EXISTS idx_menu_status ON auth_menu (status);
CREATE INDEX IF NOT EXISTS idx_menu_parent_id ON auth_menu (parent_id);

COMMENT ON TABLE auth_menu IS '菜单表';
COMMENT ON COLUMN auth_menu.id IS '主键，UUID v7';
COMMENT ON COLUMN auth_menu.name IS '菜单名称';
COMMENT ON COLUMN auth_menu.parent_id IS '父菜单ID，NULL为根节点';
COMMENT ON COLUMN auth_menu.path IS '路由路径';
COMMENT ON COLUMN auth_menu.sort IS '排序号';
COMMENT ON COLUMN auth_menu.code IS '菜单编码，唯一';
COMMENT ON COLUMN auth_menu.icon IS '图标';
COMMENT ON COLUMN auth_menu.component IS '前端组件路径';
COMMENT ON COLUMN auth_menu.type IS '类型：目录、菜单、内嵌、外链';
COMMENT ON COLUMN auth_menu.status IS '状态：0禁用 1启用';
COMMENT ON COLUMN auth_menu.hidden IS '是否隐藏：0否 1是';
COMMENT ON COLUMN auth_menu.external_url IS '外链地址';
COMMENT ON COLUMN auth_menu.visible_in_breadcrumb IS '是否显示在面包屑：0否 1是';
COMMENT ON COLUMN auth_menu.visible_in_tab IS '是否显示在标签页：0否 1是';
COMMENT ON COLUMN auth_menu.active_menu_path IS '激活菜单路径';
COMMENT ON COLUMN auth_menu.remark IS '备注';
COMMENT ON COLUMN auth_menu.create_time IS '创建时间';
COMMENT ON COLUMN auth_menu.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS auth_button (
    id CHAR(32) PRIMARY KEY,
    menu_id CHAR(32) NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20),
    sort INT NOT NULL DEFAULT 0,
    status SMALLINT NOT NULL DEFAULT 1,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_button_code ON auth_button (code);
CREATE INDEX IF NOT EXISTS idx_button_status ON auth_button (status);
CREATE INDEX IF NOT EXISTS idx_button_menu_id ON auth_button (menu_id);

COMMENT ON TABLE auth_button IS '按钮表';
COMMENT ON COLUMN auth_button.id IS '主键，UUID v7';
COMMENT ON COLUMN auth_button.menu_id IS '所属菜单ID';
COMMENT ON COLUMN auth_button.code IS '按钮编码，唯一';
COMMENT ON COLUMN auth_button.name IS '按钮名称';
COMMENT ON COLUMN auth_button.type IS '按钮类型：add/edit/delete/export等';
COMMENT ON COLUMN auth_button.sort IS '排序号';
COMMENT ON COLUMN auth_button.status IS '状态：0禁用 1启用';
COMMENT ON COLUMN auth_button.create_time IS '创建时间';
COMMENT ON COLUMN auth_button.update_time IS '更新时间';

-- ----------------------------------------------------------------------------
-- auth-core / permission
-- Tables: auth_permission
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_permission (
    id CHAR(32) PRIMARY KEY,
    subject_type VARCHAR(20) NOT NULL,
    subject_id CHAR(32) NOT NULL,
    resource_type VARCHAR(20) NOT NULL,
    resource_id CHAR(32) NOT NULL,
    effect VARCHAR(100) NOT NULL DEFAULT 'Allow',
    scope VARCHAR(100) NOT NULL DEFAULT 'ALL',
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_permission ON auth_permission (subject_type, subject_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_subject ON auth_permission (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_permission_resource ON auth_permission (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_effect ON auth_permission (effect);

COMMENT ON TABLE auth_permission IS '权限表';
COMMENT ON COLUMN auth_permission.id IS '主键，UUID v7';
COMMENT ON COLUMN auth_permission.subject_type IS '主体类型：USER/ROLE/ORG';
COMMENT ON COLUMN auth_permission.subject_id IS '主体ID';
COMMENT ON COLUMN auth_permission.resource_type IS '资源类型：MENU/BUTTON';
COMMENT ON COLUMN auth_permission.resource_id IS '资源ID';
COMMENT ON COLUMN auth_permission.effect IS '效果：Allow（授权）或 Deny（拒绝）';
COMMENT ON COLUMN auth_permission.scope IS '权限范围，默认ALL';
COMMENT ON COLUMN auth_permission.create_time IS '创建时间';
COMMENT ON COLUMN auth_permission.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS auth_data_scope (
    id CHAR(32) PRIMARY KEY,
    subject_type VARCHAR(20) NOT NULL,
    subject_id CHAR(32) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    data_scope VARCHAR(50) NOT NULL DEFAULT 'SELF',
    scope_value TEXT,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_data_scope_subject_resource ON auth_data_scope (subject_type, subject_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_data_scope_subject ON auth_data_scope (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_data_scope_resource ON auth_data_scope (resource_type);
CREATE INDEX IF NOT EXISTS idx_data_scope_value ON auth_data_scope (data_scope);

COMMENT ON TABLE auth_data_scope IS '数据范围表';
COMMENT ON COLUMN auth_data_scope.id IS '主键，UUID v7';
COMMENT ON COLUMN auth_data_scope.subject_type IS '主体类型：USER/ROLE/ORG';
COMMENT ON COLUMN auth_data_scope.subject_id IS '主体ID';
COMMENT ON COLUMN auth_data_scope.resource_type IS '业务资源类型：ORDER/CUSTOMER/CONTRACT等';
COMMENT ON COLUMN auth_data_scope.data_scope IS '数据范围：SELF/DEPT/DEPT_AND_CHILDREN/ALL/CUSTOM_DEPT，默认SELF';
COMMENT ON COLUMN auth_data_scope.scope_value IS '数据范围扩展值，CUSTOM_DEPT 时存储英文逗号分隔的组织ID列表';
COMMENT ON COLUMN auth_data_scope.create_time IS '创建时间';
COMMENT ON COLUMN auth_data_scope.update_time IS '更新时间';

-- ----------------------------------------------------------------------------
-- auth-core / oauth2
-- Tables: auth_oauth2_account
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_oauth2_account (
    id CHAR(32) PRIMARY KEY,
    user_id CHAR(32) NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(100) NOT NULL,
    provider_attributes TEXT,
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_provider_user ON auth_oauth2_account (provider_id, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth2_account_user_id ON auth_oauth2_account (user_id);

COMMENT ON TABLE auth_oauth2_account IS 'OAuth2账户表';
COMMENT ON COLUMN auth_oauth2_account.id IS '主键，UUID v7';
COMMENT ON COLUMN auth_oauth2_account.user_id IS '用户ID';
COMMENT ON COLUMN auth_oauth2_account.provider_id IS '提供商ID';
COMMENT ON COLUMN auth_oauth2_account.provider_user_id IS '提供商用户ID';
COMMENT ON COLUMN auth_oauth2_account.provider_attributes IS '提供商返回的用户属性(JSON)';
COMMENT ON COLUMN auth_oauth2_account.linked_at IS '绑定时间';
COMMENT ON COLUMN auth_oauth2_account.create_time IS '创建时间';
COMMENT ON COLUMN auth_oauth2_account.update_time IS '更新时间';

-- ============================================================================
-- Module: dict
-- Source: dict/01-dict-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS sys_dict_type (
    id CHAR(32) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    remark VARCHAR(255),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_dict_type_code ON sys_dict_type (code);

COMMENT ON TABLE sys_dict_type IS '字典类型表';
COMMENT ON COLUMN sys_dict_type.id IS '主键，UUID v7';
COMMENT ON COLUMN sys_dict_type.code IS '字典编码，唯一';
COMMENT ON COLUMN sys_dict_type.name IS '字典名称';
COMMENT ON COLUMN sys_dict_type.remark IS '备注';
COMMENT ON COLUMN sys_dict_type.create_time IS '创建时间';
COMMENT ON COLUMN sys_dict_type.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS sys_dict_item (
    id CHAR(32) PRIMARY KEY,
    dict_code VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id CHAR(32),
    path VARCHAR(500),
    item_value VARCHAR(255) NOT NULL,
    sort INT NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    tag_color VARCHAR(50),
    remark VARCHAR(255),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dict_item_dict_code ON sys_dict_item (dict_code);
CREATE INDEX IF NOT EXISTS idx_dict_item_is_enabled ON sys_dict_item (is_enabled);
CREATE INDEX IF NOT EXISTS idx_dict_item_sort ON sys_dict_item (dict_code, sort);
CREATE INDEX IF NOT EXISTS idx_dict_item_parent_id ON sys_dict_item (parent_id);

COMMENT ON TABLE sys_dict_item IS '字典项表';
COMMENT ON COLUMN sys_dict_item.id IS '主键，UUID v7';
COMMENT ON COLUMN sys_dict_item.dict_code IS '所属字典编码';
COMMENT ON COLUMN sys_dict_item.name IS '字典项名称';
COMMENT ON COLUMN sys_dict_item.parent_id IS '父级字典项ID';
COMMENT ON COLUMN sys_dict_item.path IS '树路径';
COMMENT ON COLUMN sys_dict_item.item_value IS '字典项值';
COMMENT ON COLUMN sys_dict_item.sort IS '排序号';
COMMENT ON COLUMN sys_dict_item.is_enabled IS '是否启用';
COMMENT ON COLUMN sys_dict_item.tag_color IS '标签颜色';
COMMENT ON COLUMN sys_dict_item.remark IS '备注';
COMMENT ON COLUMN sys_dict_item.create_time IS '创建时间';
COMMENT ON COLUMN sys_dict_item.update_time IS '更新时间';

-- ============================================================================
-- Module: frontend
-- Source: frontend/01-frontend-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS frontend_user_preference (
    id CHAR(32) PRIMARY KEY,
    user_id CHAR(32) NOT NULL,
    locale_tag VARCHAR(32),
    theme_code VARCHAR(64),
    navigation_layout_code VARCHAR(64),
    sidebar_layout_code VARCHAR(64),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_frontend_preference_user ON frontend_user_preference (user_id);

COMMENT ON TABLE frontend_user_preference IS '前端用户偏好表';
COMMENT ON COLUMN frontend_user_preference.id IS '主键，UUID';
COMMENT ON COLUMN frontend_user_preference.user_id IS '用户ID';
COMMENT ON COLUMN frontend_user_preference.locale_tag IS '语言标签';
COMMENT ON COLUMN frontend_user_preference.theme_code IS '预设主题编码';
COMMENT ON COLUMN frontend_user_preference.navigation_layout_code IS '预设导航布局编码';
COMMENT ON COLUMN frontend_user_preference.sidebar_layout_code IS '预设侧边菜单布局编码';
COMMENT ON COLUMN frontend_user_preference.create_time IS '创建时间';
COMMENT ON COLUMN frontend_user_preference.update_time IS '更新时间';

-- ============================================================================
-- Module: notify
-- Source: notify/01-notify-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS sys_notify_template (
    id VARCHAR(64) PRIMARY KEY,
    template_code VARCHAR(100) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    remark VARCHAR(500),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_notify_template_code ON sys_notify_template (template_code);

COMMENT ON TABLE sys_notify_template IS '通知模板表';
COMMENT ON COLUMN sys_notify_template.id IS '主键';
COMMENT ON COLUMN sys_notify_template.template_code IS '模板编码';
COMMENT ON COLUMN sys_notify_template.template_name IS '模板名称';
COMMENT ON COLUMN sys_notify_template.remark IS '备注';
COMMENT ON COLUMN sys_notify_template.create_time IS '创建时间';
COMMENT ON COLUMN sys_notify_template.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS sys_notify_template_field (
    id VARCHAR(64) PRIMARY KEY,
    template_id VARCHAR(64) NOT NULL,
    field_code VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    default_value VARCHAR(500),
    example_value VARCHAR(500),
    remark VARCHAR(500),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_notify_template_field_code ON sys_notify_template_field (template_id, field_code);
CREATE INDEX IF NOT EXISTS idx_notify_template_field_template ON sys_notify_template_field (template_id);

COMMENT ON TABLE sys_notify_template_field IS '通知模板自定义字段表';
COMMENT ON COLUMN sys_notify_template_field.id IS '主键';
COMMENT ON COLUMN sys_notify_template_field.template_id IS '通知模板ID';
COMMENT ON COLUMN sys_notify_template_field.field_code IS '字段编码';
COMMENT ON COLUMN sys_notify_template_field.field_name IS '字段名称';
COMMENT ON COLUMN sys_notify_template_field.is_required IS '是否必填';
COMMENT ON COLUMN sys_notify_template_field.default_value IS '默认值';
COMMENT ON COLUMN sys_notify_template_field.example_value IS '示例值';
COMMENT ON COLUMN sys_notify_template_field.remark IS '备注';
COMMENT ON COLUMN sys_notify_template_field.create_time IS '创建时间';
COMMENT ON COLUMN sys_notify_template_field.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS sys_notify_template_variant (
    id VARCHAR(64) PRIMARY KEY,
    template_id VARCHAR(64) NOT NULL,
    channel_type VARCHAR(32) NOT NULL,
    subject_template VARCHAR(255),
    content_template TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    remark VARCHAR(500),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_notify_template_variant_channel ON sys_notify_template_variant (template_id, channel_type);
CREATE INDEX IF NOT EXISTS idx_notify_template_variant_template ON sys_notify_template_variant (template_id);
CREATE INDEX IF NOT EXISTS idx_notify_template_variant_channel ON sys_notify_template_variant (channel_type);

COMMENT ON TABLE sys_notify_template_variant IS '通知模板渠道变体表';
COMMENT ON COLUMN sys_notify_template_variant.id IS '主键';
COMMENT ON COLUMN sys_notify_template_variant.template_id IS '通知模板ID';
COMMENT ON COLUMN sys_notify_template_variant.channel_type IS '渠道类型';
COMMENT ON COLUMN sys_notify_template_variant.subject_template IS '标题模板';
COMMENT ON COLUMN sys_notify_template_variant.content_template IS '内容模板';
COMMENT ON COLUMN sys_notify_template_variant.is_enabled IS '是否启用';
COMMENT ON COLUMN sys_notify_template_variant.remark IS '备注';
COMMENT ON COLUMN sys_notify_template_variant.create_time IS '创建时间';
COMMENT ON COLUMN sys_notify_template_variant.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS sys_notify_channel_target (
    id VARCHAR(64) PRIMARY KEY,
    target_name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(32) NOT NULL,
    endpoint_url VARCHAR(1000) NOT NULL,
    config_json TEXT,
    remark VARCHAR(500),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notify_channel_target_channel ON sys_notify_channel_target (channel_type);

COMMENT ON TABLE sys_notify_channel_target IS '通知渠道目标表';
COMMENT ON COLUMN sys_notify_channel_target.id IS '主键';
COMMENT ON COLUMN sys_notify_channel_target.target_name IS '目标名称';
COMMENT ON COLUMN sys_notify_channel_target.channel_type IS '渠道类型';
COMMENT ON COLUMN sys_notify_channel_target.endpoint_url IS '投递端点地址';
COMMENT ON COLUMN sys_notify_channel_target.config_json IS '渠道扩展配置';
COMMENT ON COLUMN sys_notify_channel_target.remark IS '备注';
COMMENT ON COLUMN sys_notify_channel_target.create_time IS '创建时间';
COMMENT ON COLUMN sys_notify_channel_target.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS sys_notify_record (
    id VARCHAR(64) PRIMARY KEY,
    channel_type VARCHAR(20) NOT NULL,
    template_code VARCHAR(100),
    template_variant_id VARCHAR(64),
    target_id VARCHAR(64),
    receiver_user_id VARCHAR(64),
    subject_text VARCHAR(255),
    content_text TEXT NOT NULL,
    receiver VARCHAR(255) NOT NULL,
    send_status VARCHAR(20),
    fail_reason VARCHAR(500),
    send_time TIMESTAMP,
    ext_json TEXT,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notify_record_channel ON sys_notify_record (channel_type);
CREATE INDEX IF NOT EXISTS idx_notify_record_template ON sys_notify_record (template_code);
CREATE INDEX IF NOT EXISTS idx_notify_record_variant ON sys_notify_record (template_variant_id);
CREATE INDEX IF NOT EXISTS idx_notify_record_target ON sys_notify_record (target_id);
CREATE INDEX IF NOT EXISTS idx_notify_record_receiver_user ON sys_notify_record (receiver_user_id);
CREATE INDEX IF NOT EXISTS idx_notify_record_status ON sys_notify_record (send_status);
CREATE INDEX IF NOT EXISTS idx_notify_record_receiver ON sys_notify_record (receiver);
CREATE INDEX IF NOT EXISTS idx_notify_record_create_time ON sys_notify_record (create_time);

COMMENT ON TABLE sys_notify_record IS '通知发送记录表';
COMMENT ON COLUMN sys_notify_record.id IS '主键';
COMMENT ON COLUMN sys_notify_record.channel_type IS '渠道类型';
COMMENT ON COLUMN sys_notify_record.template_code IS '模板编码';
COMMENT ON COLUMN sys_notify_record.template_variant_id IS '模板渠道变体ID';
COMMENT ON COLUMN sys_notify_record.target_id IS '渠道目标ID';
COMMENT ON COLUMN sys_notify_record.receiver_user_id IS '接收用户ID';
COMMENT ON COLUMN sys_notify_record.subject_text IS '标题文本';
COMMENT ON COLUMN sys_notify_record.content_text IS '内容文本';
COMMENT ON COLUMN sys_notify_record.receiver IS '接收人';
COMMENT ON COLUMN sys_notify_record.send_status IS '发送状态';
COMMENT ON COLUMN sys_notify_record.fail_reason IS '失败原因';
COMMENT ON COLUMN sys_notify_record.send_time IS '发送时间';
COMMENT ON COLUMN sys_notify_record.ext_json IS '扩展信息';
COMMENT ON COLUMN sys_notify_record.create_time IS '创建时间';
COMMENT ON COLUMN sys_notify_record.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS sys_site_message (
    id VARCHAR(64) PRIMARY KEY,
    record_id VARCHAR(64) NOT NULL,
    receiver_user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    read_status BOOLEAN NOT NULL DEFAULT FALSE,
    read_time TIMESTAMP,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_message_receiver ON sys_site_message (receiver_user_id);
CREATE INDEX IF NOT EXISTS idx_site_message_read ON sys_site_message (read_status);
CREATE INDEX IF NOT EXISTS idx_site_message_record ON sys_site_message (record_id);
CREATE INDEX IF NOT EXISTS idx_site_message_receiver_read_time ON sys_site_message (receiver_user_id, read_status, create_time);

COMMENT ON TABLE sys_site_message IS '站内信表';
COMMENT ON COLUMN sys_site_message.id IS '主键';
COMMENT ON COLUMN sys_site_message.record_id IS '通知记录ID';
COMMENT ON COLUMN sys_site_message.receiver_user_id IS '接收用户ID';
COMMENT ON COLUMN sys_site_message.title IS '标题';
COMMENT ON COLUMN sys_site_message.content IS '内容';
COMMENT ON COLUMN sys_site_message.read_status IS '已读状态';
COMMENT ON COLUMN sys_site_message.read_time IS '已读时间';
COMMENT ON COLUMN sys_site_message.create_time IS '创建时间';
COMMENT ON COLUMN sys_site_message.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS sys_announcement (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status SMALLINT NOT NULL DEFAULT 0,
    publish_time TIMESTAMP NOT NULL,
    expire_time TIMESTAMP,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    sort_num INT NOT NULL DEFAULT 0,
    is_popup BOOLEAN NOT NULL DEFAULT FALSE,
    target_type VARCHAR(20) NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcement_status ON sys_announcement (status);
CREATE INDEX IF NOT EXISTS idx_announcement_publish_time ON sys_announcement (publish_time);
CREATE INDEX IF NOT EXISTS idx_announcement_target_type ON sys_announcement (target_type);
CREATE INDEX IF NOT EXISTS idx_announcement_is_popup ON sys_announcement (is_popup);
CREATE INDEX IF NOT EXISTS idx_announcement_is_pinned ON sys_announcement (is_pinned);

COMMENT ON TABLE sys_announcement IS '公告主表';
COMMENT ON COLUMN sys_announcement.id IS '主键';
COMMENT ON COLUMN sys_announcement.title IS '标题';
COMMENT ON COLUMN sys_announcement.content IS '内容';
COMMENT ON COLUMN sys_announcement.status IS '状态';
COMMENT ON COLUMN sys_announcement.publish_time IS '发布时间';
COMMENT ON COLUMN sys_announcement.expire_time IS '过期时间';
COMMENT ON COLUMN sys_announcement.is_pinned IS '是否置顶';
COMMENT ON COLUMN sys_announcement.sort_num IS '排序号';
COMMENT ON COLUMN sys_announcement.is_popup IS '是否弹窗';
COMMENT ON COLUMN sys_announcement.target_type IS '目标类型';
COMMENT ON COLUMN sys_announcement.create_time IS '创建时间';
COMMENT ON COLUMN sys_announcement.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS sys_announcement_target (
    id VARCHAR(64) PRIMARY KEY,
    announcement_id VARCHAR(64) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_value VARCHAR(64) NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcement_target_announcement ON sys_announcement_target (announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_target_lookup ON sys_announcement_target (target_type, target_value);

COMMENT ON TABLE sys_announcement_target IS '公告定向配置表';
COMMENT ON COLUMN sys_announcement_target.id IS '主键';
COMMENT ON COLUMN sys_announcement_target.announcement_id IS '公告ID';
COMMENT ON COLUMN sys_announcement_target.target_type IS '目标类型';
COMMENT ON COLUMN sys_announcement_target.target_value IS '目标值';
COMMENT ON COLUMN sys_announcement_target.create_time IS '创建时间';
COMMENT ON COLUMN sys_announcement_target.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS sys_announcement_read_record (
    id VARCHAR(64) PRIMARY KEY,
    announcement_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    read_time TIMESTAMP NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_announcement_read_user ON sys_announcement_read_record (announcement_id, user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_read_user ON sys_announcement_read_record (user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_read_time ON sys_announcement_read_record (read_time);

COMMENT ON TABLE sys_announcement_read_record IS '公告已读记录表';
COMMENT ON COLUMN sys_announcement_read_record.id IS '主键';
COMMENT ON COLUMN sys_announcement_read_record.announcement_id IS '公告ID';
COMMENT ON COLUMN sys_announcement_read_record.user_id IS '用户ID';
COMMENT ON COLUMN sys_announcement_read_record.read_time IS '已读时间';
COMMENT ON COLUMN sys_announcement_read_record.create_time IS '创建时间';
COMMENT ON COLUMN sys_announcement_read_record.update_time IS '更新时间';

-- ============================================================================
-- Module: param
-- Source: param/01-param-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS sys_param (
    id CHAR(32) PRIMARY KEY,
    param_key VARCHAR(150) NOT NULL,
    param_name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    param_value TEXT,
    data_type VARCHAR(20) NOT NULL DEFAULT 'STRING',
    option_code VARCHAR(50),
    module_code VARCHAR(50),
    is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_param_key ON sys_param (param_key);
CREATE INDEX IF NOT EXISTS idx_sys_param_module_code ON sys_param (module_code);
CREATE INDEX IF NOT EXISTS idx_sys_param_data_type ON sys_param (data_type);

COMMENT ON TABLE sys_param IS '系统参数表';
COMMENT ON COLUMN sys_param.id IS '主键，UUID v7';
COMMENT ON COLUMN sys_param.param_key IS '参数键，唯一';
COMMENT ON COLUMN sys_param.param_name IS '参数名称';
COMMENT ON COLUMN sys_param.description IS '参数描述';
COMMENT ON COLUMN sys_param.param_value IS '参数值';
COMMENT ON COLUMN sys_param.data_type IS '数据类型：STRING/INT/DOUBLE/BOOLEAN/SINGLE/MULTIPLE';
COMMENT ON COLUMN sys_param.option_code IS '选项编码，关联数据字典';
COMMENT ON COLUMN sys_param.module_code IS '所属模块编码';
COMMENT ON COLUMN sys_param.is_builtin IS '是否内建：0-否，1-是';
COMMENT ON COLUMN sys_param.create_time IS '创建时间';
COMMENT ON COLUMN sys_param.update_time IS '更新时间';
COMMENT ON COLUMN sys_param.is_deleted IS '软删除标记：0-正常，1-已删除';

-- ============================================================================
-- Module: scheduler
-- Source: scheduler/02-scheduler-schema-pgsql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduler_job (
    id CHAR(32) PRIMARY KEY,
    job_code VARCHAR(128) NOT NULL,
    job_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    handler_bean_name VARCHAR(128),
    param_class_name VARCHAR(256),
    cron_expr VARCHAR(128),
    enabled SMALLINT DEFAULT 1,
    execution_target VARCHAR(128),
    engine_job_ref VARCHAR(64),
    manual_trigger_enabled SMALLINT DEFAULT 1,
    param_override_enabled SMALLINT DEFAULT 1,
    default_param_json TEXT,
    timeout_ms INTEGER,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_scheduler_job_code ON scheduler_job (job_code);

COMMENT ON TABLE scheduler_job IS '调度任务定义表';
COMMENT ON COLUMN scheduler_job.id IS '主键，UUID v7';
COMMENT ON COLUMN scheduler_job.job_code IS '任务编码，唯一';
COMMENT ON COLUMN scheduler_job.job_name IS '任务名称';
COMMENT ON COLUMN scheduler_job.description IS '任务描述';
COMMENT ON COLUMN scheduler_job.handler_bean_name IS '处理器Bean名称';
COMMENT ON COLUMN scheduler_job.param_class_name IS '参数类全限定名';
COMMENT ON COLUMN scheduler_job.cron_expr IS 'Cron表达式，非空表示需同步到底层调度引擎';
COMMENT ON COLUMN scheduler_job.enabled IS '是否启用';
COMMENT ON COLUMN scheduler_job.execution_target IS '执行目标编码，映射到底层调度引擎执行器或队列';
COMMENT ON COLUMN scheduler_job.engine_job_ref IS '底层调度引擎任务引用';
COMMENT ON COLUMN scheduler_job.manual_trigger_enabled IS '是否允许手动触发';
COMMENT ON COLUMN scheduler_job.param_override_enabled IS '是否允许运行期参数覆盖';
COMMENT ON COLUMN scheduler_job.default_param_json IS '默认参数JSON';
COMMENT ON COLUMN scheduler_job.timeout_ms IS '超时时间(毫秒)';
COMMENT ON COLUMN scheduler_job.create_time IS '创建时间';
COMMENT ON COLUMN scheduler_job.update_time IS '更新时间';

CREATE TABLE IF NOT EXISTS scheduler_job_run (
    id CHAR(32) PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL,
    job_code VARCHAR(128) NOT NULL,
    trigger_source VARCHAR(32),
    run_status VARCHAR(32),
    engine_execution_ref VARCHAR(255),
    final_param_json TEXT,
    manual_reason VARCHAR(255),
    operator_id VARCHAR(64),
    operator_name VARCHAR(128),
    retry_index INTEGER,
    result_message VARCHAR(512),
    result_json TEXT,
    terminate_reason VARCHAR(255),
    terminated_by VARCHAR(64),
    timeout_ms INTEGER,
    duration_ms BIGINT,
    trigger_time TIMESTAMP,
    start_time TIMESTAMP,
    finish_time TIMESTAMP,
    terminated_at TIMESTAMP,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_scheduler_job_run_request_id ON scheduler_job_run (request_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_job_run_job_code ON scheduler_job_run (job_code);
CREATE INDEX IF NOT EXISTS idx_scheduler_job_run_run_status ON scheduler_job_run (run_status);
CREATE INDEX IF NOT EXISTS idx_scheduler_job_run_create_time ON scheduler_job_run (create_time);

COMMENT ON TABLE scheduler_job_run IS '调度任务运行记录表';
COMMENT ON COLUMN scheduler_job_run.id IS '主键，UUID v7';
COMMENT ON COLUMN scheduler_job_run.request_id IS '运行请求唯一标识，唯一';
COMMENT ON COLUMN scheduler_job_run.job_code IS '任务编码';
COMMENT ON COLUMN scheduler_job_run.trigger_source IS '触发来源：SCHEDULED/MANUAL/RETRY';
COMMENT ON COLUMN scheduler_job_run.run_status IS '运行状态：PENDING/RUNNING/SUCCESS/FAILED/TERMINATING/TERMINATED';
COMMENT ON COLUMN scheduler_job_run.engine_execution_ref IS '底层调度引擎执行引用';
COMMENT ON COLUMN scheduler_job_run.final_param_json IS '最终执行参数JSON';
COMMENT ON COLUMN scheduler_job_run.manual_reason IS '手动触发原因';
COMMENT ON COLUMN scheduler_job_run.operator_id IS '操作人ID';
COMMENT ON COLUMN scheduler_job_run.operator_name IS '操作人名称';
COMMENT ON COLUMN scheduler_job_run.retry_index IS '重试序号';
COMMENT ON COLUMN scheduler_job_run.result_message IS '执行结果消息';
COMMENT ON COLUMN scheduler_job_run.result_json IS '执行结果JSON';
COMMENT ON COLUMN scheduler_job_run.terminate_reason IS '终止原因';
COMMENT ON COLUMN scheduler_job_run.terminated_by IS '终止人ID';
COMMENT ON COLUMN scheduler_job_run.timeout_ms IS '超时时间(毫秒)';
COMMENT ON COLUMN scheduler_job_run.duration_ms IS '运行耗时(毫秒)';
COMMENT ON COLUMN scheduler_job_run.trigger_time IS '触发时间';
COMMENT ON COLUMN scheduler_job_run.start_time IS '开始执行时间';
COMMENT ON COLUMN scheduler_job_run.finish_time IS '完成时间';
COMMENT ON COLUMN scheduler_job_run.terminated_at IS '终止时间';
COMMENT ON COLUMN scheduler_job_run.create_time IS '创建时间';
COMMENT ON COLUMN scheduler_job_run.update_time IS '更新时间';
