# 异常处理规范

## 一、异常类定义

### 1.1 BusinessException

项目使用 `BusinessException` 作为统一业务异常类，位于 `nebula-base-common` 模块。

**核心字段**:
| 字段 | 类型 | 说明 |
|---|---|---|
| `errorCode` | `String` | 错误码（如 `10001`） |
| `messageKey` | `String` | 国际化消息Key（如 `auth.10001`） |
| `messageArgs` | `Object[]` | 消息参数（支持占位符） |
| `defaultMessage` | `String` | 默认消息（兜底） |

**构造方法**:
```java
// 1. 简单字符串（不推荐，仅用于临时场景）
new BusinessException("用户名已存在")

// 2. 标准错误码（推荐）
new BusinessException(AuthErrorInfo.USER_NOT_FOUND)

// 3. 标准错误码 + 原因链（保留原始异常堆栈）
new BusinessException(AuthErrorInfo.USER_NOT_FOUND, cause)

// 4. 标准错误码 + 动态参数
new BusinessException(AuthErrorInfo.USER_NOT_FOUND, userId)

// 5. 标准错误码 + 原因链 + 动态参数
new BusinessException(AuthErrorInfo.USER_NOT_FOUND, cause, userId)

// 6. 自定义错误码 + 消息（特殊场景）
new BusinessException("99999", "系统内部错误")
```

**BusinessException(String) 弱构造器约束**：

构造器 1 `new BusinessException(String message)` 仅接受字符串消息，缺少错误码和国际化支持，存在以下问题：

| 问题 | 影响 |
|------|------|
| 无错误码 | 无法追踪、无法在文档中明确定义 |
| 无国际化 | 无法根据用户语言返回对应消息 |
| 无 messageKey | 无法在 properties 文件中定义可维护的消息 |

**使用约束**：

- **仅限临时场景**：快速开发验证、临时异常处理
- **禁止在生产代码使用**：所有生产环境异常必须使用标准错误码构造器
- **禁止跨模块传播**：弱构造器异常仅限当前方法内处理，不应抛出给上层

**推荐做法**：

```java
// ❌ 错误 - 生产代码使用弱构造器
throw new BusinessException("用户不存在");

// ✅ 正确 - 使用标准错误码
throw new BusinessException(AuthErrorInfo.USER_NOT_FOUND);

// ✅ 正确 - 使用标准错误码 + 动态参数
throw new BusinessException(AuthErrorInfo.USER_NOT_FOUND, userId);

// ⚠️ 可接受 - 仅用于快速验证（临时）
if (debugMode) {
    throw new BusinessException("调试信息：" + detail);
}
```

**迁移建议**：

如发现代码中使用弱构造器，应按以下步骤迁移：

1. 在对应模块的 `*ErrorInfo` 枚举中定义错误码
2. 在 `messages_*.properties` 中添加国际化消息
3. 将 `throw new BusinessException("消息")` 替换为 `throw new BusinessException(ErrorInfo.XXX)`

### 1.2 IErrorInfo 错误码契约

所有错误码必须实现 `IErrorInfo` 接口：

```java
public interface IErrorInfo {
    String getModule();    // 模块标识（国际化key前缀）
    String getCode();      // 错误码
    String getMessage();   // 默认消息
    
    default String getMessageKey() {
        return getModule() + "." + getCode();  // 如 auth.10001
    }
}
```

---

## 二、错误码定义规范

### 2.1 编码规则

**格式**: 8位数字，前4位为模块标识，后4位为具体错误序号。

| 模块 | 编码区间 | 示例 |
|---|---|---|
| `common/json` | `010100xx` | `01010001` Json反序列化失败 |
| `mybatis` | `010200xx` | `01020001` workerId超范围 |
| `auth` | `10000-19999` | `10001` 用户名已存在（含子模块：按钮`16000-16999`、菜单`17000-17999`等） |
| `dict` | `20000-20199` | `20001` 字典编码已存在 |
| `param` | `21000-21999` | `21001` 参数键已存在 |
| `notify` | `22000-22999` | `22001` 模板编码已存在 |
| `storage` | `24000-24999` | `24001` 上传任务不存在 |
| `audit` | `26000-26999` | `26001` 审计记录不存在 |
| `scheduler` | `27000-27999` | `27001` 任务编码不能为空 |
| `frontend` | `41000-41999` | `41001` 主题不存在 |

