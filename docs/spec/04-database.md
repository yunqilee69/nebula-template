# 数据库规范

## 布尔类型字段规范

### Java 侧规范

- 字段类型使用 `Boolean`（包装类型），允许 `null` 表示"未设置"或"未知"状态。
- 判断 `true` 或 `false` 时，**必须使用** `Boolean.TRUE.equals(xxx)` 或 `Boolean.FALSE.equals(xxx)`，禁止直接使用 `xxx == true` 或 `xxx.equals(true)`，防止 NPE。
- 字段命名直接使用业务语义名词或形容词，例如 `vip`、`deleted`、`published`、`enabled`，**禁止**使用 `isXxx` 形式。
- 原因：Lombok `@Data` 对 `Boolean isXxx` 字段会生成 `isXxx()` / `setXxx()` 方法，与 `Boolean xxx` 字段生成的 `getXxx()` / `setXxx()` 冲突，导致序列化框架（Jackson、MyBatis 等）属性推导混乱。

```java
// ✅ 正确
Boolean enabled;
if (Boolean.TRUE.equals(entity.getEnabled())) { ... }

// ❌ 错误 - 可能 NPE
Boolean isEnabled;
if (entity.getIsEnabled() == true) { ... }
if (entity.getIsEnabled().equals(true)) { ... }
```

### 数据库侧规范

- MySQL 使用 `TINYINT`，PostgreSQL 使用 `SMALLINT`，存储值为 `1`（true）或 `0`（false）。
- 列命名使用 `is_xxx` 形式，例如 `is_vip`、`is_deleted`、`is_published`、`is_enabled`。
- 原因：数据库列名与 Java 字段名采用不同命名风格，避免生成代码时产生 getter/setter 冲突；`is_` 前缀在 SQL 语义上更直观表达布尔判断。

```sql
-- ✅ 正确
is_vip      TINYINT      -- MySQL
is_deleted  SMALLINT     -- PostgreSQL

-- ❌ 错误 - 列名与 Java 字段名同风格易混淆
vip         TINYINT
deleted     SMALLINT
```

### MyBatis XML 判断规范

- 项目全局配置了 `BooleanTypeHandler`，自动处理 `Boolean`（Java）与 `0/1`（DB）的双向转换。
- 在 MyBatis XML 的 `<if>` 条件判断中，**使用整数形式**判断，例如 `xx != 1`（非 true）、`xx = 0`（false），而非布尔形式。

```xml
<!-- ✅ 正确 - 使用整数判断 -->
<if test="is_vip != 1">
    AND is_vip = #{vip}
</if>
<if test="is_deleted = 0">
    AND is_deleted = 0
</if>

<!-- ❌ 错误 - 布尔形式判断不可靠 -->
<if test="vip == true">
    AND is_vip = #{vip}
</if>
```

### 命名对照示例

| Java 字段名 | 数据库列名 | MySQL 类型 | PostgreSQL 类型 |
|---|---|---|---|
| `vip` | `is_vip` | `TINYINT` | `SMALLINT` |
| `deleted` | `is_deleted` | `TINYINT` | `SMALLINT` |
| `published` | `is_published` | `TINYINT` | `SMALLINT` |
| `enabled` | `is_enabled` | `TINYINT` | `SMALLINT` |

---

## 表命名规范

### 基本规则

- **模块前缀**：所有表名必须以模块缩写前缀开头，便于识别归属和避免跨模块命名冲突。
- **单数形式**：表名使用单数名词，不使用复数。例如 `auth_user` 而非 `auth_users`。
- **小写蛇形**：表名全部小写，多单词用下划线连接，禁止驼峰或大写。
- **业务语义**：表名应清晰表达业务实体，避免缩写过度导致语义模糊。

### 模块前缀对照

| 模块 | 前缀 | 示例表 | 说明 |
|---|---|---|---|
| `nebula-auth` | `auth_` | `auth_user`, `auth_role`, `auth_menu` | 认证与权限相关 |
| `nebula-dict` | `sys_` | `sys_dict_type`, `sys_dict_item` | 系统级基础数据 |
| `nebula-param` | `sys_` | `sys_param` | 系统级配置参数 |
| `nebula-notify` | `sys_` | `sys_notify_template`, `sys_announcement` | 系统级通知公告 |
| `nebula-storage` | `storage_` | `storage_file`, `storage_upload_task` | 文件存储 |
| `nebula-frontend` | `frontend_` | `frontend_user_preference` | 前端配置 |
| `nebula-event` | `evt_` | `evt_outbox`, `evt_relay_log` | 事件总线（规划） |

### 表类型命名规则

