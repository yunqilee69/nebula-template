# Nebula 规范查询

查询和检查项目代码是否符合 AGENTS 规范。提供规范查询、代码检查、修复建议。所有规范内容已内嵌，无需读取外部文件。

## 触发词

- "规范"
- "检查规范"
- "AGENTS"
- "代码审查"
- "符合规范"

---

## 一、架构设计规范

### 1.1 双模式架构

项目支持 **单体模式（local）** 和 **微服务模式（remote）** 两种部署方式：

| 模式 | 语义 | 适用场景 |
|---|---|---|
| `local` | 本地直接实现，Controller + Service 同进程 | 单体应用、开发调试 |
| `remote` | Feign 远程调用，通过网关访问独立服务 | 微服务消费者、跨服务调用 |

**切换机制**：通过 `@ConditionalOnNebulaModuleMode` 条件装配

```java
// local 模块
@ConditionalOnNebulaModuleMode(module = "auth", value = "local", matchIfMissing = true)
public class AuthLocalAutoConfiguration { ... }

// remote 模块
@ConditionalOnNebulaModuleMode(module = "auth", value = "remote")
public class AuthRemoteAutoConfiguration { ... }
```

**配置优先级**：`nebula.{module}.mode` > `nebula.architecture.mode` > `matchIfMissing`

### 1.2 业务模块五层结构

```
nebula-{module}/
├── nebula-{module}-api      # 契约层：DTO、Command、Query、Service接口
├── nebula-{module}-core     # 核心层：Entity、DAO、ServiceImpl
├── nebula-{module}-local    # 本地层：Controller、Req/Resp
├── nebula-{module}-remote   # 远程层：FeignClient
└── nebula-{module}-service  # 启动层：Application
```

### 1.3 依赖规则（禁止违反）

| 层级 | 允许依赖 | 禁止依赖 |
|---|---|---|
| `*-api` | `base-common` | `core`、`local`、`remote` |
| `*-core` | `*-api`、`base-*`、其他 `*-api` | `local`、`remote`、其他 `*-core` |
| `*-local` | `*-api`、`*-core`、`base-web` | `remote`、其他 `*-local` |
| `*-remote` | `*-api`、`base-cloud` | `core`、`local` |
| `*-service` | `*-local`、其他 `*-remote` | 其他 `*-local`、其他 `*-core` |

---

## 二、分层规范

### 2.1 各层内容速查

| 内容类型 | 所属层 | 包路径 |
|---|---|---|
| Service 接口 | `*-api` | `service/` |
| DTO/Command/Query | `*-api` | `model/dto`, `model/command`, `model/query` |
| 错误码枚举 | `*-api` | `constant/` |
| Entity | `*-core` | `model/entity/` |
| DAO/Mapper | `*-core` | `dao/`, `dao/mapper/` |
| Service 实现 | `*-core` | `service/impl/` |
| CoreConverter | `*-core` | `convert/` 或 `model/convert/` |
| Controller | `*-local` | `controller/` |
| Request/Response | `*-local` | `model/req/`, `model/resp/` |
| LocalConverter | `*-local` | `model/convert/` |
| FeignClient | `*-remote` | `remote/` |

### 2.2 数据流转

```
HTTP Request
    ↓
CreateUserReq (local/model/req)
    ↓ LocalConverter.toCommand()
CreateUserCommand (api/model/command)
    ↓ Service.createUser()
UserEntity (core/model/entity)
    ↓ CoreConverter.toDto()
UserDetailDto (api/model/dto)
    ↓ LocalConverter.toResp()
UserDetailResp (local/model/resp)
    ↓
HTTP Response
```

### 2.3 Converter 职责

| Converter | 所在层 | 转换方向 |
|---|---|---|
| `{Module}Converter` | `*-core` | Entity ↔ DTO |
| `{Module}LocalConverter` | `*-local` | Req ↔ Command/Query, DTO ↔ Resp |

---

## 三、命名规范

### 3.1 类命名速查