**子模块细分**（auth 示例）:
| 子模块 | 编码区间 | 示例 |
|---|---|---|
| 用户 | `10000-10999` | `10001`, `10002`, `10004` |
| 角色 | `11000-11999` | `11001`, `11002` |
| 组织 | `12000-12999` | `12001`, `12002` |
| 菜单 | `13000-13999` | `13001` |
| OAuth2 | `17000-17999` | `17001` |

### 2.2 错误码枚举定义

每个模块在 `*-api` 模块中定义错误码枚举，位于 `constant` 包下。

```java
// ✅ 正确 - nebula-auth-api/constant/AuthErrorInfo.java
public enum AuthErrorInfo implements IErrorInfo {
    
    // 用户模块 (10000-10999)
    USERNAME_ALREADY_EXISTS("10001", "用户名已存在"),
    USER_NOT_FOUND("10002", "用户不存在"),
    INVALID_CREDENTIALS("10004", "用户名或密码错误"),
    ACCOUNT_DISABLED("10005", "账号已被禁用"),
    ACCOUNT_LOCKED("10011", "账号已被锁定，请稍后再试"),
    
    // 角色模块 (11000-11999)
    ROLE_CODE_EXISTS("11001", "角色编码已存在"),
    ROLE_NOT_FOUND("11002", "角色不存在"),
    ROLE_IN_USE("11003", "角色正在使用，无法删除"),
    
    // 组织模块 (12000-11999)
    ORG_CODE_EXISTS("12001", "组织编码已存在"),
    ORG_NOT_FOUND("12002", "组织不存在"),
    
    private final String code;
    private final String message;
    
    AuthErrorInfo(String code, String message) {
        this.code = code;
        this.message = message;
    }
    
    @Override
    public String getModule() {
        return "auth";
    }
    
    @Override
    public String getCode() {
        return code;
    }
    
    @Override
    public String getMessage() {
        return message;
    }
}
```

### 2.3 错误消息命名规范

- 使用**陈述句**描述错误原因，如 `用户名已存在`、`用户不存在`
- 避免使用**疑问句**或**感叹句**，如 `用户名已存在？`、`用户不存在！`
- 避免使用**技术术语**暴露实现细节，如 `SQLException occurred`
- 消息应**面向用户**，而非面向开发者

```
// ✅ 正确
USERNAME_ALREADY_EXISTS("10001", "用户名已存在")
FILE_NOT_FOUND("24004", "文件不存在")

// ❌ 错误
USERNAME_ALREADY_EXISTS("10001", "Duplicate key exception")
FILE_NOT_FOUND("24004", "File not found in database table storage_file")
```

---

## 三、异常抛出规范

### 3.1 抛出时机

**必须抛出 BusinessException 的场景**:
- 业务规则校验失败（如用户名已存在、密码错误）
- 数据不存在（如用户不存在、文件不存在）
- 权限校验失败（如无权下载、无权操作）
- 业务状态不满足前置条件（如账号已禁用、任务未完成）

**不抛出 BusinessException 的场景**:
- 技术异常（如 SQLException、IOException）→ 由全局处理器兜底
- 参数校验失败 → 使用 `@Valid` 注解，由全局处理器处理

### 3.2 抛出方式