| 表类型 | 命名模式 | 示例 | 说明 |
|---|---|---|---|
| 主业务表 | `{prefix}_{entity}` | `auth_user`, `auth_role`, `sys_param` | 核心业务实体 |
| 关联表 | `{prefix}_{entity1}_{entity2}` | `auth_user_org`, `auth_user_role` | 两实体多对多关联 |
| 从属表 | `{prefix}_{parent}_{child}` | `sys_dict_item`, `sys_announcement_target` | 属于父表的子表 |
| 记录表 | `{prefix}_{entity}_record` | `sys_announcement_read_record`, `sys_notify_record` | 操作记录或日志 |
| 配置表 | `{prefix}_{entity}_config` | `evt_relay_config`（规划） | 配置类数据 |

### 命名示例对照

```sql
-- ✅ 正确 - 符合模块前缀 + 单数 + 蛇形规则
CREATE TABLE auth_user (...);            -- auth 模块，用户表
CREATE TABLE auth_role (...);            -- auth 模块，角色表
CREATE TABLE auth_user_org (...);        -- auth 模块，用户-组织关联表
CREATE TABLE sys_dict_type (...);        -- dict 模块，字典类型表
CREATE TABLE sys_dict_item (...);        -- dict 模块，字典项从属表
CREATE TABLE sys_notify_template (...);  -- notify 模块，通知模板表
CREATE TABLE storage_file (...);         -- storage 模块，文件表
CREATE TABLE frontend_user_preference (...); -- frontend 模块，用户偏好表

-- ❌ 错误 - 无模块前缀
CREATE TABLE user (...);                 -- 缺少 auth_ 前缀
CREATE TABLE dict_type (...);            -- 缺少 sys_ 前缀

-- ❌ 错误 - 使用复数
CREATE TABLE auth_users (...);           -- 应为 auth_user
CREATE TABLE sys_dict_items (...);       -- 应为 sys_dict_item

-- ❌ 错误 - 使用驼峰
CREATE TABLE AuthUser (...);             -- 应为 auth_user
CREATE TABLE sysDictType (...);          -- 应为 sys_dict_type

-- ❌ 错误 - 缩写过度语义不清
CREATE TABLE auth_ur (...);              -- ur 缩写不明确，应为 auth_user_role
CREATE TABLE sys_nt (...);               -- nt 缩写不明确，应为 sys_notify_template
```

---

## 字段命名规范

### 基本规则

- **小写蛇形**：所有字段名使用小写，多单词用下划线连接。
- **语义完整**：字段名应完整表达业务含义，避免无意义缩写。
- **类型一致**：同类型字段在不同表中应保持命名一致（如所有主键都用 `id`）。

### 标准字段命名

| 字段类型 | 命名 | 数据类型 | 说明 |
|---|---|---|---|
| 主键 | `id` | `CHAR(32)` | UUID v7，所有表统一 |
| 创建时间 | `create_time` | `DATETIME` / `TIMESTAMP` | 自动填充，所有表统一 |
| 更新时间 | `update_time` | `DATETIME` / `TIMESTAMP` | 自动更新，所有表统一 |
| 排序号 | `sort` | `INT` | 排序字段，默认 0 |
| 状态 | `status` | `SMALLINT` | 启用/禁用等状态 |
| 备注 | `remark` | `VARCHAR(255)` | 备注说明 |
| 名称 | `name` | `VARCHAR(50~100)` | 名称类字段 |
| 编码 | `code` | `VARCHAR(50~100)` | 唯一编码 |
| 描述 | `description` | `VARCHAR(200)` | 描述信息 |

### 外键字段命名

- **单表引用**：`{referenced_entity}_id`，例如 `user_id`、`role_id`、`org_id`。
- **多表引用歧义**：添加限定词，例如 `receiver_user_id`、`parent_id`、`menu_id`。
- **编码引用**：`{referenced_entity}_code`，例如 `dict_code`、`template_code`、`module_code`。

| 外键场景 | 命名模式 | 示例 | 说明 |
|---|---|---|---|
| 引用用户表 | `user_id` | `auth_user_org.user_id` | 标准外键命名 |
| 引用角色表 | `role_id` | `auth_user_role.role_id` | 标准外键命名 |
| 引用组织表 | `org_id` | `auth_user_org.org_id` | 标准外键命名 |
| 引用菜单表 | `menu_id` | `auth_button.menu_id` | 标准外键命名 |
| 引用父级 | `parent_id` | `auth_org.parent_id`, `auth_menu.parent_id` | 层级结构父节点 |
| 引用特定用户 | `{qualifier}_user_id` | `sys_site_message.receiver_user_id` | 区分多用户引用 |
| 引用字典编码 | `dict_code` | `sys_dict_item.dict_code` | 编码型外键 |
| 引用模板编码 | `template_code` | `sys_notify_record.template_code` | 编码型外键 |

### 时间字段命名

