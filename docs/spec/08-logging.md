# 日志规范

## 一、日志级别约定

### 1.1 级别定义

项目使用 SLF4J + Logback 作为日志框架，通过 `@Slf4j` 注解引入。

| 级别 | 使用场景 | 特点 | 示例 |
|---|---|---|---|
| **DEBUG** | 开发调试、详细流程追踪 | 生产环境默认关闭，仅开发/测试环境启用 | 方法内部变量值、循环迭代过程 |
| **INFO** | 关键业务节点、重要操作记录 | 生产环境默认开启，用于监控和问题定位 | 用户登录成功、订单创建完成、定时任务执行 |
| **WARN** | 潜在问题、可恢复异常、幂等处理 | 不影响主流程，但需要关注 | 缓存失效使用默认值、重复操作幂等返回、配置项缺失 |
| **ERROR** | 系统错误、业务异常、不可恢复问题 | 影响业务流程，需要排查和告警 | 数据库连接失败、业务规则校验失败、外部服务调用超时 |

### 1.2 DEBUG 级别

**适用场景**：

| 场景 | 说明 | 示例 |
|---|---|---|
| 方法入参/出参追踪 | 调试阶段查看数据流转 | `log.debug("查询用户入参: userId={}", userId)` |
| 循环内部细节 | 复杂迭代过程追踪 | `log.debug("处理第 {} 条记录: id={}", i, record.getId())` |
| 条件分支判断 | 多分支逻辑验证 | `log.debug("进入分支A: condition={}", condition)` |
| 缓存命中/未命中 | 缓存策略调试 | `log.debug("缓存命中: key={}, value={}", key, value)` |
| 性能测量点 | 方法耗时分段测量 | `log.debug("步骤1耗时: {}ms", elapsed)` |

```java
// ✅ 正确 - DEBUG 级别示例
@Slf4j
public class UserServiceImpl implements IUserService {

    @Override
    public UserDetailDto getUserDetail(String userId) {
        log.debug("查询用户详情入参: userId={}", userId);
        
        UserEntity user = userDAO.getById(userId);
        log.debug("数据库查询结果: user={}", user != null ? user.getUsername() : "null");
        
        if (user == null) {
            throw new BusinessException(AuthErrorInfo.USER_NOT_FOUND);
        }
        
        UserDetailDto dto = UserConverter.INSTANCE.toDetailDto(user);
        log.debug("转换后DTO: id={}, username={}, roles={}", 
            dto.getId(), dto.getUsername(), dto.getRoles().size());
        
        return dto;
    }
}

// ❌ 错误 - 关键业务使用 DEBUG
log.debug("用户登录成功: userId={}", userId);  // 应使用 INFO

// ❌ 错误 - 异常使用 DEBUG
log.debug("查询失败: {}", e.getMessage());  // 应使用 ERROR/WARN
```

**DEBUG 级别禁止**：

- ❌ 关键业务节点使用 DEBUG（应使用 INFO）
- ❌ 异常/错误使用 DEBUG（应使用 ERROR/WARN）
- ❌ 生产环境开启 DEBUG（性能影响）

### 1.3 INFO 级别

**适用场景**：

| 场景 | 说明 | 示例 |
|---|---|---|
| 服务启动/停止 | 应用生命周期事件 | `log.info("认证服务启动完成")` |
| 关键业务操作开始 | 重要业务入口 | `log.info("用户登录请求: username={}", username)` |
| 关键业务操作完成 | 重要业务结果 | `log.info("用户登录成功: userId={}, accessToken={}", userId, token)` |
| 数据变更记录 | CRUD 操作结果 | `log.info("用户创建成功: userId={}, username={}", userId, username)` |

```java
// ✅ 正确 - INFO 级别示例
@Slf4j
public class LoginServiceImpl implements ILoginService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String register(CreateUserCommand command) {
        log.info("用户注册请求: username={}", command.getUsername());
        
        // 业务逻辑...
        
        userDAO.save(user);
        log.info("用户注册成功: userId={}, username={}", user.getId(), user.getUsername());
        
        return user.getId();
    }

    @Override
    public LoginResultDto login(LoginCommand command) {
        log.info("用户登录请求: username={}", command.getUsername());
        
        // 认证逻辑...
        
        log.info("用户登录成功: userId={}, username={}, accessToken={}",
                user.getId(), user.getUsername(), accessToken);
        
        return dto;
    }
    
    @Override
    public void logout(String cacheKey, String userId) {
        log.info("用户登出请求: userId={}, accessToken={}", userId, cacheKey);
        
        // 清理逻辑...
        
        log.info("用户登出成功: userId={}", userId);
    }
}

// ❌ 错误 - 内部调试信息使用 INFO
log.info("循环处理第 {} 条记录", i);  // 应使用 DEBUG

// ❌ 错误 - 异常使用 INFO
log.info("查询失败: {}", e.getMessage());  // 应使用 ERROR
```

**INFO 级别禁止**：

- ❌ 方法内部每一步都打 INFO（信息冗余）
- ❌ 循环内部使用 INFO（日志爆炸）
- ❌ 异常/错误使用 INFO（应使用 ERROR/WARN）
- ❌ 无业务含义的调试信息使用 INFO

### 1.4 WARN 级别

**适用场景**：

| 场景 | 说明 | 示例 |
|---|---|---|
| 幂等处理 | 重复操作已存在记录 | `log.warn("记录已存在，幂等返回: eventId={}", eventId)` |
| 兜底处理 | 尝试性操作失败使用默认值 | `log.warn("配置解析失败，使用默认值: reason={}", reason)` |
| 业务条件不满足 | 非关键校验失败 | `log.warn("用户不存在: username={}", username)` |
| 缓存失效 | 缓存未命中但不影响流程 | `log.warn("用户缓存未命中: token={}", token)` |
| 配置缺失/异常 | 非关键配置项缺失 | `log.warn("跳过飞书长连接启动，应用缺少 appId/appSecret")` |
| 外部服务降级 | 可降级的外部依赖失败 | `log.warn("短信服务不可用，降级为站内信")` |
| 资源接近阈值 | 资源使用接近上限 | `log.warn("数据库连接池接近上限: active={}", activeCount)` |
| 数据格式异常 | 格式不符预期但可恢复 | `log.warn("飞书消息 content 不是标准 JSON，按原文保存")` |