| 类型 | 后缀 | 示例 |
|---|---|---|
| Entity | `Entity` | `UserEntity` |
| DTO | `Dto` | `UserDto`, `UserDetailDto` |
| Command | `Command` | `CreateUserCommand`, `UpdateUserCommand` |
| Query | `Query` | `PageUserQuery`, `GetUserByIdQuery` |
| Request | `Req` | `CreateUserReq`, `UserPageReq` |
| Response | `Resp` | `UserDetailResp` |
| Controller | `Controller` | `UserController` |
| Service接口 | `I{Module}Service` | `IUserService` |
| Service实现 | `ServiceImpl` | `UserServiceImpl` |
| DAO | `Dao` | `UserDao` |
| Mapper | `Mapper` | `UserMapper` |

### 3.2 方法命名规范

| 操作 | 前缀 | Controller | Service |
|---|---|---|---|
| 创建 | `create` | `createUser` | `createUser` |
| 更新 | `update` | `updateUser` | `updateUser` |
| 删除 | `remove` | `removeUser` | `removeUser` |
| 详情 | `get` | `getUser` | `getUserDetail` |
| 分页 | `page` | `pageUsers` | `pageUsers` |
| 列表 | `list` | `listAllRoles` | `listAllRoles` |

---

## 四、数据库规范

### 4.1 布尔类型规范

| 层级 | 命名规则 | 示例 |
|---|---|---|
| Java 字段 | 语义名词（禁止 `is` 前缀） | `enabled`, `deleted` |
| 数据库列 | `is_xxx` 形式 | `is_enabled`, `is_deleted` |

**判断方式**：
```java
// ✅ 正确
if (Boolean.TRUE.equals(entity.getEnabled())) { ... }

// ❌ 错误 - 可能 NPE
if (entity.getIsEnabled() == true) { ... }
```

### 4.2 表命名规范

- **模块前缀**：`auth_`、`sys_`、`storage_`、`msg_`
- **单数形式**：`auth_user`（不是 `auth_users`）
- **小写蛇形**：`sys_dict_type`（不是 `SysDictType`）

### 4.3 字段命名规范

| 字段类型 | 命名 | 数据类型 |
|---|---|---|
| 主键 | `id` | `CHAR(32)` UUID v7 |
| 创建时间 | `create_time` | `DATETIME` |
| 更新时间 | `update_time` | `DATETIME` |
| 外键 | `{entity}_id` | `user_id`, `role_id` |

### 4.4 索引命名规范

| 索引类型 | 前缀 | 命名公式 | 示例 |
|---|---|---|---|
| 唯一索引 | `uk_` | `uk_{table}_{field}` | `uk_user_username` |
| 普通索引 | `idx_` | `idx_{table}_{field}` | `idx_user_status` |

---

## 五、接口设计规范

### 5.1 分页接口约定

- 分页接口统一使用 **POST**
- 分页参数在请求体中传递
- 参数：`pageNum`、`pageSize`

### 5.2 OpenAPI 注解规范

```java
// ✅ Controller 注解
@Tag(name = "用户管理", description = "用户的增删改查接口")
@RestController
public class UserController { ... }

// ✅ 方法注解
@Operation(summary = "创建用户", description = "根据请求参数创建新用户")
@PostMapping
public ApiResult<UserDetailResp> createUser(@Valid @RequestBody CreateUserReq req) { ... }

// ✅ Req 字段注解
@Schema(description = "用户名", requiredMode = Schema.RequiredMode.REQUIRED, example = "admin")
@NotBlank(message = "用户名不能为空")
private String username;
```

### 5.3 RESTful 约定

| 操作 | HTTP 方法 | 示例路径 |
|---|---|---|
| 创建 | `POST` | `POST /api/auth/users` |
| 更新 | `PUT` | `PUT /api/auth/users/{id}` |
| 删除 | `DELETE` | `DELETE /api/auth/users/{id}` |
| 详情 | `GET` | `GET /api/auth/users/{id}` |
| 分页 | `POST` | `POST /api/auth/users/page` |

