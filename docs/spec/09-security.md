# 安全规范

## 一、认证安全

### 1.1 密码存储

Nebula 采用 **BCrypt 加密算法**存储密码，不支持明文存储或其他弱加密方式。

**配置项**：
| 配置项 | 默认值 | 说明 | 约束 |
|---|---|---|---|
| `nebula.auth.password.salt-length` | `8` | BCrypt 盐值长度 | 最小 4，最大 31 |

**密码加密流程**：

```java
// ✅ 正确 - 使用 BCryptPasswordEncoder 加密
@Bean
public BCryptPasswordEncoder passwordEncoder() {
    int strength = authProperties.getPassword().getSaltLength();
    strength = Math.max(4, Math.min(31, strength)); // 强制范围约束
    return new BCryptPasswordEncoder(strength);
}

// 用户注册时加密密码
user.setPassword(passwordEncoder.encode(command.getPassword()));

// 用户登录时校验密码
if (!passwordEncoder.matches(password, user.getPassword())) {
    throw new BusinessException(AuthErrorInfo.INVALID_CREDENTIALS);
}
```

```
// ❌ 错误 - 使用明文存储
user.setPassword(command.getPassword());

// ❌ 错误 - 使用 MD5/SHA1 等弱加密
user.setPassword(DigestUtils.md5Hex(command.getPassword()));

// ❌ 错误 - 使用固定盐值
user.setPassword("fixed_salt_" + command.getPassword());
```

**密码强度校验**：

密码长度必须符合系统配置：

| 配置项 | 说明 | 示例 |
|---|---|---|
| `usernamePasswordMinLength` | 最小长度 | 6 |
| `usernamePasswordMaxLength` | 最大长度 | 20 |

```java
// ✅ 正确 - 注册时校验密码长度
private void validateUsernamePasswordLength(String password) {
    int minLength = authLoginConfigSupport.getUsernamePasswordMinLength();
    int maxLength = authLoginConfigSupport.getUsernamePasswordMaxLength();
    int actualLength = password != null ? password.length() : 0;
    if (actualLength < minLength || actualLength > maxLength) {
        throw new BusinessException(AuthErrorInfo.PASSWORD_LENGTH_INVALID);
    }
}
```

---

### 1.2 Token 管理

Nebula 采用 **UUID-based 不透明令牌（Opaque Token）**，而非 JWT 自描述令牌。

**令牌类型**：

| 类型 | 前缀 | 长度 | 用途 |
|---|---|---|---|
| Access Token | 无 | 36 位 UUID | 接口访问凭证 |
| Refresh Token | `rt_` | 39 位 | 刷新访问令牌 |

**令牌生成规则**：

```java
// ✅ 正确 - 使用 UUID 生成不透明令牌
public static String generateAccessToken() {
    return UUID.randomUUID().toString();
}

public static String generateRefreshToken() {
    return "rt_" + UUID.randomUUID().toString();
}
```

**令牌有效期配置**：

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `nebula.auth.token.access-token-expire` | `7200` (2小时) | Access Token 有效期（秒） |
| `nebula.auth.token.refresh-token-expire` | `604800` (7天) | Refresh Token 有效期（秒） |
| `nebula.auth.token.header` | `Authorization` | Token 请求头名称 |

**令牌请求格式**：

```
Authorization: Bearer <access_token>

// ✅ 正确示例
Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000

// ❌ 错误 - 缺少 Bearer 前缀
Authorization: 550e8400-e29b-41d4-a716-446655440000

// ❌ 错误 - 使用 JWT 格式
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**令牌刷新流程**：

```java
// ✅ 正确 - 刷新令牌标准流程
public LoginResultDto refreshToken(String refreshToken) {
    // 1. 校验 refresh token 有效性
    UserContextDto existingSession = userCacheService.get(refreshToken);
    if (existingSession == null) {
        throw new BusinessException(AuthErrorInfo.UNAUTHORIZED);
    }
    
    // 2. 校验用户状态（是否被禁用）
    UserEntity user = userDAO.getById(existingSession.getId());
    if (user == null || user.getStatus() == 0) {
        throw new BusinessException(AuthErrorInfo.ACCOUNT_DISABLED);
    }
    
    // 3. 生成新令牌对
    String newAccessToken = AccessTokenGenerator.generateAccessToken();
    String newRefreshToken = AccessTokenGenerator.generateRefreshToken();
    
    // 4. 缓存新令牌，删除旧令牌
    UserContextDto userContext = buildUserContext(user);
    userCacheService.set(newAccessToken, userContext);
    userCacheService.set(newRefreshToken, userContext);
    userCacheService.delete(refreshToken);
    
    // 5. 返回新令牌对
    return buildLoginResult(newAccessToken, newRefreshToken);
}
```

**令牌撤销机制**：

```java
// ✅ 正确 - 登出时撤销令牌家族
public void logout(String cacheKey, String userId) {
    if (StringUtils.hasText(cacheKey)) {
        int revokedCount = userCacheService.deleteSessionFamily(cacheKey);
        log.info("用户会话家族已清除: accessToken={}, revokedCount={}", cacheKey, revokedCount);
    }
}