```java
// ✅ 正确 - WARN 级别示例（幂等处理）
@Slf4j
public class EventConsumeServiceImpl {

    public void consumeEvent(String eventId, String payload) {
        try {
            eventRecordDao.save(buildRecord(eventId, payload));
        } catch (DuplicateKeyException e) {
            log.warn("事件记录已存在，幂等返回: eventId={}", eventId);
            return;  // 幂等返回，不影响流程
        }
        // 继续处理...
    }
}

// ✅ 正确 - WARN 级别示例（兜底处理）
@Slf4j
public class ConfigService {

    public FeatureConfig parseFeatureConfig(String json) {
        if (json == null || json.isEmpty()) {
            return FeatureConfig.defaultConfig();
        }
        try {
            return objectMapper.readValue(json, FeatureConfig.class);
        } catch (JsonProcessingException e) {
            log.warn("特性配置解析失败，使用默认配置: json={}, 原因: {}", json, e.getMessage());
            return FeatureConfig.defaultConfig();  // 兜底返回默认值
        }
    }
}

// ✅ 正确 - WARN 级别示例（业务条件不满足）
@Slf4j
public class LoginServiceImpl implements ILoginService {

    @Override
    public LoginResultDto login(LoginCommand command) {
        UserEntity user = userDAO.getOneByUsername(command.getUsername());
        
        if (user == null) {
            log.warn("用户不存在: username={}", command.getUsername());
            throw new BusinessException(AuthErrorInfo.INVALID_CREDENTIALS);
        }
        
        if (!passwordEncoder.matches(command.getPassword(), user.getPassword())) {
            log.warn("密码错误: username={}", command.getUsername());
            throw new BusinessException(AuthErrorInfo.INVALID_CREDENTIALS);
        }
        
        // ...后续登录流程
    }
}

// ✅ 正确 - WARN 级别示例（缓存失效）
@Slf4j
public class OpaqueTokenAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(...) {
        UserContextDto user = userCacheService.get(token);
        if (user == null) {
            log.warn("用户缓存未命中: token={}", token);
        }
        // ...继续处理或返回401
    }
}

// ❌ 错误 - 不可恢复错误使用 WARN
log.warn("数据库连接失败: {}", e.getMessage());  // 应使用 ERROR

// ❌ 错误 - 关键业务成功使用 WARN
log.warn("订单创建成功: orderId={}", orderId);  // 应使用 INFO

// ❌ 错误 - WARN 后不处理
log.warn("配置缺失");
// 未提供默认值或降级方案，可能导致后续流程异常
```

**WARN 级别禁止**：

- ❌ 不可恢复的错误使用 WARN（应使用 ERROR）
- ❌ 关键业务成功使用 WARN（应使用 INFO）
- ❌ WARN 后无处理措施（必须有明确的兜底或降级方案）
- ❌ 异常堆栈使用 WARN（需传播的异常应使用 ERROR）

### 1.5 ERROR 级别

**适用场景**：

| 场景 | 说明 | 示例 |
|---|---|---|
| 业务异常抛出 | BusinessException 需传播 | `log.error("业务异常: code={}, message={}", code, msg, e)` |
| 技术异常 | SQLException、IOException 等需转换 | `log.error("数据库异常: {}", e.getMessage(), e)` |
| 外部服务不可用 | 关键依赖不可达 | `log.error("支付服务调用失败: orderId={}", orderId, e)` |
| 数据不一致 | 关键数据校验失败 | `log.error("订单状态不一致: orderId={}, expected={}, actual={}", ...)` |
| 系统启动失败 | 应用初始化失败 | `log.error("数据库连接池初始化失败", e)` |
| 全局异常捕获 | 未预期异常兜底 | `log.error("系统异常: {}", e.getMessage(), e)` |

```java
// ✅ 正确 - ERROR 级别示例（BusinessException）
@Slf4j
@RestControllerAdvice
public class ExceptionHandlerAdvice {

    @ExceptionHandler(BusinessException.class)
    public ApiResult<?> handleBusinessException(BusinessException e) {
        log.error("BusinessException: {}", e.getMessage(), e);
        return ApiResult.fail(e.getErrorCode(), errorMessageResolver.resolve(e));
    }
}

// ✅ 正确 - ERROR 级别示例（技术异常转换）
@Slf4j
public class JsonService {

    public <T> T parseJson(String json, Class<T> clazz) {
        try {
            return objectMapper.readValue(json, clazz);
        } catch (JsonProcessingException e) {
            log.error("JSON解析失败: json={}, 目标类型={}", json, clazz.getName(), e);
            throw new BusinessException(JsonErrorInfo.DESERIALIZATION_FAILED, e);
        }
    }
}

// ✅ 正确 - ERROR 级别示例（外部服务调用）
@Slf4j
public class PaymentService {

    public PaymentResultDto pay(String orderId, BigDecimal amount) {
        try {
            return paymentClient.execute(orderId, amount);
        } catch (FeignClientException e) {
            log.error("支付服务调用失败: orderId={}, amount={}", orderId, amount, e);
            throw new BusinessException(PaymentErrorInfo.PAYMENT_FAILED, e);
        }
    }
}

// ✅ 正确 - ERROR 级别示例（全局兜底）
@Slf4j
@RestControllerAdvice
public class ExceptionHandlerAdvice {

    @ExceptionHandler(Exception.class)
    public ApiResult<?> handleException(Exception e) {
        log.error("系统异常: {}", e.getMessage(), e);
        return ApiResult.fail(FAIL_CODE, "系统异常,请联系管理员");
    }
}

// ❌ 错误 - 可恢复问题使用 ERROR
log.error("缓存未命中，使用数据库查询: key={}", key);  // 应使用 WARN 或 DEBUG

// ❌ 错误 - 不包含堆栈
log.error("操作失败: {}", e.getMessage());  // 缺少堆栈，无法定位

// ❌ 错误 - DEBUG 信息使用 ERROR
log.error("进入方法: userId={}", userId);  // 应使用 DEBUG 或 INFO
```

**ERROR 级别禁止**：

- ❌ 可恢复问题使用 ERROR（应使用 WARN）
- ❌ 仅记录 `e.getMessage()`（必须包含堆栈 `e`）
- ❌ 业务成功使用 ERROR（应使用 INFO）
- ❌ 循环内部使用 ERROR（日志爆炸，影响性能）

---

## 二、日志格式约定

### 2.1 Logger 定义规范

**使用 `@Slf4j` 注解**：