| 时间类型 | 命名模式 | 示例 | 说明 |
|---|---|---|---|
| 创建时间 | `create_time` | 所有表统一 | 记录创建时间 |
| 更新时间 | `update_time` | 所有表统一 | 记录更新时间 |
| 发布时间 | `publish_time` | `sys_announcement.publish_time` | 内容发布时间 |
| 过期时间 | `expire_time` | `sys_announcement.expire_time` | 过期失效时间 |
| 发送时间 | `send_time` | `sys_notify_record.send_time` | 实际发送时间 |
| 已读时间 | `read_time` | `sys_site_message.read_time` | 用户阅读时间 |
| 绑定时间 | `linked_at` | `auth_oauth2_account.linked_at` | OAuth 账号绑定 |
| 读取时间 | `read_time` | `sys_announcement_read_record.read_time` | 公告已读时间 |

**命名规则**：
- 事件发生时间：`{action}_time`，例如 `publish_time`、`send_time`。
- 状态达成时间：`{state}_time`，例如 `expire_time`、`read_time`。
- 特殊事件时间：`{event}_at`，例如 `linked_at`。

### 标识字段命名

标识字段用于标记记录是否具备某种属性或处于某种状态。遵循布尔类型规范：
- Java 字段名使用纯语义名词或形容词（如 `mainOrg`、`enabled`、`builtin`）
- 数据库列名使用 `is_xxx` 形式（如 `is_main_org`、`is_enabled`、`is_builtin`）

| 标识类型 | Java 字段名 | 数据库列名 | 示例 | 说明 |
|---|---|---|---|---|
| 是否主组织 | `mainOrg` | `is_main_org` | `auth_user_org.is_main_org` | 标记主归属 |
| 是否启用 | `enabled` | `is_enabled` | `sys_dict_item.is_enabled` | 启用状态 |
| 是否内建 | `builtin` | `is_builtin` | `sys_param.is_builtin` | 系统内建标记 |
| 是否置顶 | `pinned` | `is_pinned` | `sys_announcement.is_pinned` | 置顶标记 |
| 是否弹窗 | `popup` | `is_popup` | `sys_announcement.is_popup` | 弹窗显示 |
| 是否敏感 | `sensitive` | `is_sensitive` | `sys_param.is_sensitive` | 敏感数据标记 |
| 是否可编辑 | `editable` | `is_editable` | `sys_param.is_editable` | 编辑权限标记 |
| 是否可见 | `visible` | `is_visible` | `sys_param.is_visible` | 显示控制 |
| 是否已删除 | `deleted` | `is_deleted` | `sys_param.is_deleted` | 软删除标记 |
| 是否隐藏 | `hidden` | `is_hidden` | `auth_menu.is_hidden` | 隐藏标记 |
| 是否自动批准 | `autoApprove` | `is_auto_approve` | `auth_oauth2_client.is_auto_approve` | OAuth 自动批准 |

**命名规则**：
- Java 字段名：直接使用业务语义名词或形容词，例如 `enabled`、`builtin`、`editable`，禁止使用 `xxxFlag` 形式。
- 数据库列名：使用 `is_xxx` 形式，例如 `is_enabled`、`is_builtin`、`is_editable`。
- 原因：数据库列名与 Java 字段名采用不同命名风格，避免生成代码时产生 getter/setter 冲突；`is_` 前缀在 SQL 语义上更直观表达布尔判断。

### 命名示例对照