```java
// ✅ 正确 - 标准错误码抛出
public void createUser(CreateUserCommand command) {
    if (userDAO.existsByUsername(command.getUsername())) {
        throw new BusinessException(AuthErrorInfo.USERNAME_ALREADY_EXISTS);
    }
    // ...
}

// ✅ 正确 - 带动态参数抛出
public UserEntity getUserById(Long userId) {
    UserEntity user = userDAO.getById(userId);
    if (user == null) {
        throw new BusinessException(AuthErrorInfo.USER_NOT_FOUND, userId);
    }
    return user;
}

// ✅ 正确 - 保留原始异常堆栈
public void processFile(String filePath) {
    try {
        // 处理文件
    } catch (IOException e) {
        throw new BusinessException(StorageErrorInfo.FILE_PROCESS_FAILED, e);
    }
}

// ❌ 错误 - 直接抛出字符串消息
throw new BusinessException("用户不存在");  // 缺少错误码，无法追踪

// ❌ 错误 - 抛出技术异常给上层
throw new SQLException("...");  // 应转换为 BusinessException

// ❌ 错误 - 吞掉异常
catch (Exception e) {
    // 无日志、无抛出，异常被吞掉
}
```

---

## 四、异常捕获规范

### 4.1 catch 块处理原则

**原则一：必须记录日志**

catch 块中必须使用 `log.error` 或 `log.warn` 记录异常信息，包含堆栈。

**执行判定表**：

| catch 后动作 | 是否必须打印日志 | 是否必须保留 cause | 推荐写法 |
|---|---:|---:|---|
| 继续抛出原 `BusinessException` | 否（交由全局异常处理统一打印） | 已保留 | `throw e;` |
| 继续抛出非业务异常 | 是 | 已保留 | `log.error("...", e); throw e;` |
| 转换为 `BusinessException` | 否（交由全局异常处理统一打印） | 是 | `throw new BusinessException(ErrorInfo.XXX, e, args...)` |
| 捕获 `BusinessException` 后改错误码/补上下文 | 否（交由全局异常处理统一打印） | 是 | `throw new BusinessException(ErrorInfo.XXX, e, args...)` |
| 幂等返回/兜底返回/继续执行 | 是 | 不适用 | `log.warn("...", bizKey, e); return fallback;` |
| 完全忽略异常 | 禁止 | 不适用 | 不允许 |

> 业务相关 catch 如果不继续向上抛出业务异常，必须在当前 catch 块打印日志；如果继续抛出业务异常，必须把捕获到的异常作为 `cause` 传入 `BusinessException`，由全局异常处理统一打印业务原因和原始异常堆栈。

```java
// ✅ 正确 - 记录日志后处理
try {
    riskyOperation();
} catch (Exception e) {
    log.error("执行风险操作失败: {}", e.getMessage(), e);  // 包含堆栈
    // 处理逻辑
}

// ❌ 错误 - 无日志记录
try {
    riskyOperation();
} catch (Exception e) {
    // 未记录日志，问题难以追踪
}
```

**原则二：合理处理异常**

catch 块处理后，应根据业务场景选择合适的处理方式：

| 处理方式 | 适用场景 | 日志级别 | 说明 |
|---|---|---|---|
| **重新抛出** | 异常需要上层处理 | `error` | 保持异常链继续传播 |
| **转换为 BusinessException** | 技术异常需转换为业务异常 | `error` | 保留原始堆栈 |
| **幂等返回** | 重复操作场景（如 DuplicateKeyException） | `warn` | 返回已存在记录 |
| **兜底处理** | 尝试性操作失败，不影响主流程 | `warn` | 返回默认值或继续执行 |