```java
// ✅ 正确 - 使用 Lombok @Slf4j 注解
@Slf4j
@Service
public class UserServiceImpl implements IUserService {
    // 直接使用 log 变量
    public UserDetailDto getUserDetail(String userId) {
        log.info("查询用户详情: userId={}", userId);
        // ...
    }
}

// ❌ 错误 - 手动创建 Logger（冗余代码）
public class UserServiceImpl implements IUserService {
    private static final Logger log = LoggerFactory.getLogger(UserServiceImpl.class);
    // ...
}

// ❌ 错误 - 使用 System.out（禁止）
System.out.println("用户登录成功");  // 无法控制级别、无格式、无上下文
```

### 2.2 日志消息格式规范

**基本格式**：

```
操作描述: 关键参数1={值1}, 关键参数2={值2}
```

| 格式要素 | 说明 | 示例 |
|---|---|---|
| 操作描述 | 简洁中文描述操作类型 | `用户登录请求`、`创建订单`、`查询用户详情` |
| 参数分隔符 | 使用 `, ` 分隔多个参数 | `userId={id}, username={name}` |
| 参数格式 | `{参数名}={值}`，使用 SLF4J 占位符 | `username={username}` |
| 异常堆栈 | 作为最后一个参数传入 | `log.error("失败: {}", msg, e)` |

```java
// ✅ 正确 - 标准格式
log.info("用户登录请求: username={}", username);
log.info("用户创建成功: userId={}, username={}", userId, username);
log.info("分页查询用户: pageNum={}, pageSize={}", pageNum, pageSize);
log.error("业务异常: code={}, message={}", code, message, e);

// ✅ 正确 - 多参数格式（参数间逗号+空格）
log.info("刷新令牌 - 缓存用户信息: userId={}, oldAccessToken={}, newAccessToken={}",
        userId, oldToken, newToken);

// ✅ 正确 - 带业务主键的异常日志
log.error("文件下载失败: fileId={}, userId={}", fileId, userId, e);

// ❌ 错误 - 无描述信息
log.info(userId);  // 缺少操作描述

// ❌ 错误 - 使用 + 号拼接（性能差）
log.info("用户登录成功: userId=" + userId);  // 应使用占位符

// ❌ 错误 - 参数格式不一致
log.info("用户登录成功 userId={}", userId);  // 缺少冒号分隔

// ❌ 错误 - 中英文混杂
log.info("User login success: userId={}", userId);  // 应使用中文描述
```

### 2.3 参数选择规范

**必须记录的参数**：

| 参数类型 | 说明 | 示例 |
|---|---|---|
| 业务主键 | 实体ID、订单号、用户ID | `userId`, `orderId`, `fileId` |
| 业务标识 | 用户名、编码、唯一键 | `username`, `code`, `eventId` |
| 关键状态 | 操作结果状态 | `status`, `result` |
| 关键数值 | 金额、数量、分页参数 | `amount`, `pageNum`, `pageSize` |

**禁止记录的参数**：

| 参数类型 | 原因 | 示例 |
|---|---|---|
| 密码明文 | 安全风险 | `password`（必须脱敏） |
| Token完整值 | 安全风险 | `accessToken`（截断显示） |
| 身份证号 | 个人隐私 | `idCard`（必须脱敏） |
| 手机号完整 | 个人隐私 | `phone`（部分脱敏） |
| 大对象内容 | 性能影响 | 大型DTO、JSON串（应记录关键ID） |

```java
// ✅ 正确 - 记录业务主键和标识
log.info("用户登录请求: username={}", username);
log.info("用户创建成功: userId={}, username={}", userId, username);
log.info("文件上传完成: taskId={}, fileSize={}", taskId, fileSize);

// ✅ 正确 - 记录关键状态和数值
log.info("订单支付成功: orderId={}, amount={}, status={}", orderId, amount, "PAID");

// ✅ 正确 - 分页查询记录分页参数
log.info("分页查询用户: pageNum={}, pageSize={}", pageNum, pageSize);

// ❌ 错误 - 记录敏感信息
log.info("用户登录: username={}, password={}", username, password);  // 密码禁止出现

// ❌ 错误 - 记录完整Token
log.info("生成Token: accessToken={}", fullToken);  // 应截断显示

// ❌ 错误 - 记录完整手机号
log.info("发送短信: phone={}", "13812345678");  // 应脱敏

// ❌ 错误 - 记录大对象
log.info("查询结果: dto={}", largeDto);  // 应记录关键ID，如 userId
```

### 2.4 结构化字段约定

**推荐结构化字段（用于日志分析和追踪）**：

| 字段 | 说明 | 来源 | 示例 |
|---|---|---|---|
| `traceId` | 链路追踪ID | `NebulaEventContext.traceId()` 或请求头 `X-Trace-Id` | `abc123` |
| `requestId` | 请求唯一标识 | `RequestContextDto.requestId()` | `req-001` |
| `userId` | 当前用户ID | `CurrentUserContext.getId()` | `10001` |
| `moduleId` | 模块标识 | 业务模块名 | `auth`, `storage` |
| `eventId` | 事件实例ID | `NebulaEvent.eventId()` | `evt-001` |
| `aggregateId` | 业务聚合根ID | `NebulaEvent.aggregateId()` | 订单ID、用户ID |

```java
// ✅ 正确 - 带结构化字段的日志
@Slf4j
public class EventHandler {

    public void handle(NebulaEventContext context, Payload payload) {
        log.info("处理用户创建事件: eventId={}, traceId={}, aggregateId={}",
                context.eventId(), context.traceId(), context.aggregateId());
        // ...
    }
}

// ✅ 正确 - 带用户上下文的日志
@Slf4j
public class OrderServiceImpl {

    public OrderDto createOrder(CreateOrderCommand command) {
        String userId = CurrentUserContext.getId();
        log.info("创建订单请求: userId={}, productId={}, amount={}",
                userId, command.getProductId(), command.getAmount());
        // ...
    }
}
```

### 2.5 异常日志格式规范

**异常日志必须包含堆栈**：