// ✅ 正确 - 撤销同一 accessToken 关联的所有会话
public int deleteSessionFamily(String cacheKey) {
    UserContextDto currentSession = get(cacheKey);
    if (currentSession == null) {
        return 0;
    }
    String currentAccessToken = currentSession.getAccessToken();
    List<String> sessionKeys = listEntries().stream()
        .filter(entry -> entry.value() instanceof UserContextDto userContext
            && currentSession.getId().equals(userContext.getId())
            && currentAccessToken.equals(userContext.getAccessToken()))
        .map(CacheEntryDescriptor::key)
        .toList();
    sessionKeys.forEach(this::delete);
    return sessionKeys.size();
}
```

---

### 1.3 登录安全防护

#### 1.3.1 账号锁定机制

Nebula 支持登录失败次数限制，超过阈值后自动锁定账号。

**配置项**：

| 配置项 | 说明 | 示例 |
|---|---|---|
| `usernameLoginFailMaxCount` | 最大失败次数 | 5 |
| `usernameLockTimeHours` | 锁定时长（小时） | 1 |

```java
// ✅ 正确 - 登录前检查锁定状态
private void validateUsernameLoginLockState(String username) {
    int maxFailCount = authLoginConfigSupport.getUsernameLoginFailMaxCount();
    if (maxFailCount <= 0) {
        return; // 未配置锁定策略，跳过
    }
    if (loginAttemptCacheService.isLocked(username)) {
        throw new BusinessException(AuthErrorInfo.ACCOUNT_LOCKED.getCode(), 
            buildLockedMessage(username));
    }
}

// ✅ 正确 - 登录失败记录
private void recordLoginFailure(String username) {
    int maxFailCount = authLoginConfigSupport.getUsernameLoginFailMaxCount();
    if (maxFailCount <= 0) {
        return;
    }
    loginAttemptCacheService.recordFailure(username, maxFailCount, 
        authLoginConfigSupport.getUsernameLockTimeHours());
}

// ✅ 正确 - 登录成功后清除失败记录
loginAttemptCacheService.clearFailureState(username);
```

```
// ❌ 错误 - 登录失败后未记录
if (!passwordEncoder.matches(password, user.getPassword())) {
    throw new BusinessException(AuthErrorInfo.INVALID_CREDENTIALS);
    // 缺少 recordLoginFailure(username) 调用
}

// ❌ 错误 - 登录成功后未清除失败记录
loginAttemptCacheService.clearFailureState(username);  // 缺少这行
```

#### 1.3.2 密码校验错误统一

无论用户是否存在，密码错误都返回统一错误信息，避免账号枚举攻击：

```java
// ✅ 正确 - 统一返回"用户名或密码错误"
UserEntity user = userDAO.getOneByUsername(username);
if (user == null) {
    log.warn("用户不存在: username={}", username);
    recordLoginFailure(username);
    throw new BusinessException(AuthErrorInfo.INVALID_CREDENTIALS);
}

if (!passwordEncoder.matches(password, user.getPassword())) {
    log.warn("密码错误: username={}", username);
    recordLoginFailure(username);
    throw new BusinessException(AuthErrorInfo.INVALID_CREDENTIALS);
}
```

```
// ❌ 错误 - 区分"用户不存在"和"密码错误"
if (user == null) {
    throw new BusinessException("用户不存在");  // 暴露账号信息
}
if (!passwordEncoder.matches(password, user.getPassword())) {
    throw new BusinessException("密码错误");  // 暴露账号存在
}
```

---

### 1.4 OAuth2 安全

#### 1.4.1 OAuth2 客户端管理

OAuth2 客户端密钥采用 BCrypt 加密存储：

```java
// OAuth2ClientEntity 数据结构
@Schema(description = "客户端密钥 (BCrypt加密)")
private String clientSecret;