```sql
-- ✅ 正确 - 符合标准字段命名
CREATE TABLE auth_user (
    id              CHAR(32) NOT NULL,          -- 主键
    username        VARCHAR(50) NOT NULL,       -- 用户名
    nickname        VARCHAR(50),                -- 昵称
    status          SMALLINT NOT NULL DEFAULT 1,-- 状态
    create_time     DATETIME NOT NULL,          -- 创建时间
    update_time     DATETIME NOT NULL           -- 更新时间
);

-- ✅ 正确 - 外键命名
CREATE TABLE auth_user_role (
    id          CHAR(32) NOT NULL,
    user_id     CHAR(32) NOT NULL,    -- 引用 auth_user
    role_id     CHAR(32) NOT NULL,    -- 引用 auth_role
    create_time DATETIME NOT NULL
);

-- ✅ 正确 - 标识字段命名（遵循布尔类型规范）
CREATE TABLE sys_param (
    id              CHAR(32) NOT NULL,
    param_key       VARCHAR(150) NOT NULL,
    is_builtin      TINYINT NOT NULL DEFAULT 0, -- 是否内建
    is_editable     TINYINT NOT NULL DEFAULT 1, -- 是否可编辑
    is_deleted      TINYINT NOT NULL DEFAULT 0, -- 软删除标记
    create_time     DATETIME NOT NULL
);

-- ❌ 错误 - 无语义缩写
CREATE TABLE auth_user (
    uid CHAR(32) NOT NULL,    -- 应为 id 或 user_id
    nm  VARCHAR(50),          -- 应为 name 或 nickname
    crt DATETIME NOT NULL     -- 应为 create_time
);

-- ❌ 错误 - 驼峰命名
CREATE TABLE auth_role (
    Id          CHAR(32) NOT NULL,     -- 应为 id
    createTime  DATETIME NOT NULL,    -- 应为 create_time
    updateTime  DATETIME NOT NULL     -- 应为 update_time
);

-- ❌ 错误 - 外键命名不规范
CREATE TABLE auth_button (
    id              CHAR(32) NOT NULL,
    menu            CHAR(32) NOT NULL, -- 应为 menu_id
    create_time     DATETIME NOT NULL
);

-- ❌ 错误 - 标识字段命名不一致（使用 xxx_flag 形式）
CREATE TABLE sys_announcement (
    id          CHAR(32) NOT NULL,
    pinned_flag TINYINT NOT NULL,  -- 应为 is_pinned
    popup_flag  TINYINT NOT NULL,  -- 应为 is_popup
    create_time DATETIME NOT NULL
);

-- ❌ 错误 - Java 字段名使用 xxxFlag 形式
-- Java 代码中：
Boolean sensitiveFlag;  -- 应为 sensitive
Boolean builtinFlag;    -- 应为 builtin
```

---

## 索引命名规范

### 基本规则

- **主键**：使用数据库默认 `PRIMARY KEY`，不单独命名。
- **唯一索引**：使用 `uk_` 前缀，后接索引字段名或组合语义。
- **普通索引**：使用 `idx_` 前缀，后接索引字段名或组合语义。
- **小写蛇形**：索引名称全部小写，用下划线连接。

### 索引类型命名规则

| 索引类型 | 前缀 | 命名模式 | 示例 | 说明 |
|---|---|---|---|---|
| 主键 | 默认 | `PRIMARY KEY` | `PRIMARY KEY (id)` | 无需命名 |
| 唯一索引 | `uk_` | `uk_{table}_{field}` | `uk_user_username`, `uk_role_code` | 单字段唯一约束 |
| 唯一索引（组合） | `uk_` | `uk_{table}_{fields}` | `uk_user_org`, `uk_user_role` | 多字段组合唯一 |
| 普通索引 | `idx_` | `idx_{table}_{field}` | `idx_user_status`, `idx_org_parent_id` | 单字段查询优化 |
| 普通索引（组合） | `idx_` | `idx_{table}_{fields}` | `idx_dict_item_sort` | 多字段组合查询 |
| 外键索引 | `idx_` | `idx_{table}_{fk_field}` | `idx_user_org_user_id` | 外键关联查询 |

### 项目实际索引示例

```sql
-- ✅ 主键 - 使用默认 PRIMARY KEY
PRIMARY KEY (id)

-- ✅ 唯一索引 - uk_{语义描述}
CREATE UNIQUE INDEX uk_user_username ON auth_user (username);
CREATE UNIQUE INDEX uk_role_code ON auth_role (code);
CREATE UNIQUE INDEX uk_org_code ON auth_org (code);
CREATE UNIQUE INDEX uk_menu_code ON auth_menu (code);
CREATE UNIQUE INDEX uk_dict_type_code ON sys_dict_type (code);
CREATE UNIQUE INDEX uk_sys_param_key ON sys_param (param_key);
CREATE UNIQUE INDEX uk_notify_template_code ON sys_notify_template (template_code);

-- ✅ 唯一索引（组合） - uk_{关联语义}
CREATE UNIQUE INDEX uk_user_org ON auth_user_org (user_id, org_id);
CREATE UNIQUE INDEX uk_user_role ON auth_user_role (user_id, role_id);
CREATE UNIQUE INDEX uk_announcement_read_user ON sys_announcement_read_record (announcement_id, user_id);

-- ✅ 普通索引 - idx_{表}_{字段}
CREATE INDEX idx_user_status ON auth_user (status);
CREATE INDEX idx_role_status ON auth_role (status);
CREATE INDEX idx_org_status ON auth_org (status);
CREATE INDEX idx_menu_status ON auth_menu (status);
CREATE INDEX idx_dict_item_enabled ON sys_dict_item (is_enabled);

-- ✅ 普通索引（外键） - idx_{表}_{外键字段}
CREATE INDEX idx_org_parent_id ON auth_org (parent_id);
CREATE INDEX idx_menu_parent_id ON auth_menu (parent_id);
CREATE INDEX idx_button_menu_id ON auth_button (menu_id);
CREATE INDEX idx_user_org_user_id ON auth_user_org (user_id);
CREATE INDEX idx_user_org_org_id ON auth_user_org (org_id);
CREATE INDEX idx_user_role_user_id ON auth_user_role (user_id);
CREATE INDEX idx_user_role_role_id ON auth_user_role (role_id);
CREATE INDEX idx_oauth2_account_user_id ON auth_oauth2_account (user_id);

-- ✅ 普通索引（组合） - idx_{表}_{字段组合}
CREATE INDEX idx_dict_item_sort ON sys_dict_item (dict_code, sort);
CREATE INDEX idx_sys_param_module_order ON sys_param (module_code, display_order);
CREATE INDEX idx_announcement_target_lookup ON sys_announcement_target (target_type, target_value);

-- ❌ 错误 - 索引命名无前缀
CREATE UNIQUE INDEX user_username_unique ON auth_user (username); -- 应为 uk_user_username
CREATE INDEX status_idx ON auth_user (status);                     -- 应为 idx_user_status

-- ❌ 错误 - 索引命名不一致
CREATE INDEX idx_auth_user_status ON auth_user (status);  -- 冗余 auth_，应为 idx_user_status
CREATE INDEX idx_status ON auth_user (status);            -- 缺少表名，应为 idx_user_status

-- ❌ 错误 - 使用驼峰
CREATE UNIQUE INDEX ukUserUsername ON auth_user (username); -- 应为 uk_user_username
CREATE INDEX idxUserStatus ON auth_user (status);           -- 应为 idx_user_status
```