```java
// ✅ 正确 - 重新抛出（异常需要上层处理）
try {
    doSomething();
} catch (RuntimeException e) {
    log.error("操作失败: {}", e.getMessage(), e);
    throw e;  // 继续传播
}

// ✅ 正确 - 转换为 BusinessException（技术异常转业务异常）
try {
    parseJson(json);
} catch (JsonProcessingException e) {
    log.error("JSON解析失败: {}", e.getMessage(), e);
    throw new BusinessException(JsonErrorInfo.DESERIALIZATION_FAILED, e);  // 保留堆栈
}

// ✅ 正确 - 幂等处理（有明确业务含义）
try {
    recordDao.save(record);
} catch (DuplicateKeyException e) {
    log.warn("事件记录已存在，幂等返回: eventId={}", eventId, e);
    return recordDao.getByEventId(eventId);  // 明确的幂等逻辑
}

// ✅ 正确 - 兜底处理（尝试性操作失败，不影响主流程）
public ConfigDto parseConfig(String json) {
    try {
        return objectMapper.readValue(json, ConfigDto.class);
    } catch (JsonProcessingException e) {
        log.warn("配置解析失败，返回默认配置: json={}", json, e);
        return getDefaultConfig();  // 兜底返回默认值
    }
}

// ✅ 正确 - 尝试性类型转换（不影响主流程）
public Integer parseInteger(String value) {
    try {
        return Integer.parseInt(value);
    } catch (NumberFormatException e) {
        log.warn("数值解析失败，返回null: value={}", value, e);
        return null;  // 解析失败返回null，让调用方处理
    }
}

// ❌ 错误 - 隐式吞掉异常（无日志、无明确处理）
try {
    doSomething();
} catch (Exception e) {
    // 无日志、无抛出、无返回，异常被隐式吞掉
}
```

**兜底处理场景说明**：

兜底处理适用于**尝试性操作**，即操作失败不影响主业务流程，可以返回默认值或继续执行的场景：

```java
// ✅ 兜底处理示例 - 配置解析
public class ConfigService {
    
    /**
     * 解析JSON配置，失败时返回默认配置
     */
    public FeatureConfig parseFeatureConfig(String json) {
        if (json == null || json.isEmpty()) {
            return FeatureConfig.defaultConfig();
        }
        try {
            return objectMapper.readValue(json, FeatureConfig.class);
        } catch (JsonProcessingException e) {
            // 尝试性解析失败，返回默认配置，不影响主流程
            log.warn("特性配置解析失败，使用默认配置: json={}", json, e);
            return FeatureConfig.defaultConfig();
        }
    }
    
    /**
     * 解析数值，失败时返回默认值
     */
    public Integer parseTimeout(String timeoutStr, Integer defaultTimeout) {
        try {
            return Integer.parseInt(timeoutStr);
        } catch (NumberFormatException e) {
            // 尝试性解析失败，返回传入的默认值
            log.warn("超时时间解析失败，使用默认值: input={}, default={}",
                     timeoutStr, defaultTimeout, e);
            return defaultTimeout;
        }
    }
}

// ✅ 兜底处理示例 - 可选字段解析
public class MessageService {
    
    public void processMessage(String message) {
        MessageDto dto;
        try {
            dto = objectMapper.readValue(message, MessageDto.class);
        } catch (JsonProcessingException e) {
            log.warn("消息解析失败，使用空消息对象: message={}", message, e);
            dto = new MessageDto();  // 返回空对象，后续流程可继续
        }
        // 继续处理 dto...
        handle(dto);
    }
}
```

**兜底处理 vs 吞掉异常的区别**：

| 场景 | 兜底处理（正确） | 吞掉异常（错误） |
|---|---|---|
| 日志记录 | `log.warn` 记录失败原因 | 无日志 |
| 返回值 | 返回明确的默认值或null | 无返回或隐式返回 |
| 业务影响 | 不影响主流程，有明确的兜底逻辑 | 可能导致数据不一致或隐藏问题 |

```java
// ✅ 正确 - 兜底处理：有日志、有明确返回值
public String extractField(String json, String field) {
    try {
        JsonNode node = objectMapper.readTree(json);
        return node.get(field).asText();
    } catch (Exception e) {
        log.warn("字段提取失败，返回空字符串: field={}, json={}", field, json, e);
        return "";  // 明确的兜底返回
    }
}

// ❌ 错误 - 吞掉异常：无日志、无返回值处理
public String extractField(String json, String field) {
    try {
        JsonNode node = objectMapper.readTree(json);
        return node.get(field).asText();
    } catch (Exception e) {
        // 无日志、无返回值处理，可能导致调用方收到 null
    }
    return null;  // 隐式返回 null
}
```

### 4.2 BusinessException 包装规范

