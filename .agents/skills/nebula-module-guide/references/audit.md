# Audit 模块使用指南

统一审计日志能力，支持注解式采集、手动记录、本地持久化、事件分发和远程投递。

## 模块结构

```text
nebula-audit/
├── nebula-audit-api      # 注解、Command、Query、DTO、事件和服务契约
├── nebula-audit-core     # 切面、记录器、脱敏、截断、分发、DAO 和查询实现
├── nebula-audit-local    # 本地 Controller 与 MyBatis Mapper 扫描
├── nebula-audit-remote   # Feign 远程投递客户端
└── nebula-audit-service  # 独立审计服务入口，默认端口 9908
```

## 引入方式

单体或本地集成模式引入：

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-audit-local</artifactId>
</dependency>
```

微服务消费者引入远程投递模式：

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-audit-remote</artifactId>
</dependency>
```

独立审计服务启动：

```bash
mvn spring-boot:run -pl nebula-audit/nebula-audit-service
```

`nebula.audit.mode` 是声明式配置，不负责运行时装配切换。实际 local/remote 由 Maven 依赖决定：业务应用引入 `nebula-audit-local` 就注册本地 Controller、DAO 和 Mapper；引入 `nebula-audit-remote` 就注册 Feign 客户端和远程 `IAuditRecorder` 实现。

## 注解式审计

使用 `@NebulaAudit` 标记需要留痕的方法或类：

```java
@NebulaAudit(
    module = "auth",
    action = "CREATE_USER",
    resourceType = "user",
    recordRequestParams = true,
    recordResponseData = true,
    excludeFields = {"password"}
)
public UserDto createUser(CreateUserCommand command) {
    return userService.createUser(command);
}
```

常用参数：

| 参数 | 说明 |
|---|---|
| `module` | 业务模块标识，例如 `auth`、`order` |
| `action` | 操作名称，例如 `CREATE_USER`、`DELETE_ORDER` |
| `resourceType` | 被审计资源类型；未配置时默认取当前请求 URI |
| `resourceId` | 被审计资源 ID |
| `resourceName` | 被审计资源名称 |
| `operatorId` | 操作人 ID；未配置时从 `CurrentUserContext` 获取 |
| `operatorName` | 操作人姓名；未配置时从 `CurrentUserContext` 获取 |
| `recordRequestParams` | 是否记录方法入参快照 |
| `recordResponseData` | 是否记录方法返回值快照 |
| `recordError` | 失败时是否记录异常信息，默认 `true` |
| `condition` | SpEL 条件表达式，按方法参数名访问变量；为空默认记录，返回 `false` 或非布尔值时跳过审计且不阻断业务 |
| `includeFields` | 快照字段白名单；配置后请求/响应快照只保留这些字段，嵌套对象和数组递归处理 |
| `excludeFields` | 追加脱敏字段；和全局 `nebula.audit.mask-fields` 合并后递归替换为 `******` |

`condition` 示例：

```java
@NebulaAudit(
    module = "auth",
    action = "UPDATE_USER",
    condition = "#userId != 'admin'",
    recordRequestParams = true
)
public void updateUser(String userId, UpdateUserCommand command) {
    userService.updateUser(userId, command);
}
```

## 手动记录审计

业务代码可以注入 `IAuditRecorder` 并提交 `RecordAuditCommand`：

```java
RecordAuditCommand command = new RecordAuditCommand();
command.setModule("auth");
command.setAction("RESET_PASSWORD");
command.setResourceType("user");
command.setResourceId(userId);
command.setResultMessage("重置密码成功");
auditRecorder.success(command);
```

可用方法：

| 方法 | 说明 |
|---|---|
| `record(command)` | 记录命令；未指定 `resultStatus` 时默认为 `SUCCESS` |
| `success(command)` | 强制记录为 `SUCCESS` |
| `failure(command, throwable)` | 强制记录为 `FAILURE`，并写入异常信息 |

## 快照处理

`requestParams` 和 `responseData` 写入前会统一处理：

1. JSON 规范化。
2. 按 `includeFields` 做字段白名单过滤。
3. 按全局 `nebula.audit.mask-fields` 和当前命令 `excludeFields` 脱敏。
4. 按系统参数限制长度并保持合法 JSON 标记。

默认脱敏字段：`password`、`pwd`、`token`、`accessToken`、`refreshToken`、`secret`、`secretKey`、`idCard`、`phone`、`mobile`。

快照长度系统参数：

| 参数键 | 默认值 | 说明 |
|---|---:|---|
| `audit.request.max.length` | `4000` | 请求快照最大字符数 |
| `audit.response.max.length` | `4000` | 响应快照最大字符数 |

## 查询和写入接口

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 分页查询 | `POST` | `/api/audit/records/page` | 按模块、操作、操作人、资源、IP、结果状态过滤 |
| 详情查询 | `GET` | `/api/audit/records/{id}` | 查询单条审计记录详情 |
| 内部写入 | `POST` | `/api/audit/internal/records` | 远程模式 Feign 投递入口 |

分页请求继承统一分页参数，并支持：`module`、`action`、`operatorId`、`operatorName`、`resourceType`、`resourceId`、`resourceName`、`requestIp`、`resultStatus`。

## 配置项

```yaml
nebula:
  audit:
    mode: local
    mask-fields:
      - password
      - token
      - phone
    local:
      event-enabled: true
      persist-success-only: false
    remote:
      service-name: nebula-audit-service
      service-url: http://localhost:9908
      fail-open: true
    retention:
      clean-enabled: true
```

配置说明：

| 配置 | 默认值 | 说明 |
|---|---|---|
| `nebula.audit.mode` | `local` | 声明期望模式；实际装配由依赖选择决定 |
| `nebula.audit.mask-fields` | 内置敏感字段列表 | 全局脱敏字段 |
| `nebula.audit.local.event-enabled` | `true` | 存在 `NebulaEventPublisher` 时通过 `audit-recorded` 事件写入 |
| `nebula.audit.local.persist-success-only` | `false` | 是否只持久化成功审计记录 |
| `nebula.audit.remote.service-name` | `nebula-audit-service` | Feign 服务名 |
| `nebula.audit.remote.service-url` | 空 | Feign 直连地址，配置后优先直连 |
| `nebula.audit.remote.fail-open` | `true` | 远程投递失败时是否忽略错误 |
| `nebula.audit.retention.clean-enabled` | `true` | 是否启用过期审计清理任务 |

审计没有 `nebula.audit.enabled` 开关，模块接入后始终开启。

## 数据表和保留期

表名：`audit_record`。

DDL：`nebula-audit/nebula-audit-core/src/main/resources/db/schema/01-audit-schema-mysql.sql`。

索引覆盖：创建时间、操作人+创建时间、模块+操作+创建时间、资源类型+资源 ID+创建时间。

清理任务默认每天 `02:30` 执行。保留天数由系统参数 `audit.retention.days` 控制，默认 `180` 天；参数不存在或不是正整数时使用默认值。