### 索引命名速查

| 场景 | 命名公式 | 示例 |
|---|---|---|
| 单字段唯一约束 | `uk_{table}_{field}` | `uk_user_username` |
| 两字段组合唯一 | `uk_{table}_{field1}_{field2}` 或 `uk_{table}_{relation}` | `uk_user_role` |
| 单字段查询优化 | `idx_{table}_{field}` | `idx_user_status` |
| 外键查询优化 | `idx_{table}_{fk_field}` | `idx_button_menu_id` |
| 组合字段查询 | `idx_{table}_{field1}_{field2}` | `idx_dict_item_sort` |

---

## SQL 编写规范

### 基本原则

- **项目使用 MyBatis Plus**：大部分查询通过 MyBatis Plus 的 LambdaQueryWrapper 或 QueryWrapper 完成，避免手写 SQL。
- **复杂查询用 XML**：复杂的多表关联、分页查询等场景使用 MyBatis XML Mapper。
- **禁止拼接 SQL**：严禁在代码中拼接 SQL 字符串，防止 SQL 注入和可维护性问题。

### JOIN 使用规范

- **优先 LEFT JOIN**：业务查询通常需要保留主表记录，使用 `LEFT JOIN` 确保主表数据完整。
- **明确关联条件**：JOIN 条件必须明确写出，禁止隐式关联（WHERE 中写关联条件）。
- **关联表数量限制**：单次 JOIN 表数量不超过 5 个，超过需拆分查询或考虑数据模型优化。
- **使用表别名**：多表 JOIN 必须使用简短有意义的别名，提高可读性。

```sql
-- ✅ 正确 - LEFT JOIN 明确关联条件
SELECT 
    u.id, u.username, u.nickname,
    r.id as role_id, r.name as role_name
FROM auth_user u
LEFT JOIN auth_user_role ur ON u.id = ur.user_id
LEFT JOIN auth_role r ON ur.role_id = r.id
WHERE u.status = 1;

-- ✅ 正确 - 使用表别名
SELECT 
    a.id, a.title, a.content,
    t.target_type, t.target_value
FROM sys_announcement a
LEFT JOIN sys_announcement_target t ON a.id = t.announcement_id
WHERE a.status = 1 AND a.publish_time <= NOW();

-- ❌ 错误 - 隐式关联
SELECT u.id, r.name
FROM auth_user u, auth_user_role ur, auth_role r
WHERE u.id = ur.user_id AND ur.role_id = r.id; -- 应使用 LEFT JOIN

-- ❌ 错误 - JOIN 表过多
SELECT ...
FROM auth_user u
LEFT JOIN auth_user_role ur ON ...
LEFT JOIN auth_role r ON ...
LEFT JOIN auth_role_permission rp ON ...
LEFT JOIN auth_permission p ON ...
LEFT JOIN auth_menu m ON ...
LEFT JOIN auth_button b ON ...; -- 超过 5 表，需拆分

-- ❌ 错误 - 无表别名
SELECT auth_user.id, auth_role.name
FROM auth_user
LEFT JOIN auth_user_role ON auth_user.id = auth_user_role.user_id
LEFT JOIN auth_role ON auth_user_role.role_id = auth_role.id; -- 应使用别名
```

### 子查询使用规范