// ✅ 正确 - 创建客户端时密钥需要加密
OAuth2ClientEntity client = new OAuth2ClientEntity();
client.setClientId(command.getClientId());
client.setClientSecret(passwordEncoder.encode(command.getClientSecret()));
```

**OAuth2 客户端字段规范**：

| 字段 | 类型 | 说明 | 安全要求 |
|---|---|---|---|
| `clientId` | `VARCHAR(100)` | 客户端标识 | 唯一，不可修改 |
| `clientSecret` | `VARCHAR(255)` | 客户端密钥 | BCrypt 加密存储 |
| `grantTypes` | `VARCHAR(500)` | 授权类型 | 必须，逗号分隔 |
| `scopes` | `VARCHAR(500)` | 授权范围 | 必须，逗号分隔 |
| `redirectUris` | `TEXT` | 重定向地址 | 必须，换行分隔 |
| `accessTokenValidity` | `INT` | Access Token 有效期（秒） | 必须，默认 7200 |
| `refreshTokenValidity` | `INT` | Refresh Token 有效期（秒） | 必须，默认 604800 |
| `status` | `SMALLINT` | 状态 | 0-禁用，1-启用 |

#### 1.4.2 OAuth2 提供商配置

Nebula 支持多种 OAuth2 提供商，配置要求：

**配置项结构**：

```yaml
nebula:
  auth:
    oauth2:
      enabled: true                      # OAuth2 总开关
      register-allowed: true             # 允许 OAuth2 注册
      default-role-id: xxx               # 新用户默认角色
      default-org-id: xxx                # 新用户默认组织
      github:
        enabled: true
        client-id: github-client-id
        client-secret: xxx               # 加密存储或环境变量
        redirect-uri: https://example.com/api/auth/github/callback
```

**State 参数防 CSRF**：

```java
// ✅ 正确 - OAuth2 登录使用 state 参数防 CSRF
String state = UUID.randomUUID().toString().replace("-", "");
oauth2BindStateCacheService.create(state, userId, providerId);
String authorizeUrl = UriComponentsBuilder.fromHttpUrl(provider.getAuthorizeUrl())
    .queryParam("appid", provider.getAppId())
    .queryParam("redirect_uri", provider.getRedirectUri())
    .queryParam("response_type", "code")
    .queryParam("scope", provider.getScope())
    .queryParam("state", state)
    .build(true)
    .toUriString();

// ✅ 正确 - 回调时校验 state
var stateValue = oauth2LoginStateCacheService.getByState(state);
if (stateValue == null) {
    throw new BusinessException(AuthErrorInfo.INVALID_CREDENTIALS.getCode(), 
        "OAuth2登录状态已失效或无效");
}
oauth2LoginStateCacheService.delete(state);
```

---

## 二、权限校验约定

### 2.1 权限模型

Nebula 采用 **RBAC + ABAC 混合模型**，支持三级主体授权：

**主体类型**：

| 类型 | 常量 | 说明 | 适用场景 |
|---|---|---|---|
| USER | `SUBJECT_TYPE_USER` | 用户直接授权 | 特殊用户单独授权 |
| ROLE | `SUBJECT_TYPE_ROLE` | 角色授权 | 按角色批量授权 |
| ORG | `SUBJECT_TYPE_ORG` | 组织授权 | 按组织批量授权 |

**资源类型**：

| 类型 | 常量 | 说明 |
|---|---|---|
| MENU | `RESOURCE_TYPE_MENU` | 菜单资源 |
| BUTTON | `RESOURCE_TYPE_BUTTON` | 按钮资源 |
| Wildcard | `RESOURCE_TYPE_WILDCARD` | 通配资源（`*`） |

**权限效果**：

| 效果 | 常量 | 说明 |
|---|---|---|
| Allow | `EFFECT_ALLOW` | 允许访问 |
| Deny | `EFFECT_DENY` | 拒绝访问 |

**权限编码格式**：

```
权限编码 = resourceType:resourceCode:effect