---

## 六、异常处理规范

### 6.1 错误码定义

**格式**：8位数字，前4位模块标识，后4位错误序号

| 模块 | 区间 | 示例 |
|---|---|---|
| auth | `10000-19999` | `10001` 用户名已存在 |
| dict | `20000-20199` | `20001` 字典编码已存在 |
| storage | `24000-24999` | `24001` 上传任务不存在 |

### 6.2 异常抛出规范

```java
// ✅ 正确 - 标准错误码抛出
throw new BusinessException(AuthErrorInfo.USER_NOT_FOUND);

// ✅ 正确 - 带动态参数
throw new BusinessException(AuthErrorInfo.USER_NOT_FOUND, userId);

// ✅ 正确 - 保留原始堆栈
throw new BusinessException(StorageErrorInfo.FILE_PROCESS_FAILED, e);

// ❌ 错误 - 直接字符串消息
throw new BusinessException("用户不存在");  // 缺少错误码
```

### 6.3 异常捕获规范

```java
// ✅ 正确 - 记录日志后抛出
try {
    authService.login(username, password);
} catch (BusinessException e) {
    log.error("登录失败: code={}, message={}", e.getErrorCode(), e.getMessage(), e);
    throw new BusinessException(AuthErrorInfo.LOGIN_FAILED, e);
}

// ❌ 错误 - 隐式吞掉异常
try {
    doSomething();
} catch (Exception e) {
    // 无日志、无抛出
}
```

---

## 七、日志规范

### 7.1 日志级别选择

| 级别 | 场景 | 示例 |
|---|---|---|
| DEBUG | 读操作入参（get/page/list/tree）、方法入参追踪、循环细节 | `log.debug("分页查询: pageNum={}, pageSize={}", pageNum, pageSize)` |
| INFO | 写操作（create/update/remove）开始和完成、关键业务节点 | `log.info("用户创建成功: userId={}", userId)` |
| WARN | 幂等处理、兜底处理、业务校验失败 | `log.warn("记录已存在，幂等返回: eventId={}", eventId)` |
| ERROR | 业务异常、技术异常 | `log.error("业务异常: code={}", code, e)` |

### 7.2 Service 层日志规则

| 操作类型 | 级别 | 说明 |
|---|---|---|
| 写操作（create/update/remove） | `INFO` | 关键业务节点，记录入参和结果 |
| 读操作（get/page/list/tree） | `DEBUG` | 高频查询避免 INFO，仅调试时需要 |

```java
// ✅ 正确 - 写操作使用 INFO
log.info("创建用户: username={}", username);
log.info("用户创建成功: userId={}", userId);

// ✅ 正确 - 读操作使用 DEBUG（高频查询）
log.debug("分页查询用户: pageNum={}, pageSize={}", pageNum, pageSize);
log.debug("查询用户详情: userId={}", userId);
log.debug("查询组织树");

// ❌ 错误 - 高频查询使用 INFO 导致日志爆炸
log.info("分页查询用户: pageNum={}, pageSize={}", pageNum, pageSize);  // 应使用 DEBUG
log.info("查询菜单树");  // 应使用 DEBUG
```

### 7.3 日志格式

```
操作描述: 关键参数1={值1}, 关键参数2={值2}

// ✅ 正确
log.info("用户登录请求: username={}", username);
log.error("业务异常: code={}, message={}", code, msg, e);

// ❌ 错误 - 无描述
log.info(userId);
```

### 7.4 敏感信息脱敏

| 数据类型 | 脱敏方式 | 示例 |
|---|---|---|
| 密码 | 完全隐藏 | 不记录 |
| Token | 截断（前8位） | `abc12345...` |
| 手机号 | 前3后4 | `138****5678` |
| 身份证号 | 前3后4 | `320***********1234` |

---

## 八、安全规范

### 8.1 密码存储

- 使用 **BCrypt** 加密
- 禁止明文、MD5、SHA1