- **优先 JOIN**：能用 JOIN 解决的查询不使用子查询，JOIN 性能通常更优。
- **子查询场景**：聚合统计、EXISTS 判断、IN 列表查询等场景可使用子查询。
- **避免嵌套子查询**：禁止三层以上嵌套子查询，影响可读性和性能。

```sql
-- ✅ 正确 - EXISTS 判断
SELECT a.id, a.title
FROM sys_announcement a
WHERE EXISTS (
    SELECT 1 FROM sys_announcement_read_record r
    WHERE r.announcement_id = a.id AND r.user_id = #{userId}
);

-- ✅ 正确 - IN 子查询（小结果集）
SELECT u.id, u.username
FROM auth_user u
WHERE u.id IN (
    SELECT ur.user_id FROM auth_user_role ur
    WHERE ur.role_id = #{roleId}
);

-- ✅ 正确 - 聚合子查询
SELECT u.id, u.username,
    (SELECT COUNT(*) FROM auth_user_role ur WHERE ur.user_id = u.id) as role_count
FROM auth_user u;

-- ❌ 错误 - 可用 JOIN 替代的子查询
SELECT u.id, u.username
FROM auth_user u
WHERE u.id IN (SELECT user_id FROM auth_user_role WHERE role_id = #{roleId});
-- 应改为 JOIN：
SELECT u.id, u.username
FROM auth_user u
INNER JOIN auth_user_role ur ON u.id = ur.user_id
WHERE ur.role_id = #{roleId};

-- ❌ 错误 - 嵌套子查询过多
SELECT ...
FROM auth_user u
WHERE u.id IN (
    SELECT user_id FROM auth_user_role WHERE role_id IN (
        SELECT role_id FROM auth_role WHERE org_id IN (
            SELECT org_id FROM auth_org WHERE ...
        )
    )
); -- 嵌套过多，应拆分或用 JOIN
```

### 分页查询规范

- **使用 MyBatis Plus 分页**：项目集成 MyBatis Plus 分页插件，使用 `Page<T>` 对象进行分页。
- **Java 侧分页对象**：Controller 接收 `PageReq`，返回 `PageResp<T>`，由 MyBatis Plus 自动处理。
- **禁止手写 LIMIT**：除特殊场景外，禁止在 SQL 中手写 `LIMIT` 和 `OFFSET`，由分页插件自动注入。
- **排序字段校验**：动态排序字段必须校验合法性，防止 SQL 注入。

```java
// ✅ 正确 - 使用 MyBatis Plus 分页
public PageResp<UserVO> pageUser(PageReq<UserQuery> req) {
    Page<UserEntity> page = new Page<>(req.getPageNum(), req.getPageSize());
    LambdaQueryWrapper<UserEntity> wrapper = Wrappers.lambdaQuery();
    // ... 构建查询条件
    Page<UserEntity> result = userMapper.selectPage(page, wrapper);
    return PageResp.of(result, UserVO.class);
}

// ✅ 正确 - 排序字段校验
public PageResp<UserVO> pageUser(PageReq<UserQuery> req) {
    // 校验排序字段是否合法
    Set<String> allowedSortFields = Set.of("create_time", "update_time", "status");
    if (!allowedSortFields.contains(req.getSortField())) {
        req.setSortField("create_time"); // 默认排序
    }
    // ...
}
```

```sql
-- ✅ 正确 - MyBatis Plus 自动生成分页 SQL
SELECT id, username, nickname, status, create_time, update_time
FROM auth_user
WHERE status = #{status}
-- 分页插件自动注入：ORDER BY create_time DESC LIMIT 10 OFFSET 0

-- ❌ 错误 - 手写 LIMIT（应由分页插件处理）
SELECT id, username, nickname
FROM auth_user
WHERE status = #{status}
LIMIT #{pageSize} OFFSET #{offset}; -- 禁止手写，使用分页插件

-- ❌ 错误 - 动态排序未校验
ORDER BY ${sortField} ${sortOrder}; -- SQL 注入风险，应校验或使用 MyBatis Plus 排序
```

### 禁止的 SQL 做法

| 禁止做法 | 原因 | 正确做法 |
|---|---|---|
| 代码拼接 SQL | SQL 注入风险 | 使用 MyBatis 参数绑定 |
| `SELECT *` | 查询效率低，字段变更影响代码 | 明确列出需要的字段 |
| 无索引的 LIKE `%xxx%` | 全表扫描，性能极差 | 使用全文索引或前缀匹配 `xxx%` |
| 大表全量 COUNT | 性能影响大 | 使用近似统计或缓存计数 |
| WHERE 中隐式 JOIN | 可读性差，执行计划不稳定 | 使用 LEFT JOIN |
| 嵌套子查询过深 | 性能差，难以优化 | 拆分查询或用 JOIN |
| 未校验的动态排序 | SQL 注入风险 | 校验排序字段白名单 |
| 无分页的大结果集 | 内存溢出风险 | 强制分页查询 |