```java
// ✅ 正确 - 异常作为最后一个参数
log.error("业务异常: code={}, message={}", e.getErrorCode(), e.getMessage(), e);
log.error("数据库异常: {}", e.getMessage(), e);
log.error("系统异常: {}", e.getMessage(), e);

// ✅ 正确 - BusinessException 日志格式
log.error("BusinessException: code={}, message={}", e.getErrorCode(), e.getMessage(), e);

// ✅ 正确 - 技术异常日志格式
log.error("SQLException: {}", e.getMessage(), e);
log.error("JsonProcessingException: {}", e.getMessage(), e);

// ❌ 错误 - 仅记录消息，缺少堆栈
log.error("操作失败: {}", e.getMessage());  // 无法定位问题

// ❌ 错误 - 异常不在最后位置
log.error("异常: {}", e, "额外信息");  // SLF4J 不会打印堆栈

// ❌ 错误 - 使用 log.info 记录异常
log.info("查询失败: {}", e.getMessage());  // 应使用 ERROR/WARN
```

---

## 三、日志脱敏

### 3.1 敏感数据定义

| 数据类型 | 风险级别 | 脱敏规则 | 示例 |
|---|---|---|---|
| **密码** | 高危 | 完全隐藏 | `******` 或不记录 |
| **Token** | 高危 | 截断显示（前8位+...） | `abc12345...` |
| **密钥/Secret** | 高危 | 完全隐藏 | `******` 或不记录 |
| **身份证号** | 高危 | 部分隐藏（保留前3后4） | `320***********1234` |
| **手机号** | 中危 | 部分隐藏（保留前3后4） | `138****5678` |
| **银行卡号** | 高危 | 部分隐藏（保留前4后4） | `6222********1234` |
| **邮箱** | 中危 | 部分隐藏（保留前缀首字母） | `a***@example.com` |
| **地址** | 中危 | 部分隐藏（保留省市） | `江苏省南京市****` |

### 3.2 密码脱敏

**密码完全禁止出现在日志中**：

```java
// ✅ 正确 - 不记录密码
log.info("用户登录请求: username={}", username);
// 密码不出现在日志中

// ✅ 正确 - 不记录密码（注册场景）
log.info("用户注册请求: username={}", username);
// 密码不出现在日志中

// ✅ 正确 - 密码校验失败不记录密码值
log.warn("密码错误: username={}", username);
// 不记录密码明文或密文

// ❌ 错误 - 记录密码明文
log.info("用户登录: username={}, password={}", username, password);

// ❌ 错误 - 记录密码密文
log.info("用户登录: username={}, encodedPassword={}", username, encodedPwd);

// ❌ 错误 - 使用密码做参数名
log.info("用户登录: pwd={}", password);  // 任何形式都禁止
```

### 3.3 Token 脱敏

**Token 截断显示**：

```java
// ✅ 正确 - Token 截断显示（前8位）
private String maskToken(String token) {
    if (token == null || token.length() <= 8) {
        return "***";
    }
    return token.substring(0, 8) + "...";
}

log.info("用户登录成功: userId={}, accessToken={}", userId, maskToken(accessToken));
// 输出: accessToken=abc12345...

// ✅ 正确 - 日志中使用截断Token
log.info("刷新令牌请求: refreshToken={}", maskToken(refreshToken));
log.info("缓存用户信息: accessToken={}", maskToken(accessToken));

// ✅ 正确 - 记录完整Token的长度而非值
log.info("生成AccessToken: length={}", accessToken.length());

// ❌ 错误 - 记录完整Token
log.info("生成Token: accessToken={}", accessToken);

// ❌ 错误 - Token 作为URL参数
log.info("请求URL: url={}", "/api/auth?token=" + accessToken);
```

**Token 脱敏函数示例**：

```java
/**
 * Token 脱敏工具类
 */
public class LogMaskUtils {

    /**
     * 脱敏 Token，保留前8位
     */
    public static String maskToken(String token) {
        if (token == null || token.isEmpty()) {
            return "";
        }
        if (token.length() <= 8) {
            return "***";
        }
        return token.substring(0, 8) + "...";
    }

    /**
     * 脱敏手机号，保留前3后4
     */
    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return "***";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    /**
     * 脱敏身份证号，保留前3后4
     */
    public static String maskIdCard(String idCard) {
        if (idCard == null || idCard.length() < 7) {
            return "***";
        }
        return idCard.substring(0, 3) + "***********" + idCard.substring(idCard.length() - 4);
    }
}
```

### 3.4 个人信息脱敏

**手机号、身份证号脱敏**：

```java
// ✅ 正确 - 手机号脱敏
log.info("发送短信验证码: phone={}", maskPhone(phone));
// 输出: phone=138****5678

// ✅ 正确 - 身份证号脱敏
log.info("实名认证: idCard={}", maskIdCard(idCard));
// 输出: idCard=320***********1234

// ✅ 正确 - 邮箱脱敏
log.info("发送邮件: email={}", maskEmail(email));
// 输出: email=a***@example.com

// ❌ 错误 - 记录完整手机号
log.info("发送短信: phone={}", "13812345678");

// ❌ 错误 - 记录完整身份证号
log.info("实名认证: idCard={}", "320123199001011234");

// ❌ 错误 - 记录完整邮箱
log.info("发送邮件: email={}", "alice@example.com");
```

### 3.5 OAuth2 密钥脱敏

**AppSecret、ClientSecret 完全隐藏**：

```java
// ✅ 正确 - 不记录密钥
log.info("OAuth2客户端配置: clientId={}, enabled={}", clientId, enabled);
// appSecret 不出现在日志中

// ✅ 正确 - 使用占位符表示密钥
log.info("飞书应用配置: appId={}, appSecret={}", appId, "******");

// ❌ 错误 - 记录完整密钥
log.info("OAuth2配置: clientId={}, clientSecret={}", clientId, clientSecret);

// ❌ 错误 - 记录飞书 AppSecret
log.info("飞书配置: appId={}, appSecret={}", appId, appSecret);
```

### 3.6 业务数据脱敏

**大对象、JSON 内容处理**：

```java
// ✅ 正确 - 记录业务主键而非完整对象
log.info("用户创建成功: userId={}", userId);
// 不记录完整 UserEntity

// ✅ 正确 - 记录关键参数而非完整JSON
log.info("处理消息: messageId={}, type={}", messageId, messageType);
// 不记录完整 payload JSON

// ✅ 正确 - JSON 解析失败时记录长度而非内容
log.warn("JSON解析失败，使用默认配置: length={}, 原因={}", json.length(), e.getMessage());

// ❌ 错误 - 记录完整实体对象
log.info("用户信息: user={}", userEntity);  // 可能包含敏感字段

// ❌ 错误 - 记录完整JSON内容
log.info("请求内容: body={}", largeJsonString);  // 性能影响

// ❌ 错误 - 记录完整DTO
log.info("查询结果: dto={}", userDetailDto);  // 应记录关键ID
```