// 示例
MENU:user-management:Allow    // 允许访问用户管理菜单
BUTTON:user-create:Allow      // 允许使用创建用户按钮
*:*:*                         // 全部权限（超级管理员）
```

---

### 2.2 权限查询与聚合

权限查询遵循 **用户 -> 角色 -> 组织** 三级聚合：

```java
// ✅ 正确 - 权限聚合查询
public List<String> listPermissionCodesByUserId(String userId, 
    List<String> roleIds, List<String> orgIds) {
    List<PermissionEntity> allPermissions = new ArrayList<>();
    
    // 1. 查询用户直接权限
    if (userId != null) {
        LambdaQueryWrapper<PermissionEntity> userWrapper = new LambdaQueryWrapper<>();
        userWrapper.eq(PermissionEntity::getSubjectType, USER.getValue());
        userWrapper.eq(PermissionEntity::getSubjectId, userId);
        allPermissions.addAll(list(userWrapper));
    }
    
    // 2. 查询角色权限
    if (roleIds != null && !roleIds.isEmpty()) {
        LambdaQueryWrapper<PermissionEntity> roleWrapper = new LambdaQueryWrapper<>();
        roleWrapper.eq(PermissionEntity::getSubjectType, ROLE.getValue());
        roleWrapper.in(PermissionEntity::getSubjectId, roleIds);
        allPermissions.addAll(list(roleWrapper));
    }
    
    // 3. 查询组织权限
    if (orgIds != null && !orgIds.isEmpty()) {
        LambdaQueryWrapper<PermissionEntity> orgWrapper = new LambdaQueryWrapper<>();
        orgWrapper.eq(PermissionEntity::getSubjectType, ORG.getValue());
        orgWrapper.in(PermissionEntity::getSubjectId, orgIds);
        allPermissions.addAll(list(orgWrapper));
    }
    
    // 4. 转换为权限编码，去重
    return allPermissions.stream()
        .map(this::toPermissionCode)
        .distinct()
        .toList();
}
```

**权限编码转换**：

```java
// ✅ 正确 - 权限编码转换规则
private String toPermissionCode(PermissionEntity permission) {
    // 全部权限特殊处理
    if (PermissionConstants.RESOURCE_TYPE_WILDCARD.equals(permission.getResourceType())
            && PermissionConstants.WILDCARD.equals(permission.getResourceId())) {
        return PermissionConstants.FULL_PERMISSION_CODE; // "*:*:*"
    }
    // 普通权限编码
    return permission.getResourceType() + ":" 
        + resolveResourceCode(permission) + ":" 
        + permission.getEffect();
}

// ✅ 正确 - 资源编码解析（Menu/Button）
private String resolveResourceCode(PermissionEntity permission) {
    if (PermissionConstants.RESOURCE_TYPE_MENU.equalsIgnoreCase(permission.getResourceType())) {
        MenuEntity menu = menuDAO.getById(permission.getResourceId());
        if (menu != null && StringUtils.hasText(menu.getCode())) {
            return menu.getCode();
        }
    }
    if (PermissionConstants.RESOURCE_TYPE_BUTTON.equalsIgnoreCase(permission.getResourceType())) {
        ButtonEntity button = buttonDAO.getById(permission.getResourceId());
        if (button != null && StringUtils.hasText(button.getCode())) {
            return button.getCode();
        }
    }
    return permission.getResourceId();
}
```

---

### 2.3 API 权限校验

#### 2.3.1 Spring Security 权限注解

Nebula 支持 Spring Security 的 `@PreAuthorize` 注解进行接口权限控制：

```java
// ✅ 正确 - 使用权限编码校验
@PostMapping("/online-users/page")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('" + PermissionConstants.FULL_PERMISSION_CODE + "')")
public ApiResult<PageResp<OnlineUserResp>> pageOnlineUsers(@RequestBody OnlineUserPageReq req) {
    // ...
}

// ✅ 正确 - 使用角色校验
@PostMapping("/users/create")
@PreAuthorize("hasRole('ADMIN')")
public ApiResult<UserDetailResp> createUser(@RequestBody CreateUserReq req) {
    // ...
}

// ✅ 正确 - 组合条件校验
@PostMapping("/sensitive-data")
@PreAuthorize("hasRole('ADMIN') and hasAuthority('data:read:Allow')")
public ApiResult<SensitiveDataResp> getSensitiveData() {
    // ...
}
```

```
// ❌ 错误 - 空注解（无权限控制）
@PostMapping("/users/delete")
public ApiResult<Void> deleteUser(@PathVariable String id) {
    // 缺少权限校验，任何人都可以删除用户
}

// ❌ 错误 - 使用硬编码字符串
@PreAuthorize("hasAuthority('user:delete')")
// 应使用常量：PermissionConstants.FULL_PERMISSION_CODE