```java
// ✅ 正确
user.setPassword(passwordEncoder.encode(command.getPassword()));

// ❌ 错误
user.setPassword(command.getPassword());
user.setPassword(DigestUtils.md5Hex(command.getPassword()));
```

### 8.2 Token 管理

- 使用 **UUID 不透明令牌**（非 JWT）
- Access Token 有效期：默认 7200 秒
- Refresh Token 有效期：默认 604800 秒

### 8.3 登录安全

- 密码错误统一返回"用户名或密码错误"（防止账号枚举）
- 登录失败次数限制，超过阈值锁定账号

---

## 九、配置规范

### 9.1 配置前缀

| 类型 | 前缀格式 | 示例 |
|---|---|---|
| 业务模块 | `nebula.{模块名}` | `nebula.auth`, `nebula.storage` |
| Remote配置 | `nebula.{模块名}.remote` | `nebula.auth.remote` |
| 基础设施 | `nebula.{能力名}` | `nebula.web`, `nebula.cache` |

### 9.2 配置类规范

```java
@Data
@ConfigurationProperties(prefix = "nebula.auth")
public class AuthProperties {
    // 字段直接赋默认值
    private String mode = "local";
    
    // 嵌套对象 new 初始化
    private Token token = new Token();
    
    @Data
    public static class Token {
        private Long accessTokenExpire = 7200L;
    }
}
```

---

## 十、开发规范

### 10.1 代码风格

| 规则 | 值 |
|---|---|
| 缩进 | 4 空格（禁止 Tab） |
| 行最大长度 | 120 字符 |
| 方法间空行 | 1 行 |
| 左大括号 | 不换行 |

### 10.2 注释规范

- 所有 public 类必须有 Javadoc 注释
- 所有 public 方法必须有 `@param`、`@return`
- Entity/DTO 字段必须有 `@Schema` 注解

### 10.3 Git 提交规范

```
<type>(<scope>): <subject>

// 示例
feat(auth): 新增 Opaque Token 认证组件
fix(dict): 完善字典类型不存在异常提示
refactor(storage): 删除废弃的 default_flag 字段
```

---

## 十一、检查清单

### 架构检查

- [ ] api 层是否依赖 core 层 ❌
- [ ] core 层是否依赖 local 层 ❌
- [ ] local/remote 是否同时引入 ❌

### 分层检查

- [ ] Entity 是否在 core 层 ✓
- [ ] DTO/Command/Query 是否在 api 层 ✓
- [ ] Controller 是否在 local 层 ✓
- [ ] Req/Resp 是否在 local 层 ✓

### 命名检查

- [ ] Entity 命名：`{Module}Entity` ✓
- [ ] DTO 命名：`{Module}Dto` ✓
- [ ] Controller 命名：`{Module}Controller` ✓
- [ ] Service 命名：`I{Module}Service` / `{Module}ServiceImpl` ✓

### 数据库检查

- [ ] 表名：`{module}_{entity}` ✓
- [ ] 布尔字段：Java 语义名词，DB `is_xxx` ✓
- [ ] 时间字段：`create_time`, `update_time` ✓

### 异常检查

- [ ] 使用 `BusinessException` ✓
- [ ] 错误码定义在 `{Module}ErrorInfo` ✓
- [ ] 异常堆栈包含在日志中 ✓

---

## 禁止行为汇总

- ❌ 规范内容重复编写
- ❌ 检查结果无具体违规项
- ❌ 修复建议模糊不具体
- ❌ 跳过规范直接开发
- ❌ 同一模块同时引入 local 和 remote
- ❌ api 层依赖 core 层
- ❌ core 层依赖 local 层
- ❌ DTO 使用全大写后缀 `DTO`
- ❌ Service 接口缺少 `I` 前缀
- ❌ 布尔字段使用 `is` 前缀（Java 侧）
- ❌ 日志记录密码明文
- ❌ 使用明文存储密码
- ❌ 高频查询（get/page/list/tree）使用 INFO 级别（应使用 DEBUG）
- ❌ 写操作（create/update/remove）使用 DEBUG 级别（应使用 INFO）