**场景**：捕获到 BusinessException 后，需要添加更多上下文信息，或转换为其他错误码时，**必须包装一层**，防止堆栈丢失。

**强制要求**：只要是在 `catch (XxxException e)` 内新建并抛出 `BusinessException`，就必须优先选择带 `Throwable cause` 的构造器：

```java
// ✅ 正确 - 技术异常转换为业务异常，保留原始异常
catch (IOException e) {
    throw new BusinessException(StorageErrorInfo.FILE_PROCESS_FAILED, e, fileId);
}

// ✅ 正确 - 业务异常转换为更明确的业务原因，保留原始异常
catch (BusinessException e) {
    throw new BusinessException(AuthErrorInfo.LOGIN_FAILED, e, username);
}

// ❌ 错误 - 捕获异常后丢失 cause
catch (IOException e) {
    throw new BusinessException(StorageErrorInfo.FILE_PROCESS_FAILED, fileId);
}
```

在上述场景中，当前 catch 块不需要重复打印日志；全局异常处理器会打印新的业务异常原因，并通过 cause 打印原始异常信息。只有当前 catch 块选择幂等返回、兜底返回或继续执行时，才必须在当前块内打印日志。

```java
// ✅ 正确 - 包装 BusinessException，保留原始堆栈
try {
    authService.login(username, password);
} catch (BusinessException e) {
    log.error("登录失败，用户名: {}, 错误码: {}", username, e.getErrorCode(), e);
    // 包装一层，保留 cause
    throw new BusinessException(AuthErrorInfo.LOGIN_FAILED, e);
}

// ✅ 正确 - 添加上下文参数后包装
try {
    storageService.downloadFile(fileId);
} catch (BusinessException e) {
    log.error("文件下载失败，fileId: {}, 错误码: {}", fileId, e.getErrorCode(), e);
    // 包装时添加上下文
    throw new BusinessException(StorageErrorInfo.DOWNLOAD_FAILED, e, fileId, userId);
}

// ❌ 错误 - 直接抛出新异常，丢失原始堆栈
try {
    authService.login(username, password);
} catch (BusinessException e) {
    log.error("登录失败", e);
    throw new BusinessException(AuthErrorInfo.LOGIN_FAILED);  // 未传入 cause，堆栈丢失
}

// ❌ 错误 - 仅记录日志后忽略
try {
    authService.login(username, password);
} catch (BusinessException e) {
    log.error("登录失败: {}", e.getMessage());  // 未包含堆栈
    // 未抛出，业务流程继续，可能导致数据不一致
}
```

### 4.3 日志记录规范

| 异常类型 | 日志级别 | 日志内容 | 适用场景 |
|---|---|---|---|
| `BusinessException` | `error` | `错误码: {}, 消息: {}, 堆栈` | 业务异常需传播 |
| 技术异常（SQLException 等） | `error` | `技术异常类型: {}, 消息: {}, 堆栈` | 技术异常需转换或传播 |
| 幂等处理（DuplicateKeyException） | `warn` | `幂等返回: 关键参数, 堆栈` | 重复操作场景 |
| 兜底处理（尝试性操作失败） | `warn` | `操作失败，使用默认值/继续执行: 关键参数, 堆栈` | 不影响主流程的尝试性操作 |

```java
// ✅ 正确 - BusinessException 日志格式（需传播）
log.error("业务异常: code={}, message={}", e.getErrorCode(), e.getMessage(), e);

// ✅ 正确 - 技术异常日志格式（需转换或传播）
log.error("数据库异常: {}", e.getMessage(), e);

// ✅ 正确 - 幂等处理日志格式
log.warn("记录已存在，幂等返回: eventId={}", eventId, e);

// ✅ 正确 - 兜底处理日志格式
log.warn("配置解析失败，使用默认配置: json={}", json, e);
log.warn("数值解析失败，返回默认值: input={}, default={}", input, defaultValue, e);
```

---

## 五、全局异常处理器

### 5.1 ExceptionHandlerAdvice

