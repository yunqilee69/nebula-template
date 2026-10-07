-- ============================================================================
-- Nebula - Database Structure Initialization Script
-- File: 01-init-structure.sql
-- Purpose: Initialize all module table structures (MySQL)
-- Usage: mysql -u root -p nebula < 01-init-structure.sql
-- Notes:
--   1. Target database: MySQL 8.0+.
--   2. Execute this script before 02-init-data.sql.
--   3. SQL sections are grouped by module for easier future maintenance.
--   4. This script assumes the target database already exists.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- Module: auth
-- Source: auth/01-auth-schema-mysql.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- auth-core / user
-- Tables: auth_user
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_user (
    id CHAR(32) NOT NULL,
    username VARCHAR(50) NOT NULL COMMENT '用户名，唯一',
    password VARCHAR(100) NOT NULL COMMENT '密码',
    nickname VARCHAR(50) COMMENT '昵称',
    avatar VARCHAR(500) COMMENT '头像URL',
    email VARCHAR(50) COMMENT '邮箱',
    phone VARCHAR(50) COMMENT '手机号',
    status SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    permission_updated_at BIGINT COMMENT '权限更新时间戳(epoch毫秒), 用于判断权限新鲜度',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_username (username),
    KEY idx_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ----------------------------------------------------------------------------
-- auth-core / role
-- Tables: auth_role
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_role (
    id CHAR(32) NOT NULL,
    code VARCHAR(50) NOT NULL COMMENT '角色编码，唯一',
    name VARCHAR(50) NOT NULL COMMENT '角色名称',
    description VARCHAR(200) COMMENT '描述',
    status SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_role_code (code),
    KEY idx_role_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- ----------------------------------------------------------------------------
-- auth-core / organization
-- Tables: auth_org, auth_user_org
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_org (
    id CHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL COMMENT '组织名称',
    parent_id CHAR(32) COMMENT '父组织ID，NULL为根节点',
    path VARCHAR(500) COMMENT '层级路径',
    sort INT NOT NULL DEFAULT 0 COMMENT '排序，越大越靠前',
    code VARCHAR(50) NOT NULL COMMENT '组织编码，唯一',
    type VARCHAR(32) NOT NULL COMMENT '类型：COMPANY公司 DEPARTMENT部门 TEAM小组',
    status SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_org_code (code),
    KEY idx_org_status (status),
    KEY idx_org_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织表';

CREATE TABLE IF NOT EXISTS auth_user_org (
    id CHAR(32) NOT NULL,
    user_id CHAR(32) NOT NULL COMMENT '用户ID',
    org_id CHAR(32) NOT NULL COMMENT '组织ID',
    is_main_org TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否主组织：0否 1是',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_org (user_id, org_id),
    KEY idx_user_org_user_id (user_id),
    KEY idx_user_org_org_id (org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-组织关联表';

-- ----------------------------------------------------------------------------
-- auth-core / user-role relation
-- Tables: auth_user_role
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_user_role (
    id CHAR(32) NOT NULL,
    user_id CHAR(32) NOT NULL COMMENT '用户ID',
    role_id CHAR(32) NOT NULL COMMENT '角色ID',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_role (user_id, role_id),
    KEY idx_user_role_user_id (user_id),
    KEY idx_user_role_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户-角色关联表';

-- ----------------------------------------------------------------------------
-- auth-core / resource
-- Tables: auth_menu, auth_button
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_menu (
    id CHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL COMMENT '菜单名称',
    parent_id CHAR(32) COMMENT '父菜单ID，NULL为根节点',
    path VARCHAR(200) COMMENT '路由路径',
    sort INT NOT NULL DEFAULT 0 COMMENT '排序号',
    code VARCHAR(100) NOT NULL COMMENT '菜单编码，唯一',
    icon VARCHAR(50) COMMENT '图标',
    component VARCHAR(200) COMMENT '前端组件路径',
    type VARCHAR(100) COMMENT '类型：目录、菜单、内嵌、外链',
    status SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    hidden TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否隐藏：0否 1是',
    external_url VARCHAR(500) COMMENT '外链地址',
    visible_in_breadcrumb TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否显示在面包屑：0否 1是',
    visible_in_tab TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否显示在标签页：0否 1是',
    active_menu_path VARCHAR(200) COMMENT '激活菜单路径',
    remark VARCHAR(500) COMMENT '备注',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_menu_code (code),
    KEY idx_menu_status (status),
    KEY idx_menu_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单表';

CREATE TABLE IF NOT EXISTS auth_button (
    id CHAR(32) NOT NULL,
    menu_id CHAR(32) NOT NULL COMMENT '所属菜单ID',
    code VARCHAR(100) NOT NULL COMMENT '按钮编码，唯一',
    name VARCHAR(100) NOT NULL COMMENT '按钮名称',
    type VARCHAR(20) COMMENT '按钮类型：add/edit/delete/export等',
    sort INT NOT NULL DEFAULT 0 COMMENT '排序号',
    status SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_button_code (code),
    KEY idx_button_status (status),
    KEY idx_button_menu_id (menu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='按钮表';

CREATE TABLE IF NOT EXISTS auth_api (
    id CHAR(32) NOT NULL,
    code VARCHAR(100) NOT NULL COMMENT '接口权限编码，唯一',
    name VARCHAR(100) NOT NULL COMMENT '接口权限名称',
    module VARCHAR(50) COMMENT '所属模块编码，取值来自字典 param_module',
    sort INT NOT NULL DEFAULT 0 COMMENT '排序号',
    remark VARCHAR(500) COMMENT '备注：用途、影响范围',
    status SMALLINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_api_code (code),
    KEY idx_api_module (module),
    KEY idx_api_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='接口权限表';

-- ----------------------------------------------------------------------------
-- auth-core / permission
-- Tables: auth_permission
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_permission (
    id CHAR(32) NOT NULL,
    subject_type VARCHAR(20) NOT NULL COMMENT '主体类型：USER/ROLE/ORG',
    subject_id CHAR(32) NOT NULL COMMENT '主体ID',
    resource_type VARCHAR(20) NOT NULL COMMENT '资源类型：MENU/BUTTON/API',
    resource_id CHAR(32) NOT NULL COMMENT '资源ID',
    effect VARCHAR(100) NOT NULL DEFAULT 'Allow' COMMENT '效果：Allow（授权）或 Deny（拒绝）',
    scope VARCHAR(100) NOT NULL DEFAULT 'ALL' COMMENT '权限范围，默认ALL',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_permission (subject_type, subject_id, resource_type, resource_id),
    KEY idx_permission_subject (subject_type, subject_id),
    KEY idx_permission_resource (resource_type, resource_id),
    KEY idx_permission_effect (effect)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

CREATE TABLE IF NOT EXISTS auth_data_scope (
    id CHAR(32) NOT NULL,
    subject_type VARCHAR(20) NOT NULL COMMENT '主体类型：USER/ROLE/ORG',
    subject_id CHAR(32) NOT NULL COMMENT '主体ID',
    resource_type VARCHAR(50) NOT NULL COMMENT '业务资源类型：ORDER/CUSTOMER/CONTRACT等',
    data_scope VARCHAR(50) NOT NULL DEFAULT 'SELF' COMMENT '数据范围：SELF/DEPT/DEPT_AND_CHILDREN/ALL/CUSTOM_DEPT，默认SELF',
    scope_value TEXT COMMENT '数据范围扩展值，CUSTOM_DEPT 时存储英文逗号分隔的组织ID列表',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_data_scope_subject_resource (subject_type, subject_id, resource_type),
    KEY idx_data_scope_subject (subject_type, subject_id),
    KEY idx_data_scope_resource (resource_type),
    KEY idx_data_scope_value (data_scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据范围表';

-- ----------------------------------------------------------------------------
-- auth-core / oauth2
-- Tables: auth_oauth2_account
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_oauth2_account (
    id CHAR(32) NOT NULL,
    user_id CHAR(32) NOT NULL COMMENT '用户ID',
    provider_id VARCHAR(50) NOT NULL COMMENT '提供商ID',
    provider_user_id VARCHAR(100) NOT NULL COMMENT '提供商用户ID',
    provider_attributes TEXT COMMENT '提供商返回的用户属性(JSON)',
    linked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '绑定时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_provider_user (provider_id, provider_user_id),
    KEY idx_oauth2_account_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='OAuth2账户表';

-- ============================================================================
-- Module: dict
-- Source: dict/01-dict-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS sys_dict_type (
    id CHAR(32) NOT NULL,
    code VARCHAR(100) NOT NULL COMMENT '字典编码，唯一',
    name VARCHAR(100) NOT NULL COMMENT '字典名称',
    remark VARCHAR(255) COMMENT '备注',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_dict_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典类型表';

CREATE TABLE IF NOT EXISTS sys_dict_item (
    id CHAR(32) NOT NULL,
    dict_code VARCHAR(100) NOT NULL COMMENT '所属字典编码',
    name VARCHAR(100) NOT NULL COMMENT '字典项名称',
    parent_id CHAR(32) COMMENT '父级字典项ID',
    path VARCHAR(500) COMMENT '树路径',
    item_value VARCHAR(255) NOT NULL COMMENT '字典项值',
    sort INT NOT NULL DEFAULT 0 COMMENT '排序号',
    is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    tag_color VARCHAR(50) COMMENT '标签颜色',
    remark VARCHAR(255) COMMENT '备注',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_dict_item_dict_code (dict_code),
    KEY idx_dict_item_is_enabled (is_enabled),
    KEY idx_dict_item_sort (dict_code, sort),
    KEY idx_dict_item_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典项表';

-- ============================================================================
-- Module: frontend
-- Source: frontend/01-frontend-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS frontend_user_preference (
    id CHAR(32) NOT NULL,
    user_id CHAR(32) NOT NULL COMMENT '用户ID',
    locale_tag VARCHAR(32) COMMENT '语言标签',
    theme_code VARCHAR(64) COMMENT '预设主题编码',
    navigation_layout_code VARCHAR(64) COMMENT '预设导航布局编码',
    sidebar_layout_code VARCHAR(64) COMMENT '预设侧边菜单布局编码',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_frontend_preference_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='前端用户偏好表';

CREATE TABLE IF NOT EXISTS frontend_app_release (
    id CHAR(32) NOT NULL,
    platform VARCHAR(16) NOT NULL COMMENT '平台：IOS/ANDROID/OHOS/H5',
    channel VARCHAR(32) NOT NULL COMMENT '分发渠道，如 APP_STORE/HUAWEI/APP_GALLERY/INTERNAL/WEB；客户端未传时取平台默认渠道',
    version_code INT NOT NULL COMMENT '整数构建号，比较用；不要用字符串版本号比较',
    version_name VARCHAR(64) NOT NULL COMMENT '展示用版本号，如 1.4.1',
    min_supported_version_code INT DEFAULT NULL COMMENT '最低可接受构建号，低于此值的客户端必须强制升级',
    download_url VARCHAR(1000) DEFAULT NULL COMMENT '下载地址；声明了最低支持版本时必须提供',
    release_notes VARCHAR(2000) DEFAULT NULL COMMENT '更新说明',
    release_status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT '发布状态：DRAFT/PUBLISHED/WITHDRAWN，仅 PUBLISHED 参与"最新版本"计算',
    published_at DATETIME DEFAULT NULL COMMENT '发布时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_app_release (platform, channel, version_code),
    KEY idx_app_release_latest (platform, channel, release_status, version_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应用版本发布记录表';

-- ============================================================================
-- Module: notify
-- Source: notify/01-notify-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS sys_notify_template (
    id VARCHAR(64) NOT NULL,
    template_code VARCHAR(100) NOT NULL COMMENT '模板编码',
    template_name VARCHAR(100) NOT NULL COMMENT '模板名称',
    remark VARCHAR(500) COMMENT '备注',
    category_code VARCHAR(32) DEFAULT NULL COMMENT '通知类别 code：SECURITY/TODO/BUSINESS/ANNOUNCEMENT/DEFAULT，空值归入 DEFAULT',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_notify_template_code (template_code),
    KEY idx_notify_template_category (category_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板表';

CREATE TABLE IF NOT EXISTS sys_notify_template_field (
    id VARCHAR(64) NOT NULL,
    template_id VARCHAR(64) NOT NULL COMMENT '通知模板ID',
    field_code VARCHAR(100) NOT NULL COMMENT '字段编码',
    field_name VARCHAR(100) NOT NULL COMMENT '字段名称',
    is_required TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否必填',
    default_value VARCHAR(500) COMMENT '默认值',
    example_value VARCHAR(500) COMMENT '示例值',
    remark VARCHAR(500) COMMENT '备注',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_notify_template_field_code (template_id, field_code),
    KEY idx_notify_template_field_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板自定义字段表';

CREATE TABLE IF NOT EXISTS sys_notify_template_variant (
    id VARCHAR(64) NOT NULL,
    template_id VARCHAR(64) NOT NULL COMMENT '通知模板ID',
    channel_type VARCHAR(32) NOT NULL COMMENT '渠道类型',
    subject_template VARCHAR(255) COMMENT '标题模板',
    content_template TEXT NOT NULL COMMENT '内容模板',
    is_enabled TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用',
    remark VARCHAR(500) COMMENT '备注',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_notify_template_variant_channel (template_id, channel_type),
    KEY idx_notify_template_variant_template (template_id),
    KEY idx_notify_template_variant_channel (channel_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板渠道变体表';

CREATE TABLE IF NOT EXISTS sys_notify_channel_target (
    id VARCHAR(64) NOT NULL,
    target_name VARCHAR(100) NOT NULL COMMENT '目标名称',
    channel_type VARCHAR(32) NOT NULL COMMENT '渠道类型',
    endpoint_url VARCHAR(1000) NOT NULL COMMENT '投递端点地址',
    config_json TEXT COMMENT '渠道扩展配置',
    remark VARCHAR(500) COMMENT '备注',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_notify_channel_target_channel (channel_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知渠道目标表';

CREATE TABLE IF NOT EXISTS sys_notify_record (
    id VARCHAR(64) NOT NULL,
    channel_type VARCHAR(20) NOT NULL COMMENT '渠道类型',
    template_code VARCHAR(100) COMMENT '模板编码',
    template_variant_id VARCHAR(64) COMMENT '模板渠道变体ID',
    target_id VARCHAR(64) COMMENT '渠道目标ID',
    receiver_user_id VARCHAR(64) COMMENT '接收用户ID',
    category_code VARCHAR(32) DEFAULT NULL COMMENT '通知类别 code，历史记录为空',
    subject_text VARCHAR(255) COMMENT '标题文本',
    content_text TEXT NOT NULL COMMENT '内容文本',
    receiver VARCHAR(255) NOT NULL COMMENT '接收人',
    send_status VARCHAR(20) COMMENT '发送状态：SUCCESS/FAILED/SUPPRESSED（SUPPRESSED=被用户偏好抑制未投递）',
    fail_reason VARCHAR(500) COMMENT '失败原因',
    send_time DATETIME COMMENT '发送时间',
    ext_json TEXT COMMENT '扩展信息',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_notify_record_channel (channel_type),
    KEY idx_notify_record_template (template_code),
    KEY idx_notify_record_variant (template_variant_id),
    KEY idx_notify_record_target (target_id),
    KEY idx_notify_record_receiver_user (receiver_user_id),
    KEY idx_notify_record_status (send_status),
    KEY idx_notify_record_receiver (receiver),
    KEY idx_notify_record_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知发送记录表';

-- 通知类别：模板的归类维度，用于按类控制用户是否接收（消息设置页的开关分组）。
-- code 是模板、发送记录与用户偏好共同引用的键，创建后不可修改；is_builtin=1 的内置类别不可删除。
CREATE TABLE IF NOT EXISTS sys_notify_category (
    id VARCHAR(64) NOT NULL,
    code VARCHAR(32) NOT NULL COMMENT '类别编码，唯一且创建后不可修改',
    name VARCHAR(50) NOT NULL COMMENT '类别名称',
    description VARCHAR(200) DEFAULT NULL COMMENT '类别说明，用于设置页展示',
    is_mandatory TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否强制类别：忽略用户偏好，始终放行',
    is_default_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '用户无偏好记录时的默认开关',
    sort INT NOT NULL DEFAULT 100 COMMENT '设置页排序号，值越小越靠前',
    allowed_channels VARCHAR(255) NOT NULL COMMENT '允许使用的渠道，逗号分隔，如 SITE,PUSH',
    is_builtin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否内置类别：不可删、编码不可改',
    is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用；停用后不出现在设置页、不可被新模板选中',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_notify_category_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知类别表';

CREATE TABLE IF NOT EXISTS sys_site_message (
    id VARCHAR(64) NOT NULL,
    record_id VARCHAR(64) NOT NULL COMMENT '通知记录ID',
    receiver_user_id VARCHAR(64) NOT NULL COMMENT '接收用户ID',
    title VARCHAR(255) COMMENT '标题',
    content TEXT NOT NULL COMMENT '内容',
    read_status TINYINT(1) NOT NULL DEFAULT 0 COMMENT '已读状态',
    read_time DATETIME COMMENT '已读时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_site_message_receiver (receiver_user_id),
    KEY idx_site_message_read (read_status),
    KEY idx_site_message_record (record_id),
    KEY idx_site_message_receiver_read_time (receiver_user_id, read_status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站内信表';

CREATE TABLE IF NOT EXISTS sys_announcement (
    id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL COMMENT '标题',
    content TEXT NOT NULL COMMENT '内容',
    status TINYINT(1) NOT NULL DEFAULT 0 COMMENT '状态',
    publish_time DATETIME NOT NULL COMMENT '发布时间',
    expire_time DATETIME COMMENT '过期时间',
    is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
    sort_num INT NOT NULL DEFAULT 0 COMMENT '排序号',
    is_popup TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否弹窗',
    target_type VARCHAR(20) NOT NULL COMMENT '目标类型',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_announcement_status (status),
    KEY idx_announcement_publish_time (publish_time),
    KEY idx_announcement_target_type (target_type),
    KEY idx_announcement_is_popup (is_popup),
    KEY idx_announcement_is_pinned (is_pinned)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告主表';

CREATE TABLE IF NOT EXISTS sys_announcement_target (
    id VARCHAR(64) NOT NULL,
    announcement_id VARCHAR(64) NOT NULL COMMENT '公告ID',
    target_type VARCHAR(20) NOT NULL COMMENT '目标类型',
    target_value VARCHAR(64) NOT NULL COMMENT '目标值',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_announcement_target_announcement (announcement_id),
    KEY idx_announcement_target_lookup (target_type, target_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告定向配置表';

CREATE TABLE IF NOT EXISTS sys_announcement_read_record (
    id VARCHAR(64) NOT NULL,
    announcement_id VARCHAR(64) NOT NULL COMMENT '公告ID',
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    read_time DATETIME NOT NULL COMMENT '已读时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_announcement_read_user (announcement_id, user_id),
    KEY idx_announcement_read_user (user_id),
    KEY idx_announcement_read_time (read_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告已读记录表';

CREATE TABLE IF NOT EXISTS sys_notify_user_preference (
    id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    category_code VARCHAR(32) NOT NULL COMMENT '通知类别 code',
    channel VARCHAR(32) NOT NULL COMMENT '渠道：SITE/EMAIL/PUSH',
    is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否接收',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_notify_user_preference (user_id, category_code, channel),
    KEY idx_notify_user_preference_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户通知订阅偏好表';

-- 移动推送设备注册表。
-- device_id 全局唯一：一台设备同时只归属一个用户；换人登录同一台设备走**重归属**而不是新增行，
-- 否则已登出的用户仍会收到该设备的推送（串号泄露）。
-- push_token 是可定位到设备的个人数据：注销时清空，日志中不得完整打印。
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

-- 逐设备推送投递明细。一次 PUSH 发送会扇出到多台设备，sys_notify_record 上只有一个汇总答案，
-- 排障要能回答"是哪台设备、哪个厂商、什么原因失败的"。刻意不落 push_token。
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

-- ============================================================================
-- Module: param
-- Source: param/01-param-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS sys_param (
    id CHAR(32) NOT NULL,
    param_key VARCHAR(150) NOT NULL COMMENT '参数键，唯一',
    param_name VARCHAR(100) NOT NULL COMMENT '参数名称',
    description VARCHAR(500) COMMENT '参数描述',
    param_value TEXT COMMENT '参数值',
    data_type VARCHAR(20) NOT NULL DEFAULT 'STRING' COMMENT '数据类型：STRING/INT/DOUBLE/BOOLEAN/SINGLE/MULTIPLE',
    option_code VARCHAR(50) COMMENT '选项编码，关联数据字典',
    module_code VARCHAR(50) COMMENT '所属模块编码',
    is_builtin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否内建：0-否，1-是',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记：0-正常，1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_sys_param_key (param_key),
    KEY idx_sys_param_module_code (module_code),
    KEY idx_sys_param_data_type (data_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统参数表';

-- ============================================================================
-- Module: scheduler
-- Source: scheduler/02-scheduler-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduler_job (
    id VARCHAR(64) NOT NULL,
    job_code VARCHAR(128) NOT NULL COMMENT '任务编码，唯一',
    job_name VARCHAR(128) NOT NULL COMMENT '任务名称',
    description VARCHAR(512) COMMENT '任务描述',
    handler_bean_name VARCHAR(128) COMMENT '处理器Bean名称',
    param_class_name VARCHAR(256) COMMENT '参数类全限定名',
    cron_expr VARCHAR(128) COMMENT 'Cron表达式，非空表示需同步到底层调度引擎',
    enabled TINYINT(1) COMMENT '是否启用',
    execution_target VARCHAR(128) COMMENT '执行目标编码，映射到底层调度引擎执行器或队列',
    engine_job_ref VARCHAR(64) COMMENT '底层调度引擎任务引用',
    manual_trigger_enabled TINYINT(1) COMMENT '是否允许手动触发',
    param_override_enabled TINYINT(1) COMMENT '是否允许运行期参数覆盖',
    default_param_json LONGTEXT COMMENT '默认参数JSON',
    timeout_ms INT COMMENT '超时时间(毫秒)',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_scheduler_job_code (job_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调度任务定义表';

CREATE TABLE IF NOT EXISTS scheduler_job_run (
    id VARCHAR(64) NOT NULL,
    request_id VARCHAR(64) NOT NULL COMMENT '运行请求唯一标识，唯一',
    job_code VARCHAR(128) NOT NULL COMMENT '任务编码',
    trigger_source VARCHAR(32) COMMENT '触发来源：SCHEDULED/MANUAL/RETRY',
    run_status VARCHAR(32) COMMENT '运行状态：PENDING/RUNNING/SUCCESS/FAILED/TERMINATING/TERMINATED',
    engine_execution_ref VARCHAR(255) COMMENT '底层调度引擎执行引用',
    final_param_json LONGTEXT COMMENT '最终执行参数JSON',
    manual_reason VARCHAR(255) COMMENT '手动触发原因',
    operator_id VARCHAR(64) COMMENT '操作人ID',
    operator_name VARCHAR(128) COMMENT '操作人名称',
    retry_index INT COMMENT '重试序号',
    result_message VARCHAR(512) COMMENT '执行结果消息',
    result_json LONGTEXT COMMENT '执行结果JSON',
    terminate_reason VARCHAR(255) COMMENT '终止原因',
    terminated_by VARCHAR(64) COMMENT '终止人ID',
    timeout_ms INT COMMENT '超时时间(毫秒)',
    duration_ms BIGINT COMMENT '运行耗时(毫秒)',
    trigger_time DATETIME COMMENT '触发时间',
    start_time DATETIME COMMENT '开始执行时间',
    finish_time DATETIME COMMENT '完成时间',
    terminated_at DATETIME COMMENT '终止时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_scheduler_job_run_request_id (request_id),
    KEY idx_scheduler_job_run_job_code (job_code),
    KEY idx_scheduler_job_run_run_status (run_status),
    KEY idx_scheduler_job_run_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调度任务运行记录表';

-- ============================================================================
-- Module: auth / login-record
-- Source: auth/02-auth-login-record-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS auth_login_record (
    id CHAR(32) NOT NULL COMMENT '主键，UUID v7',
    user_id CHAR(32) NOT NULL COMMENT '用户ID',
    login_account VARCHAR(100) NOT NULL COMMENT '登录账号（用户名/手机/邮箱/OAuth2标识）',
    login_type VARCHAR(20) NOT NULL COMMENT '登录类型：PASSWORD/PHONE/EMAIL/OAUTH2',
    login_result VARCHAR(20) NOT NULL COMMENT '登录结果：SUCCESS/FAILED',
    is_success TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否成功：0失败 1成功',
    login_ip VARCHAR(50) DEFAULT NULL COMMENT '登录IP地址',
    user_agent VARCHAR(500) DEFAULT NULL COMMENT '原始User-Agent字符串',
    client_type VARCHAR(20) DEFAULT NULL COMMENT '客户端端类型：WEB/H5/MP_WEIXIN/MP_ALIPAY/APP/API/UNKNOWN',
    client_type_source VARCHAR(20) DEFAULT NULL COMMENT '端类型判定来源：HEADER/USER_AGENT/DEFAULT',
    device_info VARCHAR(500) DEFAULT NULL COMMENT '设备信息（解析后的浏览器/操作系统）',
    oauth_provider VARCHAR(50) DEFAULT NULL COMMENT 'OAuth2提供商ID（仅OAuth2登录）',
    fail_reason VARCHAR(200) DEFAULT NULL COMMENT '失败原因（仅失败记录）',
    login_time DATETIME NOT NULL COMMENT '登录时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_login_record_user_id (user_id),
    KEY idx_login_record_login_time (login_time),
    KEY idx_login_record_client_type (client_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户登录记录表';

-- ============================================================================
-- Module: audit
-- Source: audit/01-audit-schema-mysql.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_record (
    id VARCHAR(64) NOT NULL,
    operator_id VARCHAR(64) DEFAULT NULL,
    operator_name VARCHAR(128) DEFAULT NULL,
    module VARCHAR(64) DEFAULT NULL,
    action VARCHAR(128) DEFAULT NULL,
    resource_type VARCHAR(128) DEFAULT NULL,
    resource_id VARCHAR(64) DEFAULT NULL,
    resource_name VARCHAR(256) DEFAULT NULL,
    request_params LONGTEXT,
    response_data LONGTEXT,
    request_ip VARCHAR(64) DEFAULT NULL,
    result_status VARCHAR(32) DEFAULT NULL,
    result_message VARCHAR(1024) DEFAULT NULL,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_audit_record_create_time (create_time),
    KEY idx_audit_record_operator_create_time (operator_id, create_time),
    KEY idx_audit_record_module_action_create_time (module, action, create_time),
    KEY idx_audit_record_resource_create_time (resource_type, resource_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计记录表';

-- ============================================================================
-- Module: event
-- Source: event remote MyBatis entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_outbox (
    id CHAR(32) NOT NULL COMMENT 'Outbox行主键',
    event_id VARCHAR(64) NOT NULL COMMENT '事件实例唯一标识',
    event_type VARCHAR(128) NOT NULL COMMENT '业务事件类型',
    module VARCHAR(64) NOT NULL COMMENT '事件所属模块编码',
    code VARCHAR(64) NOT NULL COMMENT '模块内事件编码',
    name VARCHAR(128) COMMENT '事件名称',
    description VARCHAR(500) COMMENT '事件描述',
    aggregate_id VARCHAR(128) COMMENT '业务聚合ID',
    occurred_at BIGINT NOT NULL COMMENT '事件发生时间戳(epoch毫秒)',
    trace_id VARCHAR(128) COMMENT '链路标识',
    ordering_key VARCHAR(128) COMMENT '顺序键',
    idempotency_key VARCHAR(128) COMMENT '幂等键',
    payload_json LONGTEXT COMMENT '事件载荷JSON',
    status VARCHAR(32) NOT NULL DEFAULT 'NEW' COMMENT 'Relay状态',
    retry_count INT NOT NULL DEFAULT 0 COMMENT 'Relay重试次数',
    next_retry_time DATETIME COMMENT '下次重试时间',
    lease_expire_time DATETIME COMMENT '租约过期时间',
    published_time DATETIME COMMENT '发布成功时间',
    last_error_message TEXT COMMENT '最近一次错误信息',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_event_outbox_event_id (event_id),
    KEY idx_event_outbox_status_next_retry (status, next_retry_time),
    KEY idx_event_outbox_lease_expire_time (lease_expire_time),
    KEY idx_event_outbox_event_type (event_type),
    KEY idx_event_outbox_aggregate_id (aggregate_id),
    KEY idx_event_outbox_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='事件Outbox表';

CREATE TABLE IF NOT EXISTS event_consume_record (
    id CHAR(32) NOT NULL COMMENT '消费记录主键',
    consumer_name VARCHAR(128) NOT NULL COMMENT '消费者名称',
    event_id VARCHAR(64) NOT NULL COMMENT '事件ID',
    idempotency_key VARCHAR(128) NOT NULL COMMENT '消费幂等键',
    status VARCHAR(32) NOT NULL COMMENT '消费状态',
    error_message TEXT COMMENT '错误信息',
    consume_time DATETIME COMMENT '消费成功时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_event_consume_record_idempotency (consumer_name, idempotency_key),
    KEY idx_event_consume_record_event_id (event_id),
    KEY idx_event_consume_record_status (status),
    KEY idx_event_consume_record_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='事件消费幂等记录表';

-- ============================================================================
-- Module: storage
-- Source: storage test schema and runtime entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS storage_upload_task (
    id CHAR(32) NOT NULL,
    task_mode VARCHAR(20) NOT NULL COMMENT '上传模式',
    file_name VARCHAR(255) NOT NULL COMMENT '文件名',
    file_extension VARCHAR(50) DEFAULT NULL COMMENT '文件扩展名',
    file_mime_type VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
    file_size BIGINT DEFAULT NULL COMMENT '文件大小',
    file_hash VARCHAR(64) DEFAULT NULL COMMENT '文件哈希',
    chunk_size INT DEFAULT NULL COMMENT '分片大小',
    chunk_count INT DEFAULT NULL COMMENT '分片总数',
    uploaded_chunk_count INT NOT NULL DEFAULT 0 COMMENT '已上传分片数',
    temp_storage_key VARCHAR(500) DEFAULT NULL COMMENT '临时存储Key',
    status VARCHAR(20) NOT NULL COMMENT '上传任务状态',
    upload_user_id CHAR(32) DEFAULT NULL COMMENT '上传用户ID',
    last_chunk_time DATETIME DEFAULT NULL COMMENT '最后分片上传时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_storage_upload_task_status (status),
    KEY idx_storage_upload_task_user (upload_user_id),
    KEY idx_storage_upload_task_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='存储上传任务表';

CREATE TABLE IF NOT EXISTS storage_upload_part (
    id CHAR(32) NOT NULL,
    task_id CHAR(32) NOT NULL COMMENT '上传任务ID',
    part_number INT NOT NULL COMMENT '分片序号',
    part_hash VARCHAR(64) DEFAULT NULL COMMENT '分片哈希',
    part_storage_key VARCHAR(500) NOT NULL COMMENT '分片存储Key',
    status VARCHAR(20) NOT NULL COMMENT '分片状态',
    upload_time DATETIME NOT NULL COMMENT '上传时间',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_storage_upload_part_task_no (task_id, part_number),
    KEY idx_storage_upload_part_task (task_id),
    KEY idx_storage_upload_part_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='存储上传分片表';

CREATE TABLE IF NOT EXISTS storage_file (
    id CHAR(32) NOT NULL,
    file_name VARCHAR(255) NOT NULL COMMENT '文件名',
    file_extension VARCHAR(50) DEFAULT NULL COMMENT '文件扩展名',
    file_mime_type VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
    file_size BIGINT NOT NULL COMMENT '文件大小',
    file_hash VARCHAR(64) NOT NULL COMMENT '文件哈希',
    storage_provider VARCHAR(32) NOT NULL COMMENT '存储Provider',
    storage_key VARCHAR(500) NOT NULL COMMENT '存储Key',
    storage_bucket VARCHAR(100) DEFAULT NULL COMMENT '存储Bucket',
    source_entity VARCHAR(100) NOT NULL COMMENT '来源业务实体',
    source_id CHAR(32) NOT NULL COMMENT '来源业务ID',
    source_type VARCHAR(100) DEFAULT NULL COMMENT '来源类型',
    upload_task_id CHAR(32) NOT NULL COMMENT '上传任务ID',
    upload_user_id CHAR(32) DEFAULT NULL COMMENT '上传用户ID',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_storage_file_source (source_entity, source_id, source_type),
    KEY idx_storage_file_upload_task (upload_task_id),
    KEY idx_storage_file_hash (file_hash),
    KEY idx_storage_file_storage_key (storage_key),
    KEY idx_storage_file_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='正式文件表';

CREATE TABLE IF NOT EXISTS storage_content (
    storage_key VARCHAR(500) NOT NULL COMMENT '存储Key',
    content LONGBLOB NOT NULL COMMENT '文件内容',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (storage_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库文件内容表';

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

SET FOREIGN_KEY_CHECKS = 1;