---

## 四、日志使用场景

### 4.1 Controller 层日志

**Controller 层通常不直接打日志**（由 Service 层记录业务日志）。

特殊场景：

| 场景 | 日志级别 | 说明 |
|---|---|---|
| 请求参数校验失败 | `WARN` | `@Valid` 校验失败时由全局处理器记录 |
| 接口不存在 | `WARN` | 由全局处理器记录 404 |
| Content-Type 不支持 | `WARN` | 由全局处理器记录 415 |

```java
// ✅ 正确 - Controller 不打业务日志（由 Service 层记录）
@Slf4j
@RestController
@RequestMapping("/api/auth/users")
@RequiredArgsConstructor
public class UserController {

    private final IUserService userService;

    @PostMapping
    public ApiResult<UserDetailResp> createUser(@RequestBody CreateUserReq req) {
        // Controller 不打日志，由 Service 层记录
        CreateUserCommand command = UserLocalConverter.INSTANCE.toCommand(req);
        UserDetailDto dto = userService.createUser(command);
        return ApiResult.success(UserLocalConverter.INSTANCE.toResp(dto));
    }
}

// ✅ 正确 - 全局异常处理器记录请求异常
@Slf4j
@RestControllerAdvice
public class ExceptionHandlerAdvice {

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResult<?>> handleHttpMediaTypeNotSupportedException(...) {
        log.warn("HttpMediaTypeNotSupportedException: {}", e.getMessage());
        return ResponseEntity.status(415).body(...);
    }
}

// ❌ 错误 - Controller 重复记录业务日志
@PostMapping
public ApiResult<UserDetailResp> createUser(@RequestBody CreateUserReq req) {
    log.info("创建用户请求: username={}", req.getUsername());  // Service 会记录，重复
    // ...
}
```

### 4.2 Service 层日志

**Service 层是日志记录的主要位置**：

| 方法类型 | 日志位置 | 级别 | 内容 |
|---|---|---|---|
| 写操作（create/update/remove） | 方法开始 + 结束 | `INFO` | 入参 + 结果 |
| 读操作（get/page/list/tree） | 方法开始 | `DEBUG` | 入参（高频查询避免 INFO） |
| 业务校验失败 | 抛异常前 | `WARN` | 校验失败原因 |
| 异常转换 | catch 块 | `ERROR` | 异常信息 + 堆栈 |

```java
// ✅ 正确 - Service 层完整日志模式
@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public String createUser(CreateUserCommand command) {
        // 方法开始 - INFO
        log.info("创建用户: username={}", command.getUsername());
        
        // 业务校验失败 - WARN
        if (userDAO.countByUsername(command.getUsername()) > 0) {
            log.warn("用户名已存在: username={}", command.getUsername());
            throw new BusinessException(AuthErrorInfo.USERNAME_ALREADY_EXISTS);
        }
        
        // 业务逻辑...
        userDAO.save(user);
        
        // 方法结束 - INFO
        log.info("用户创建成功: userId={}, username={}", user.getId(), user.getUsername());
        
        return user.getId();
    }

    @Override
    public UserDetailDto getUserDetail(String userId) {
        // 方法开始 - DEBUG（读操作入参追踪）
        log.debug("查询用户详情: userId={}", userId);
        
        UserEntity user = userDAO.getById(userId);
        if (user == null) {
            log.warn("用户不存在: userId={}", userId);
            throw new BusinessException(AuthErrorInfo.USER_NOT_FOUND, userId);
        }
        
        return UserConverter.INSTANCE.toDetailDto(user);
    }

    @Override
    public IPage<UserDto> pageUser(PageUserQuery query) {
        // 分页查询 - DEBUG（高频查询避免 INFO）
        log.debug("分页查询用户: pageNum={}, pageSize={}", query.getPageNum(), query.getPageSize());
        
        // 查询逻辑...
        return page.convert(UserConverter.INSTANCE::toDto);
    }
}
```

### 4.3 DAO/Mapper 层日志

**DAO 层通常不直接打日志**（由 Service 层记录）。

特殊场景：

| 场景 | 日志级别 | 说明 |
|---|---|---|
| SQL 执行异常 | 由全局处理器兜底 | SQLException 由 `ExceptionHandlerAdvice` 处理 |
| 批量操作统计 | `DEBUG` | 开发阶段调试批量操作性能 |

```java
// ✅ 正确 - DAO 层不打业务日志
public class UserDAO extends ServiceImpl<UserMapper, UserEntity> {
    // 直接使用 MyBatis Plus，不打日志
}

// ❌ 错误 - DAO 层重复记录日志
public class UserDAO {
    public UserEntity getById(String userId) {
        log.info("查询用户: userId={}", userId);  // Service 会记录，重复
        return mapper.selectById(userId);
    }
}
```

### 4.4 远程调用层日志

**FeignClient 调用异常由 FeignErrorDecoder 处理**：

```java
// ✅ 正确 - FeignErrorDecoder 统一处理远程调用异常
public class FeignErrorDecoder implements ErrorDecoder {

    @Override
    public Exception decode(String methodKey, Response response) {
        String serviceName = extractServiceName(methodKey);
        String path = extractPath(methodKey);
        
        // 超时、连接拒绝、服务不可用等异常统一处理
        if (response.status() == 503) {
            return FeignClientException.serviceUnavailable(serviceName, path);
        }
        
        // 解析响应体失败 - DEBUG
        log.debug("Failed to parse error response as ApiResult: {}", body, e);
        
        // 读取响应体失败 - ERROR
        log.error("Failed to read error response body", e);
        
        return defaultDecoder.decode(methodKey, response);
    }
}

// ✅ 正确 - RemoteServiceImpl 记录调用结果
@Slf4j
public class UserRemoteServiceImpl implements IUserService {

    @Override
    public UserDetailDto getUserDetail(String userId) {
        log.info("远程调用用户服务: userId={}", userId);
        
        try {
            return userFeignClient.getUserDetail(userId);
        } catch (FeignClientException e) {
            log.error("远程调用失败: service={}, userId={}", "user-service", userId, e);
            throw e;
        }
    }
}
```

### 4.5 事件处理器日志