// ❌ 错误 - 业务逻辑中硬编码角色
if ("ADMIN".equals(user.getRoleCode())) {
    // ...
}
// 应使用 Spring Security 权限注解或权限编码列表判断
```

#### 2.3.2 权限编码校验

业务逻辑中可通过权限编码列表判断：

```java
// ✅ 正确 - 通过权限编码列表判断
List<String> permissions = userContext.getPermissionCodeList();
if (permissions.contains(PermissionConstants.FULL_PERMISSION_CODE)) {
    // 超级管理员，拥有全部权限
}
if (permissions.contains("MENU:user-management:Allow")) {
    // 有用户管理菜单权限
}
```

---

### 2.4 权限变更同步

权限变更后需要及时同步到用户会话：

**权限更新时间戳机制**：

```java
// ✅ 正确 - 权限变更时更新时间戳
public void updatePermission(UpdatePermissionCommand command) {
    // ... 更新权限逻辑
    // 触发 UserPermissionChangedEvent
    eventPublisher.publish(new UserPermissionChangedEvent(userId));
}

// ✅ 正确 - 事件处理器更新用户时间戳
@EventHandler
public void handle(UserPermissionChangedEvent event) {
    UserEntity user = userDAO.getById(event.getUserId());
    user.setPermissionUpdatedAt(System.currentTimeMillis());
    userDAO.updateById(user);
}

// ✅ 正确 - Token Filter 校验权限新鲜度
private UserContextDto validateAndRefreshUserSnapshot(String token, 
    UserContextDto sessionUser) {
    long sessionPermissionUpdatedAt = sessionUser.getPermissionUpdatedAt() != null 
        ? sessionUser.getPermissionUpdatedAt() : 0L;
    
    // 查询数据库中的最新权限时间戳
    Long cachedPermTs = dynamicCacheService.get(
        SessionCacheNames.AUTH_USER_PERM_TS, userId, Long.class);
    
    if (cachedPermTs != null && cachedPermTs <= sessionPermissionUpdatedAt) {
        return sessionUser; // 权限未变更，继续使用缓存
    }
    
    UserEntity dbUser = userDAO.getById(userId);
    long dbPermissionUpdatedAt = dbUser.getPermissionUpdatedAt() != null 
        ? dbUser.getPermissionUpdatedAt() : sessionPermissionUpdatedAt;
    
    if (dbPermissionUpdatedAt > sessionPermissionUpdatedAt) {
        // 权限已变更，撤销陈旧会话
        int revokedCount = userCacheService.deleteSessionFamily(token);
        log.info("检测到权限时间戳过期，拒绝使用陈旧会话: token={}, revokedSessions={}",
            token, revokedCount);
        return null;
    }
    
    return sessionUser;
}
```

---

## 三、敏感数据处理

### 3.1 密码脱敏

**日志脱敏规范**：

```java
// ✅ 正确 - 日志不记录密码明文
log.info("用户登录请求: username={}", command.getUsername());

// ❌ 错误 - 日志记录密码明文
log.info("用户登录请求: username={}, password={}", command.getUsername(), command.getPassword());
```

**响应脱敏规范**：

```java
// ✅ 正确 - 响应不返回密码字段
public class UserDetailResp {
    private String id;
    private String username;
    private String nickname;
    // 不包含 password 字段
}

// ❌ 错误 - 响应返回密码字段
public class UserDetailResp {
    private String password;  // 禁止返回密码
}
```

---

### 3.2 OAuth2 密钥脱敏

**客户端密钥存储脱敏**：

```java
// ✅ 正确 - clientSecret 使用 BCrypt 加密存储
OAuth2ClientEntity client = new OAuth2ClientEntity();
client.setClientSecret(passwordEncoder.encode(command.getClientSecret()));

// ✅ 正确 - 详情接口不返回 clientSecret
public OAuth2ClientDetailDto convertToDTO(OAuth2ClientEntity client) {
    OAuth2ClientDetailDto dto = new OAuth2ClientDetailDto();
    dto.setClientId(client.getClientId());
    dto.setClientName(client.getClientName());
    // 不返回 clientSecret
    return dto;
}
```

```
// ❌ 错误 - 返回 clientSecret 明文
dto.setClientSecret(client.getClientSecret());

// ❌ 错误 - 创建时未加密存储
client.setClientSecret(command.getClientSecret());
```

**配置文件敏感信息保护**：

```yaml
# ✅ 正确 - 使用环境变量存储敏感配置
nebula:
  auth:
    oauth2:
      github:
        client-secret: ${GITHUB_CLIENT_SECRET}