```sql
-- ❌ 禁止 - 代码拼接 SQL（Java 侧）
String sql = "SELECT * FROM auth_user WHERE username = '" + username + "'";
jdbcTemplate.query(sql, ...); -- SQL 注入风险

-- ✅ 正确 - 参数绑定
jdbcTemplate.query(
    "SELECT id, username FROM auth_user WHERE username = ?",
    username
);

-- ❌ 禁止 - SELECT *
SELECT * FROM auth_user; -- 应明确字段

-- ✅ 正确 - 明确字段
SELECT id, username, nickname, status, create_time FROM auth_user;

-- ❌ 禁止 - 无索引 LIKE 全匹配
SELECT id, username FROM auth_user WHERE username LIKE '%admin%'; -- 全表扫描

-- ✅ 正确 - 前缀匹配
SELECT id, username FROM auth_user WHERE username LIKE 'admin%'; -- 可用索引

-- ❌ 禁止 - 大表全量 COUNT
SELECT COUNT(*) FROM sys_notify_record; -- 数据量大时性能差

-- ✅ 正确 - 条件 COUNT 或缓存计数
SELECT COUNT(*) FROM sys_notify_record WHERE create_time >= #{startTime};
```

### COUNT 查询规范

- **使用 COUNT(1)**：性能略优于 `COUNT(*)`，语义明确表示"计数行"。
- **避免 COUNT(*) + JOIN**：复杂 JOIN 的 COUNT 性能差，可考虑子查询或拆分。

```sql
-- ✅ 正确 - COUNT(1)
SELECT COUNT(1) FROM auth_user WHERE status = 1;

-- ✅ 正确 - 条件 COUNT
SELECT COUNT(1) FROM sys_notify_record 
WHERE send_status = #{status} AND create_time >= #{startTime};

-- ❌ 错误 - COUNT(*)（习惯上可用，但建议用 COUNT(1))
SELECT COUNT(*) FROM auth_user WHERE status = 1;

-- ❌ 错误 - 复杂 JOIN COUNT
SELECT COUNT(*) FROM auth_user u
LEFT JOIN auth_user_role ur ON u.id = ur.user_id
LEFT JOIN auth_role r ON ur.role_id = r.id
LEFT JOIN auth_permission p ON ...
-- 复杂 JOIN 的 COUNT 性能差，应简化或拆分
```

---

## 速查表

### 表命名决策

| 决策点 | 规则 | 示例 |
|---|---|---|
| 模块归属 | 使用模块前缀 | `auth_user`, `sys_param`, `storage_file` |
| 单数/复数 | 使用单数 | `auth_user` ✅，`auth_users` ❌ |
| 格式 | 小写蛇形 | `auth_user` ✅，`AuthUser` ❌ |
| 关联表 | `{entity1}_{entity2}` | `auth_user_role`, `auth_user_org` |
| 从属表 | `{parent}_{child}` | `sys_dict_item`, `sys_announcement_target` |

### 字段命名决策

| 决策点 | 规则 | 示例 |
|---|---|---|
| 主键 | `id` | 所有表统一 |
| 时间字段 | `{action}_time` 或 `{state}_time` | `create_time`, `publish_time`, `expire_time` |
| 外键（ID） | `{entity}_id` | `user_id`, `role_id`, `menu_id` |
| 外键（编码） | `{entity}_code` | `dict_code`, `template_code` |
| 布尔字段 | Java: 语义名词，DB: `is_xxx` | Java `enabled`, DB `is_enabled` |

### 索引命名决策

| 索引类型 | 前缀 | 命名公式 | 示例 |
|---|---|---|---|
| 主键 | 默认 | `PRIMARY KEY (id)` | 无需命名 |
| 唯一（单字段） | `uk_` | `uk_{table}_{field}` | `uk_user_username` |
| 唯一（组合） | `uk_` | `uk_{table}_{fields}` | `uk_user_org` |
| 普通（单字段） | `idx_` | `idx_{table}_{field}` | `idx_user_status` |
| 普通（外键） | `idx_` | `idx_{table}_{fk_field}` | `idx_button_menu_id` |
| 普通（组合） | `idx_` | `idx_{table}_{fields}` | `idx_dict_item_sort` |

### SQL 编写决策

| 决策点 | 规则 | 说明 |
|---|---|---|
| 简单查询 | MyBatis Plus | LambdaQueryWrapper / QueryWrapper |
| 复杂查询 | MyBatis XML | 多表 JOIN、复杂条件 |
| 分页 | MyBatis Plus 分页插件 | 禁止手写 LIMIT |
| JOIN 类型 | LEFT JOIN 优先 | 保留主表数据完整 |
| COUNT | COUNT(1) | 性能略优，语义明确 |
| 动态排序 | 校验白名单 | 防止 SQL 注入 |