**事件处理器记录事件消费过程**：

```java
// ✅ 正确 - 事件处理器日志模式
@Slf4j
@Component
@RequiredArgsConstructor
public class UserCreatedEventHandler implements NebulaEventHandler<UserCreatedPayload> {

    @Override
    public void onEvent(NebulaEventContext context, UserCreatedPayload payload) {
        // 事件消费开始 - INFO（带 eventId、traceId）
        log.info("处理用户创建事件: eventId={}, traceId={}, userId={}",
                context.eventId(), context.traceId(), payload.userId());
        
        // 业务处理...
        
        // 事件消费完成 - INFO
        log.info("用户创建事件处理完成: eventId={}, userId={}", 
                context.eventId(), payload.userId());
    }
}

// ✅ 正确 - 幂等消费日志
@Slf4j
public class EventConsumeExecutor {

    public void execute(String eventId, Runnable handler) {
        if (deduplicator.exists(eventId)) {
            log.warn("事件已消费，幂等跳过: eventId={}", eventId);
            return;
        }
        
        deduplicator.mark(eventId);
        handler.run();
        deduplicator.confirm(eventId);
        
        log.info("事件消费完成: eventId={}", eventId);
    }
}
```

### 4.6 定时任务日志

**定时任务记录任务执行过程**：

```java
// ✅ 正确 - 定时任务日志模式
@Slf4j
@Component
public class CacheCleanupJob {

    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupExpiredCache() {
        // 任务开始 - INFO
        log.info("定时任务开始执行: jobName=CacheCleanupJob");
        
        try {
            int cleanedCount = cacheService.cleanupExpired();
            
            // 任务完成 - INFO（带执行结果）
            log.info("定时任务执行完成: jobName=CacheCleanupJob, cleanedCount={}", cleanedCount);
            
        } catch (Exception e) {
            // 任务失败 - ERROR
            log.error("定时任务执行失败: jobName=CacheCleanupJob", e);
        }
    }
}

// ✅ 正确 - XXL-Job 任务日志
@Slf4j
@Component
public class SchedulerXxlExecutor {

    @XxlJob("orderCleanupJob")
    public void orderCleanupJob() {
        XxlJobHelper.log("定时任务开始执行: jobName=orderCleanupJob");
        
        // 业务处理...
        
        XxlJobHelper.log("定时任务执行完成: processedCount={}", processedCount);
    }
}
```

---

## 五、禁止行为

### 5.1 Logger 定义禁止

- ❌ 使用 `System.out.println()`（无法控制级别、无格式）
- ❌ 使用 `System.err.println()`（无法控制级别、无格式）
- ❌ 使用 `printStackTrace()`（无法控制级别、格式混乱）
- ❌ 手动创建 Logger（应使用 `@Slf4j`）
- ❌ 使用非 SLF4J Logger（如 `java.util.logging`）

```java
// ❌ 错误 - 使用 System.out
System.out.println("用户登录成功");

// ❌ 错误 - 使用 printStackTrace
try {
    doSomething();
} catch (Exception e) {
    e.printStackTrace();  // 应使用 log.error
}

// ❌ 错误 - 手动创建 Logger
private static final Logger log = LoggerFactory.getLogger(MyService.class);
// 应使用 @Slf4j

// ✅ 正确 - 使用 @Slf4j
@Slf4j
public class MyService {
    log.info("用户登录成功");
}
```

### 5.2 日志级别禁止

- ❌ 关键业务使用 `DEBUG`（应使用 `INFO`）
- ❌ 异常使用 `DEBUG`（应使用 `ERROR`）
- ❌ 可恢复问题使用 `ERROR`（应使用 `WARN`）
- ❌ 幂等处理使用 `ERROR`（应使用 `WARN`）
- ❌ 兜底处理使用 `ERROR`（应使用 `WARN`）
- ❌ 业务成功使用 `ERROR`（应使用 `INFO`）
- ❌ 循环内部使用 `INFO`/`ERROR`（应使用 `DEBUG` 或仅记录结果）
- ❌ 生产环境开启 `DEBUG`（性能影响）

```java
// ❌ 错误 - 关键业务使用 DEBUG
log.debug("用户登录成功: userId={}", userId);  // 应使用 INFO

// ❌ 错误 - 异常使用 DEBUG
log.debug("查询失败: {}", e.getMessage());  // 应使用 ERROR

// ❌ 错误 - 幂等处理使用 ERROR
log.error("记录已存在，幂等返回: eventId={}", eventId);  // 应使用 WARN

// ❌ 错误 - 兜底处理使用 ERROR
log.error("配置解析失败，使用默认值: {}", reason);  // 应使用 WARN

// ❌ 错误 - 循环内部使用 INFO
for (UserEntity user : users) {
    log.info("处理用户: userId={}", user.getId());  // 应使用 DEBUG
}

// ❌ 错误 - 循环内部使用 ERROR
for (Record record : records) {
    log.error("处理记录失败: id={}", record.getId());  // 应汇总后记录
}
```

### 5.3 日志格式禁止

- ❌ 使用 `+` 号拼接字符串（性能差，应使用占位符）
- ❌ 无操作描述（无法理解日志含义）
- ❌ 参数格式不一致（缺少冒号、分隔符混乱）
- ❌ 中英文混杂（统一使用中文描述）
- ❌ 参数名与实际值不符（误导排查）
- ❌ 日志消息无业务含义（纯技术术语）

```java
// ❌ 错误 - 使用 + 号拼接
log.info("用户登录成功: userId=" + userId);  // 性能差

// ✅ 正确 - 使用占位符
log.info("用户登录成功: userId={}", userId);

// ❌ 错误 - 无操作描述
log.info(userId);  // 无法理解

// ✅ 正确 - 有操作描述
log.info("用户登录成功: userId={}", userId);

// ❌ 错误 - 中英文混杂
log.info("User login success: userId={}", userId);

// ✅ 正确 - 中文描述
log.info("用户登录成功: userId={}", userId);

// ❌ 错误 - 参数名与值不符
log.info("用户ID: {}", username);  // 参数名是 userId，值是 username

// ❌ 错误 - 无业务含义
log.info("execute method getById");  // 纯技术术语
```

### 5.4 异常日志禁止