全局异常处理器位于 `nebula-base-web` 模块，自动处理以下异常：

| 异常类型 | 处理逻辑 | 返回格式 |
|---|---|---|
| `BusinessException` | 解析国际化消息 | `ApiResult.fail(code, message)` |
| `SQLException` | 隐藏细节，返回统一消息 | `ApiResult.fail(FAIL_CODE, "数据库异常,请联系管理员")` |
| `HttpMediaTypeNotSupportedException` | 返回 415 状态码 | `ApiResult.fail(FAIL_CODE, "Content-Type不合法")` |
| `Exception` (兜底) | 隐藏细节，返回统一消息 | `ApiResult.fail(FAIL_CODE, "系统异常,请联系管理员")` |

**关键代码**:
```java
@RestControllerAdvice(basePackages = "cn.cloudomni")
public class ExceptionHandlerAdvice {
    
    private final ErrorMessageResolver errorMessageResolver;

    @ExceptionHandler(BusinessException.class)
    public ApiResult<?> handleBusinessException(BusinessException e) {
        log.error("BusinessException: code={}, message={}", e.getErrorCode(), e.getMessage(), e);
        return ApiResult.fail(e.getErrorCode(), errorMessageResolver.resolve(e));
    }

    @ExceptionHandler(Exception.class)
    public ApiResult<?> handleException(Exception e) {
        log.error("系统异常: {}", e.getMessage(), e);
        return ApiResult.fail(FAIL_CODE, "系统异常,请联系管理员");
    }
}
```

### 5.2 国际化消息解析

**ErrorMessageResolver** 根据当前 Locale 解析国际化消息：

```
工作流程:
1. 异常携带 messageKey = "auth.10001"
2. 查找 messages_zh_CN.properties 中的 auth.10001=用户名{0}已存在
3. 使用 messageArgs 替换占位符
4. 返回组装后的消息
```

**配置文件位置**:
```
nebula-app-starter/src/main/resources/
├── messages.properties          # 默认消息（兜底）
├── messages_zh_CN.properties    # 中文消息
└── messages_en_US.properties    # 英文消息
```

**配置示例**:
```properties
# messages_zh_CN.properties
auth.10001=用户名已存在
auth.10002=用户{0}不存在
auth.10004=用户名或密码错误
storage.24001=上传任务不存在
storage.24014=签名下载签名已过期
```

---

## 六、完整示例

### 6.1 定义错误码

```java
// nebula-auth-api/constant/AuthErrorInfo.java
public enum AuthErrorInfo implements IErrorInfo {
    USER_NOT_FOUND("10002", "用户不存在"),
    LOGIN_FAILED("10010", "登录失败"),
    
    private final String code;
    private final String message;
    
    @Override public String getModule() { return "auth"; }
}
```

### 6.2 抛出异常

```java
// UserServiceImpl.java
public UserDetailDto getUserDetail(Long userId) {
    UserEntity user = userDAO.getById(userId);
    if (user == null) {
        throw new BusinessException(AuthErrorInfo.USER_NOT_FOUND, userId);
    }
    return converter.toDetailDto(user);
}
```

### 6.3 捕获并包装异常

```java
// LoginServiceImpl.java
public LoginResultDto login(LoginCommand command) {
    try {
        UserEntity user = authService.authenticate(command.getUsername(), command.getPassword());
        return buildLoginResult(user);
    } catch (BusinessException e) {
        log.error("用户登录失败: username={}, errorCode={}", 
                  command.getUsername(), e.getErrorCode(), e);
        // 包装一层，保留堆栈
        throw new BusinessException(AuthErrorInfo.LOGIN_FAILED, e, command.getUsername());
    } catch (Exception e) {
        log.error("登录过程发生系统异常: username={}", command.getUsername(), e);
        throw new BusinessException(AuthErrorInfo.LOGIN_FAILED, e);
    }
}
```

### 6.4 配置国际化消息

```properties
# messages_zh_CN.properties
auth.10002=用户{0}不存在
auth.10010=用户{0}登录失败
```