---

## 项目表结构速查

### auth 模块表

| 表名 | 说明 | 主要字段 |
|---|---|---|
| `auth_user` | 用户表 | `id`, `username`, `nickname`, `status` |
| `auth_role` | 角色表 | `id`, `code`, `name`, `status` |
| `auth_org` | 组织表 | `id`, `name`, `parent_id`, `code`, `type` |
| `auth_user_org` | 用户-组织关联 | `id`, `user_id`, `org_id`, `is_main_org` |
| `auth_user_role` | 用户-角色关联 | `id`, `user_id`, `role_id` |
| `auth_menu` | 菜单表 | `id`, `name`, `parent_id`, `code`, `path` |
| `auth_button` | 按钮表 | `id`, `menu_id`, `code`, `name`, `type` |
| `auth_permission` | 权限表 | `id`, `subject_type`, `subject_id`, `resource_type`, `resource_id` |
| `auth_oauth2_account` | OAuth2 账号 | `id`, `user_id`, `provider_id`, `provider_user_id` |
| `auth_oauth2_client` | OAuth2 客户端 | `id`, `client_id`, `client_name`, `grant_types` |

### sys 模块表（dict/param/notify）

| 表名 | 说明 | 主要字段 |
|---|---|---|
| `sys_dict_type` | 字典类型 | `id`, `code`, `name` |
| `sys_dict_item` | 字典项 | `id`, `dict_code`, `name`, `item_value`, `is_enabled` |
| `sys_param` | 系统参数 | `id`, `param_key`, `param_value`, `data_type`, `is_builtin` |
| `sys_notify_template` | 通知模板 | `id`, `template_code`, `template_name`, `channel_type` |
| `sys_notify_record` | 通知记录 | `id`, `channel_type`, `receiver`, `send_status` |
| `sys_site_message` | 站内信 | `id`, `receiver_user_id`, `title`, `read_status` |
| `sys_announcement` | 公告 | `id`, `title`, `status`, `publish_time`, `is_pinned` |
| `sys_announcement_target` | 公告定向 | `id`, `announcement_id`, `target_type`, `target_value` |
| `sys_announcement_read_record` | 公告已读 | `id`, `announcement_id`, `user_id`, `read_time` |

### 其他模块表

| 模块 | 表名 | 说明 |
|---|---|---|
| frontend | `frontend_user_preference` | 用户偏好设置 |
| storage | `storage_file`, `storage_upload_task` | 文件存储 |

---

## MySQL 数据库支持

### 概述

Nebula 项目同时支持 PostgreSQL 和 MySQL 两种数据库。默认使用 PostgreSQL，可通过配置切换到 MySQL。

### PostgreSQL 与 MySQL 差异

| 特性 | PostgreSQL | MySQL |
|---|---|---|
| 时间类型 | `TIMESTAMP` | `DATETIME` |
| 布尔类型 | `BOOLEAN` / `SMALLINT` | `TINYINT(1)` |
| UPSERT | `ON CONFLICT DO NOTHING/UPDATE` | `ON DUPLICATE KEY UPDATE` |
| 注释 | `COMMENT ON TABLE/COLUMN` | 内联 `COMMENT '...'` |
| 自动更新时间 | 需要 TRIGGER | `ON UPDATE CURRENT_TIMESTAMP` |
| UUID 生成 | `gen_random_uuid()` | `UUID()` / 应用生成 |

### MySQL Schema 文件

| 模块 | 文件位置 |
|---|---|
| 主数据库 | `docs/sql/init/01-init-structure-mysql.sql` |
| Scheduler | `nebula-scheduler-core/src/main/resources/db/schema/02-scheduler-schema-mysql.sql` |
| Audit | `nebula-audit-core/src/main/resources/db/schema/01-audit-schema-mysql.sql` |
| Auth Login Record | `nebula-auth-core/src/main/resources/db/schema/02-auth-login-record-schema-mysql.sql` |

### MySQL 配置步骤

#### 1. 添加依赖

```xml
<!-- 排除 PostgreSQL 驱动 -->
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-app-starter</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<!-- 添加 MySQL 驱动 -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
</dependency>
```

#### 2. 配置数据源

```yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/nebula?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: your_password

mybatis-plus:
  global-config:
    db-config:
      db-type: mysql

nebula:
  mybatis:
    db-type: mysql
```

#### 3. 执行初始化脚本

```bash
mysql -u root -p nebula < sql/init/01-init-structure-mysql.sql
mysql -u root -p nebula < sql/init/02-init-data-mysql.sql
```

### 详细说明

数据库脚本目录组织（全量初始化与版本升级）见 [docs/sql/README.md](../sql/README.md)。