- ❌ 仅记录 `e.getMessage()`（缺少堆栈）
- ❌ 异常不在最后位置（SLF4J 不打印堆栈）
- ❌ 使用 `log.info` 记录异常（应使用 `ERROR`）
- ❌ 使用 `log.debug` 记录异常（应使用 `ERROR`）
- ❌ 捕获异常后无日志无抛出（隐式吞掉异常）

```java
// ❌ 错误 - 仅记录消息
log.error("操作失败: {}", e.getMessage());  // 缺少堆栈

// ✅ 正确 - 包含堆栈
log.error("操作失败: {}", e.getMessage(), e);

// ❌ 错误 - 异常不在最后
log.error("异常: {}", e, "额外信息");  // 不打印堆栈

// ✅ 正确 - 异常在最后
log.error("异常: {}, 额外信息: {}", e.getMessage(), info, e);

// ❌ 错误 - 使用 INFO 记录异常
log.info("查询失败: {}", e.getMessage());  // 应使用 ERROR

// ❌ 错误 - 隐式吞掉异常
try {
    doSomething();
} catch (Exception e) {
    // 无日志、无抛出，异常被吞掉
}
```

### 5.5 敏感信息禁止

- ❌ 记录密码明文
- ❌ 记录密码密文/哈希值
- ❌ 记录完整 Token
- ❌ 记录 AppSecret/ClientSecret
- ❌ 记录完整手机号
- ❌ 记录完整身份证号
- ❌ 记录完整银行卡号
- ❌ 敏感信息出现在 URL 日志中

```java
// ❌ 错误 - 记录密码
log.info("用户登录: username={}, password={}", username, password);
log.info("用户登录: username={}, encodedPwd={}", username, encodedPwd);

// ❌ 错误 - 记录完整Token
log.info("生成Token: accessToken={}", accessToken);
log.info("请求URL: url={}", "/api?token=" + accessToken);

// ❌ 错误 - 记录密钥
log.info("OAuth2配置: clientId={}, clientSecret={}", clientId, clientSecret);
log.info("飞书配置: appId={}, appSecret={}", appId, appSecret);

// ❌ 错误 - 记录完整手机号
log.info("发送短信: phone={}", "13812345678");

// ❌ 错误 - 记录完整身份证号
log.info("实名认证: idCard={}", "320123199001011234");

// ✅ 正确 - 脱敏后记录
log.info("发送短信: phone={}", maskPhone(phone));
log.info("生成Token: accessToken={}", maskToken(accessToken));
```

### 5.6 性能相关禁止

- ❌ 循环内部打印 `INFO`/`ERROR`（日志爆炸）
- ❌ 记录大对象完整内容（性能影响）
- ❌ 记录长 JSON 字符串（性能影响）
- ❌ 在高频接口打印 `DEBUG`（即使关闭也有开销）
- ❌ 日志消息包含复杂计算（提前计算再打印）

```java
// ❌ 错误 - 循环内 INFO
for (int i = 0; i < 10000; i++) {
    log.info("处理第 {} 条记录", i);  // 日志爆炸
}

// ✅ 正确 - 循环结果汇总
int processedCount = 0;
for (Record record : records) {
    processedCount++;
}
log.info("批量处理完成: totalCount={}, processedCount={}", records.size(), processedCount);

// ❌ 错误 - 记录大对象
log.info("查询结果: dto={}", largeDto);  // toString 开销大

// ✅ 正确 - 记录关键ID
log.info("查询结果: userId={}", largeDto.getUserId());

// ❌ 错误 - 高频接口 DEBUG（即使关闭也有参数计算开销）
public UserDto getUser(String userId) {
    log.debug("查询用户: userId={}, thread={}, time={}", userId, Thread.currentThread().getName(), System.currentTimeMillis());
    // 高频调用时，即使 DEBUG 关闭，参数计算仍有开销
}

// ✅ 正确 - 高频接口仅关键信息
public UserDto getUser(String userId) {
    // 不打 DEBUG，依赖 Service 层 INFO
    return userService.getUserDetail(userId);
}
```

### 5.7 其他禁止行为

- ❌ 日志记录业务逻辑判断（应由代码逻辑处理）
- ❌ 日志替代异常处理（异常必须抛出或处理）
- ❌ 日志替代返回值（业务结果必须返回）
- ❌ 多次打印同一信息（日志冗余）
- ❌ 不同层级打印相同信息（重复日志）

```java
// ❌ 错误 - 日志替代异常处理
try {
    doSomething();
} catch (Exception e) {
    log.error("操作失败", e);
    // 未抛出异常，调用方无法感知失败
}

// ✅ 正确 - 日志后抛出或处理
try {
    doSomething();
} catch (Exception e) {
    log.error("操作失败", e);
    throw new BusinessException(ErrorCode.OPERATION_FAILED, e);
}

// ❌ 错误 - 不同层级重复日志
// Controller
log.info("创建用户: username={}", username);
// Service
log.info("创建用户: username={}", username);  // 重复

// ✅ 正确 - 仅 Service 层记录
// Controller 不打日志
// Service
log.info("创建用户: username={}", username);
```

---

## 六、速查表

### 6.1 日志级别速查

| 场景 | 级别 | 格式示例 |
|---|---|---|
| 服务启动/停止 | `INFO` | `log.info("服务启动完成")` |
| 写操作开始（create/update/remove） | `INFO` | `log.info("创建用户: username={}", username)` |
| 写操作完成 | `INFO` | `log.info("用户创建成功: userId={}", userId)` |
| 读操作入参（get/page/list/tree） | `DEBUG` | `log.debug("分页查询: pageNum={}, pageSize={}", pageNum, pageSize)` |
| 业务校验失败 | `WARN` | `log.warn("用户不存在: userId={}", userId)` |
| 幂等处理 | `WARN` | `log.warn("记录已存在，幂等返回: eventId={}", eventId)` |
| 兜底处理 | `WARN` | `log.warn("配置解析失败，使用默认值: 原因={}", reason)` |
| 缓存未命中 | `WARN` | `log.warn("缓存未命中: key={}", key)` |
| BusinessException | `ERROR` | `log.error("业务异常: code={}, message={}", code, msg, e)` |
| 技术异常 | `ERROR` | `log.error("数据库异常: {}", e.getMessage(), e)` |
| 外部服务失败 | `ERROR` | `log.error("调用支付服务失败: orderId={}", orderId, e)` |
| 全局异常兜底 | `ERROR` | `log.error("系统异常: {}", e.getMessage(), e)` |
| 方法入参追踪 | `DEBUG` | `log.debug("查询入参: userId={}", userId)` |
| 循环内部细节 | `DEBUG` | `log.debug("处理第 {} 条: id={}", i, id)` |