# ❌ 错误 - 配置文件直接写敏感信息
nebula:
  auth:
    oauth2:
      github:
        client-secret: abc123def456  # 明文存储
```

---

### 3.3 用户敏感信息脱敏

**手机号/邮箱脱敏**（建议实现）：

```java
// ✅ 正确 - 手机号脱敏展示
public String maskPhone(String phone) {
    if (phone == null || phone.length() < 7) {
        return phone;
    }
    return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
}

// ✅ 正确 - 邮箱脱敏展示
public String maskEmail(String email) {
    if (email == null || !email.contains("@")) {
        return email;
    }
    int atIndex = email.indexOf("@");
    if (atIndex <= 2) {
        return email;
    }
    return email.substring(0, 2) + "***" + email.substring(atIndex);
}
```

---

## 四、安全过滤链

### 4.1 双链式安全配置

Nebula 采用双 SecurityFilterChain 配置，分离公开接口和受保护接口：

**公开接口链（Order=1）**：

```java
@Bean
@Order(1)
public SecurityFilterChain publicSecurityFilterChain(HttpSecurity http,
    RequestMatcher authExclusionRequestMatcher) throws Exception {
    http
        .securityMatcher(authExclusionRequestMatcher)
        .csrf(csrf -> csrf.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
    return http.build();
}
```

**受保护接口链（Order=2）**：

```java
@Bean
@Order(2)
public SecurityFilterChain protectedSecurityFilterChain(HttpSecurity http,
    OpaqueTokenAuthenticationFilter opaqueTokenAuthenticationFilter) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
        .addFilterBefore(opaqueTokenAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
}
```

---

### 4.2 白名单接口

**固定白名单**：

| 接口 | 说明 |
|---|---|
| `/api/auth/get-auth-config` | 认证配置获取 |
| `/api/auth/login` | 登录接口 |
| `/api/auth/register` | 注册接口 |
| `/api/auth/refresh` | Token 刷新 |
| `/api/auth/wechat/*` | 微信 OAuth2 相关接口 |
| `/api/frontend/init` | 前端初始化 |
| `/api/storage/download-signed` | 签名下载 |
| `/v3/api-docs/*` | OpenAPI 文档 |
| `/swagger-ui/*` | Swagger UI |
| `/actuator/*` | 监控端点 |
| `/error` | 错误页面 |
| `/health` | 健康检查 |

**追加白名单配置**：

```yaml
nebula:
  auth:
    excludedPaths:
      - /api/public/**
      - /api/anon/**
```

---

### 4.3 Token 认证过滤器

**OpaqueTokenAuthenticationFilter 处理流程**：

```
1. 解析 Authorization Header
   ↓
2. 从缓存查询 UserContextDto
   ↓
3. 校验权限新鲜度（permissionUpdatedAt）
   ↓
4. 校验用户状态（status == 1）
   ↓
5. 构建 OpaqueAuthenticationToken
   ↓
6. 设置 SecurityContext
   ↓
7. 设置 CurrentUserContext
   ↓
8. 继续过滤器链
```

**权限转换规则**：

```java
// ✅ 正确 - 角色添加 ROLE_ 前缀，权限保持原样
private static List<GrantedAuthority> convertToAuthorities(UserContextDto user) {
    List<GrantedAuthority> authorities = new ArrayList<>();
    
    // 角色：加上 ROLE_ 前缀（如：ROLE_ADMIN）
    if (user.getRoleCodeList() != null) {
        user.getRoleCodeList().forEach(roleCode -> 
            authorities.add(() -> "ROLE_" + roleCode));
    }
    
    // 权限：保持原样（如：MENU:user-management:Allow）
    if (user.getPermissionCodeList() != null) {
        user.getPermissionCodeList().forEach(permissionCode -> 
            authorities.add(() -> permissionCode));
    }
    
    return authorities;
}
```

---

## 五、OAuth2 Provider 安全规范

OAuth2 Provider 插件实现需遵守以下安全规则：

| 规则 | 说明 | 违反后果 |
|---|---|---|
| 敏感字段禁止明文存储 | `access_token`、`refresh_token`、`session_key` 不得写入数据库字段或普通日志 | 泄露用户凭证 |
| 外部 API 异必转换 | 调用外部 API 必须捕获网络异常，转换为业务异常 | 暴露内部错误信息 |
| 标识脱敏 | 授权码、openid、unionid 等标识写日志时必须脱敏 | 泄露用户身份 |
| 响应字段校验 | Provider 必须校验外部响应必要字段，例如 `openid` | 处理无效数据 |
| 绑定表唯一约束 | OAuth2 登录绑定表必须依赖 `(provider_id, provider_user_id)` 唯一约束防止重复绑定 | 数据一致性异常 |

**实现示例**：

```java
// ✅ 正确 - 敏感字段不写入 attributes
private String buildAttributes(Map<String, Object> source) {
    Map<String, Object> attributes = new LinkedHashMap<>();
    attributes.put("openId", source.get("openid"));
    attributes.put("unionId", source.get("unionid"));
    attributes.put("scope", source.get("scope"));
    // 不包含 access_token、refresh_token、session_key
    return objectMapper.writeValueAsString(attributes);
}

// ✅ 正确 - 外部 API 异常转换
try {
    ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
    // ...
} catch (RestClientException e) {
    log.error("OAuth2 API 网络异常: {}", e.getMessage());
    throw new OAuth2ProviderException(NETWORK_ERROR, "外部API调用失败", e);
}

// ✅ 正确 - openid 脱敏
private String mask(String value) {
    if (value == null || value.length() < 8) {
        return "***";
    }
    return value.substring(0, 4) + "****" + value.substring(value.length() - 4);
}
log.info("OAuth2 身份解析成功: openid={}", mask(identity.getProviderUserId()));

// ✅ 正确 - 响应字段校验
if (!hasText(body.get("openid"))) {
    throw new OAuth2ProviderException(INVALID_RESPONSE, "响应缺少必要字段");
}
```

```
// ❌ 错误 - 敏感字段写入数据库
attributes.put("access_token", source.get("access_token"));
identity.setProviderAttributes(objectMapper.writeValueAsString(attributes));

// ❌ 错误 - 网络异常未转换
RestClientException 直接抛出，未包装为业务异常

// ❌ 错误 - openid 明文日志
log.info("OAuth2 身份解析成功: openid={}", body.get("openid"));

// ❌ 错误 - 响应未校验
未检查 openid 是否存在，直接使用 body.get("openid")
```

---

## 六、禁止行为

### 6.1 密码安全禁止

- ❌ 使用明文存储密码
- ❌ 使用 MD5/SHA1 等弱加密算法
- ❌ 使用固定盐值加密
- ❌ 在日志中记录密码明文
- ❌ 在响应中返回密码字段
- ❌ 密码长度未校验

### 6.2 Token 安全禁止

- ❌ 使用 JWT 自描述令牌（应使用 UUID opaque token）
- ❌ Token 未设置有效期
- ❌ Refresh Token 未单独管理
- ❌ 登出时未撤销令牌家族
- ❌ Token 前缀使用非标准格式（应使用 `Bearer`）

### 6.3 权限校验禁止

- ❌ 接口无权限注解（应使用 `@PreAuthorize`）
- ❌ 业务逻辑硬编码角色判断
- ❌ 权限变更未同步用户时间戳
- ❌ 使用硬编码字符串校验权限（应使用常量）
- ❌ 超级管理员判断未使用 `FULL_PERMISSION_CODE`

### 6.4 OAuth2 安全禁止

- ❌ OAuth2 客户端密钥明文存储
- ❌ OAuth2 回调未校验 state 参数
- ❌ 配置文件直接写敏感信息（应使用环境变量）
- ❌ OAuth2 详情接口返回 clientSecret

### 6.5 登录安全禁止

- ❌ 登录失败返回不同错误信息（应统一返回"用户名或密码错误"）
- ❌ 登录失败未记录失败次数
- ❌ 登录成功未清除失败记录
- ❌ 账号锁定未配置时长

---

## 七、速查表

### 7.1 Token 配置速查

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `nebula.auth.token.access-token-expire` | `7200` | Access Token 有效期（秒） |
| `nebula.auth.token.refresh-token-expire` | `604800` | Refresh Token 有效期（秒） |
| `nebula.auth.token.header` | `Authorization` | Token 请求头 |
| `nebula.auth.password.salt-length` | `8` | BCrypt 盐值长度（4-31） |

### 7.2 权限编码速查

| 编码格式 | 示例 | 说明 |
|---|---|---|
| `resourceType:resourceCode:effect` | `MENU:user-management:Allow` | 菜单权限 |
| `resourceType:resourceCode:effect` | `BUTTON:user-create:Allow` | 按钮权限 |
| `*:*:*` | `*:*:*` | 全部权限（超级管理员） |

### 7.3 权限注解速查

| 注解用法 | 示例 | 适用场景 |
|---|---|---|
| `hasRole('ADMIN')` | `@PreAuthorize("hasRole('ADMIN')")` | 角色校验 |
| `hasAuthority('code')` | `@PreAuthorize("hasAuthority('MENU:user:Allow')")` | 权限编码校验 |
| `hasRole('ADMIN') or hasAuthority('*:*:*')` | 组合校验 | 管理接口 |

### 7.4 登录安全配置速查

| 配置项 | 说明 | 示例值 |
|---|---|---|
| `usernameLoginFailMaxCount` | 最大失败次数 | `5` |
| `usernameLockTimeHours` | 锁定时长（小时） | `1` |
| `usernamePasswordMinLength` | 密码最小长度 | `6` |
| `usernamePasswordMaxLength` | 密码最大长度 | `20` |

### 7.5 OAuth2 配置速查

| 配置项 | 说明 | 必填 |
|---|---|---|
| `nebula.auth.oauth2.enabled` | OAuth2 总开关 | 是 |
| `nebula.auth.oauth2.register-allowed` | 允许 OAuth2 注册 | 否 |
| `nebula.auth.oauth2.github.enabled` | GitHub 开关 | 是 |
| `nebula.auth.oauth2.github.client-id` | GitHub Client ID | 是 |
| `nebula.auth.oauth2.github.client-secret` | GitHub Client Secret | 是 |

### 7.6 白名单接口速查

| 类型 | 接口 | 说明 |
|---|---|---|
| 固定 | `/api/auth/login` | 登录 |
| 固定 | `/api/auth/register` | 注册 |
| 固定 | `/api/auth/refresh` | Token 刷新 |
| 固定 | `/api/auth/wechat/*` | 微信 OAuth2 |
| 固定 | `/v3/api-docs/*` | API 文档 |
| 配置 | `/api/public/**` | 自定义公开接口 |

### 7.7 权限变更流程速查

```
1. 权限变更操作
   ↓
2. 发布 UserPermissionChangedEvent
   ↓
3. 更新 UserEntity.permissionUpdatedAt
   ↓
4. Token Filter 校验时间戳
   ↓
5. 检测陈旧会话
   ↓
6. 撤销令牌家族
   ↓
7. 用户需重新登录
```

### 7.8 密码校验流程速查

```
1. 检查账号锁定状态
   ↓
2. 查询用户信息
   ↓
3. BCrypt.matches() 校验
   ↓
4. 失败：记录失败次数
   ↓
5. 成功：清除失败记录
   ↓
6. 检查用户状态（status == 1）
   ↓
7. 生成 Token 对
   ↓
8. 缓存 UserContextDto
```

### 7.9 Token 刷新流程速查

```
1. 校验 refresh token 存在
   ↓
2. 查询缓存 UserContextDto
   ↓
3. 校验用户状态
   ↓
4. 生成新 access token
   ↓
5. 生成新 refresh token
   ↓
6. 缓存新 Token 对
   ↓
7. 删除旧 Token 对
   ↓
8. 返回新 Token 信息
```

### 7.10 权限聚合查询速查

| 主体类型 | 查询条件 | 说明 |
|---|---|---|
| USER | `subjectType=USER, subjectId=userId` | 用户直接权限 |
| ROLE | `subjectType=ROLE, subjectId IN roleIds` | 角色权限 |
| ORG | `subjectType=ORG, subjectId IN orgIds` | 组织权限 |
| 聚合结果 | `用户权限 + 角色权限 + 组织权限` | 去重后权限编码列表 |

### 数据范围约定

Nebula 数据范围与功能权限分离：

- `auth_permission.scope` 表示操作范围，例如 `READ`、`WRITE`、`EXPORT`、`ALL`。
- `auth_data_scope.data_scope` 表示数据行范围，例如 `SELF`、`DEPT`、`DEPT_AND_CHILDREN`、`CUSTOM_DEPT`、`ALL`。
- 默认数据范围为 `SELF`，禁止默认 `ALL`。
- 数据范围绑定业务资源类型 `resource_type`，例如 `ORDER`、`CUSTOMER`、`CONTRACT`。
- `CUSTOM_DEPT` 必须配置至少一个组织 ID，并以英文逗号分隔形式存储在 `auth_data_scope.scope_value`。
- v1 不支持 `CUSTOM_USER`。