---

## 七、禁止行为

### 7.1 错误码定义禁止

- ❌ 使用字符串作为错误码（应使用数字编码）
- ❌ 消息包含技术实现细节
- ❌ 多模块共用同一错误码区间
- ❌ 消息使用疑问句或感叹句

### 7.2 异常抛出禁止

- ❌ 抛出 `new BusinessException("字符串消息")`（缺少错误码）
- ❌ 抛出技术异常给上层（如 `throw new SQLException()`）
- ❌ 异常中包含敏感信息（如密码、密钥）

### 7.3 异常捕获禁止

- ❌ catch 块中无日志记录
- ❌ catch 块隐式吞掉异常（无日志、无抛出、无明确的兜底返回）
- ❌ 捕获 BusinessException 后未包装 cause（堆栈丢失）
- ❌ 仅记录 `e.getMessage()` 而忽略堆栈 `e`（需传播的异常）
- ❌ 兜底处理使用 `log.error`（应使用 `log.warn`，表明不影响主流程）
- ❌ 需传播的异常使用 `log.warn` 后不抛出（应使用 `log.error` 并抛出）

**注意**：兜底处理（尝试性操作失败返回默认值）**不是**吞掉异常，前提是：
1. 有 `log.warn` 日志记录
2. 有明确的兜底返回值（默认值、null 等）
3. 不影响主业务流程

### 7.4 日志记录禁止

- ❌ 使用 `log.info` 或 `log.debug` 记录异常（应使用 `log.error`）
- ❌ 日志消息仅包含 `e.getMessage()`（缺少堆栈）
- ❌ 日志中暴露敏感信息（如密码、身份证号）

---

## 八、速查表

### 8.1 异常处理决策表

| 场景 | 处理方式 | 日志级别 | 示例 |
|---|---|---|---|
| 业务规则校验失败 | 抛出 `BusinessException` | `error` | `throw new BusinessException(AuthErrorInfo.USER_NOT_FOUND)` |
| 数据不存在 | 抛出 `BusinessException` + 参数 | `error` | `throw new BusinessException(AuthErrorInfo.USER_NOT_FOUND, userId)` |
| 技术异常（IO/SQL）需传播 | 转换为 `BusinessException` + cause | `error` | `throw new BusinessException(JsonErrorInfo.DESERIALIZATION_FAILED, e)` |
| 幂等处理 | 记录日志 + 返回已存在记录 | `warn` | `log.warn(...); return existingRecord;` |
| 兜底处理（尝试性操作失败） | 记录日志 + 返回默认值 | `warn` | `log.warn(...); return defaultValue;` |
| 捕获 BusinessException 后需转换 | 包装一层 + cause | `error` | `throw new BusinessException(AuthErrorInfo.LOGIN_FAILED, e)` |

### 8.2 日志级别对照

| 场景 | 级别 | 格式 |
|---|---|---|
| BusinessException（需传播） | `error` | `log.error("业务异常: code={}, message={}", code, msg, e)` |
| 技术异常（需转换或传播） | `error` | `log.error("技术异常: {}", e.getMessage(), e)` |
| 幂等处理 | `warn` | `log.warn("幂等返回: key={}", key)` |
| 兜底处理（尝试性操作失败） | `warn` | `log.warn("操作失败，使用默认值: 原因={}", reason)` |

### 8.3 模块错误码区间

| 模块 | 区间 | 前缀 |
|---|---|---|
| `common/json` | `010100xx` | `common` |
| `mybatis` | `010200xx` | `mybatis` |
| `auth` | `10000-19999` | `auth`（含按钮`16000-16999`、菜单`17000-17999`等子模块） |
| `dict` | `20000-20199` | `dict` |
| `param` | `21000-21999` | `param` |
| `notify` | `22000-22999` | `notify` |
| `storage` | `24000-24999` | `storage` |
| `audit` | `26000-26999` | `audit` |
| `scheduler` | `27000-27999` | `scheduler` |
| `frontend` | `41000-41999` | `frontend` |