### 6.2 敏感信息脱敏速查

| 数据类型 | 脱敏方式 | 示例 |
|---|---|---|
| 密码 | 完全隐藏 | 不记录 |
| Token | 截断（前8位+...） | `abc12345...` |
| AppSecret/ClientSecret | 完全隐藏 | `******` 或不记录 |
| 手机号 | 前3后4 | `138****5678` |
| 身份证号 | 前3后4 | `320***********1234` |
| 银行卡号 | 前4后4 | `6222********1234` |
| 邮箱 | 首字母+*** | `a***@example.com` |

### 6.3 日志位置速查

| 层级 | 是否打印 | 场景 | 说明 |
|---|---|---|---|
| **Controller** | 通常不打印 | 业务操作 | 由 Service 层记录 |
| | 可打印 | 全局异常处理 | `ExceptionHandlerAdvice` |
| **Service** | 主要打印位置 | 业务操作 | 方法开始 + 结束 + 异常 |
| **DAO** | 通常不打印 | 数据操作 | 由 Service 层记录 |
| **Remote** | 可打印 | 远程调用结果 | 调用成功/失败 |
| | 由 Decoder 处理 | 远程调用异常 | `FeignErrorDecoder` |
| **EventHandler** | 可打印 | 事件消费 | 开始 + 结束 + 幂等 |
| **定时任务** | 必须打印 | 任务执行 | 开始 + 结果 + 异常 |

### 6.4 异常日志速查

| 异常类型 | 级别 | 格式 |
|---|---|---|
| BusinessException（需传播） | `ERROR` | `log.error("业务异常: code={}, message={}", code, msg, e)` |
| 技术异常（需转换） | `ERROR` | `log.error("技术异常: {}", e.getMessage(), e)` |
| 幂等处理（DuplicateKeyException） | `WARN` | `log.warn("幂等返回: key={}", key)` |
| 兜底处理（尝试性失败） | `WARN` | `log.warn("操作失败，使用默认值: 原因={}", reason)` |
| 全局兜底（Exception） | `ERROR` | `log.error("系统异常: {}", e.getMessage(), e)` |

### 6.5 参数选择速查

| 参数类型 | 是否记录 | 说明 |
|---|---|---|
| 业务主键（userId、orderId） | ✅ 必须 | 问题定位核心 |
| 业务标识（username、code） | ✅ 必须 | 业务理解核心 |
| 关键状态（status、result） | ✅ 推荐 | 状态追踪 |
| 关键数值（amount、pageNum） | ✅ 推荐 | 业务监控 |
| 密码 | ❌ 禁止 | 安全风险 |
| Token完整值 | ❌ 禁止 | 安全风险（截断显示） |
| 手机号完整 | ❌ 禁止 | 个人隐私（脱敏显示） |
| 身份证号完整 | ❌ 禁止 | 个人隐私（脱敏显示） |
| 大对象内容 | ❌ 禁止 | 性能影响（记录ID） |
| 长JSON内容 | ❌ 禁止 | 性能影响（记录长度） |

### 6.6 禁止行为速查

| 类别 | 禁止项 | 正确做法 |
|---|---|---|
| Logger定义 | `System.out.println()` | `@Slf4j` + `log.xxx()` |
| | `e.printStackTrace()` | `log.error(..., e)` |
| | 手动创建 Logger | `@Slf4j` |
| 日志级别 | 关键业务用 `DEBUG` | 使用 `INFO` |
| | 异常用 `DEBUG` | 使用 `ERROR` |
| | 幂等用 `ERROR` | 使用 `WARN` |
| | 循环用 `INFO` | 使用 `DEBUG` 或汇总 |
| 日志格式 | `+` 号拼接 | 占位符 `{}` |
| | 无操作描述 | 添加描述 + 冒号 |
| | 中英文混杂 | 统一中文 |
| 异常日志 | 仅 `e.getMessage()` | 包含堆栈 `e` |
| | 异常不在最后 | 异常放最后 |
| | 用 `INFO` 记录异常 | 使用 `ERROR` |
| 敏感信息 | 记录密码 | 不记录 |
| | 记录完整Token | 截断显示 |
| | 记录完整手机号 | 脱敏显示 |
| 性能相关 | 循环内 `INFO`/`ERROR` | `DEBUG` 或汇总 |
| | 记录大对象 | 记录关键ID |
| | 高频接口 `DEBUG` | 仅关键信息 |

---

## 七、附录：常用脱敏函数

```java
/**
 * 日志脱敏工具类
 * 
 * 用法示例：
 * log.info("发送短信: phone={}", LogMaskUtils.maskPhone(phone));
 * log.info("生成Token: accessToken={}", LogMaskUtils.maskToken(token));
 */
public final class LogMaskUtils {

    private LogMaskUtils() {}

    /**
     * 脱敏 Token，保留前8位
     */
    public static String maskToken(String token) {
        if (token == null || token.isEmpty()) {
            return "";
        }
        if (token.length() <= 8) {
            return "***";
        }
        return token.substring(0, 8) + "...";
    }

    /**
     * 脱敏手机号，保留前3后4
     */
    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return "***";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    /**
     * 脱敏身份证号，保留前3后4
     */
    public static String maskIdCard(String idCard) {
        if (idCard == null || idCard.length() < 7) {
            return "***";
        }
        int len = idCard.length();
        return idCard.substring(0, 3) + "***********" + idCard.substring(len - 4);
    }

    /**
     * 脱敏邮箱，保留首字母和域名
     */
    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        int atIndex = email.indexOf("@");
        if (atIndex <= 1) {
            return "***" + email.substring(atIndex);
        }
        return email.substring(0, 1) + "***" + email.substring(atIndex);
    }

    /**
     * 脱敏银行卡号，保留前4后4
     */
    public static String maskBankCard(String cardNo) {
        if (cardNo == null || cardNo.length() < 8) {
            return "***";
        }
        int len = cardNo.length();
        return cardNo.substring(0, 4) + "********" + cardNo.substring(len - 4);
    }

    /**
     * 密码脱敏（完全隐藏）
     */
    public static String maskPassword() {
        return "******";
    }

    /**
     * 密钥脱敏（完全隐藏）
     */
    public static String maskSecret() {
        return "******";
    }
}
```