# 配置规范

## 一、配置前缀命名规范

### 1.1 前缀命名规则

**统一格式**: `nebula.{模块名}` 或 `nebula.{能力名}`

| 配置类型 | 前缀格式 | 示例 |
|---|---|---|
| **业务模块核心配置** | `nebula.{模块名}` | `nebula.auth`, `nebula.storage`, `nebula.notify` |
| **业务模块 remote 配置** | `nebula.{模块名}.remote` | `nebula.auth.remote`, `nebula.storage.remote` |
| **基础设施配置** | `nebula.{能力名}` | `nebula.web`, `nebula.cache`, `nebula.mybatis` |

### 1.2 已定义的配置前缀

| 模块 | 核心配置前缀 | Remote 配置前缀 |
|---|---|---|
| `auth` | `nebula.auth` | `nebula.auth.remote` |
| `storage` | `nebula.storage` | `nebula.storage.remote` |
| `notify` | `nebula.notify` | `nebula.notify.remote` |
| `scheduler` | `nebula.scheduler` | `nebula.scheduler.remote` |
| `param` | `nebula.param` | `nebula.param.remote` |
| `dict` | `nebula.dict` | `nebula.dict.remote` |
| `frontend` | `nebula.frontend` | `nebula.frontend.remote` |
| `event` | `nebula.event` | `nebula.event.rocketmq` |
| `gateway` | `nebula.gateway` | - |

| 基础设施 | 配置前缀 |
|---|---|
| Web | `nebula.web` |
| Cache | `nebula.cache` |
| MyBatis | `nebula.mybatis` |
| ThreadPool | `nebula.threadpool` |
| Cloud/Feign | `nebula.cloud`, `nebula.cloud.feign` |
| Architecture | `nebula.architecture` |

### 1.3 配置层级结构

```yaml
nebula:
  architecture:          # 全局架构配置
    mode: local
  auth:                  # auth 模块配置
    mode: local
    remote:              # auth remote 子配置
      service-url: http://localhost:9900
    token:               # auth 子配置
      access-token-expire: 7200
  storage:
    mode: local
    remote:
      service-url: http://localhost:9905
```

---

## 二、配置类设计规范

### 2.1 配置类命名

- **命名格式**: `{Module}Properties` 或 `Nebula{Module}Properties`
- **位置**: `config` 包下（core 或 remote 模块）

```
// ✅ 正确
AuthProperties, NebulaStorageProperties, NebulaWebProperties

// ❌ 错误
AuthConfig, StorageSettings, NebulaAuthConfiguration
```

### 2.2 配置类结构

```java
@Data
@ConfigurationProperties(prefix = "nebula.auth")
public class AuthProperties {

    /**
     * 认证模式：local（本地）或 remote（远程）
     */
    private String mode = "local";  // 字段直接赋默认值

    /**
     * 排除路径列表（无需认证）
     */
    private List<String> excludedPaths = new ArrayList<>();

    /**
     * Token 配置
     */
    private Token token = new Token();  // 嵌套对象 new 初始化

    @Data
    public static class Token {
        /**
         * Access Token 过期时间（秒）
         */
        private Long accessTokenExpire = 7200L;

        /**
         * Token 请求头名称
         */
        private String header = "Authorization";

        /**
         * 签名密钥
         */
        private String secretKey = "default-secret-key";
    }
}
```

### 2.3 默认值设置规范

**原则**：确保用户零配置也能正确使用。

| 类型 | 默认值设置方式 | 示例 |
|---|---|---|
| **字符串** | 字段赋值 | `private String mode = "local";` |
| **数值** | 字段赋值 | `private Long accessTokenExpire = 7200L;` |
| **布尔** | 字段赋值 | `private Boolean enableResultAdvice = true;` |
| **集合** | `new` 初始化 | `private List<String> excludedPaths = new ArrayList<>();` |
| **Map** | `new` 初始化 | `private Map<String, String> apps = new LinkedHashMap<>();` |
| **嵌套对象** | `new` 初始化 | `private Token token = new Token();` |
| **枚举** | 枚举常量赋值 | `private ArchitectureMode mode = ArchitectureMode.LOCAL;` |

```
// ✅ 正确 - 所有字段都有默认值
@Data
@ConfigurationProperties(prefix = "nebula.cache")
public class NebulaCacheProperties {
    private String type = "caffeine";
    private Integer defaultTtl = 300;
    private CaffeineConfig caffeine = new CaffeineConfig();
}

// ❌ 错误 - 字段无默认值，用户必须配置
@Data
@ConfigurationProperties(prefix = "nebula.cache")
public class NebulaCacheProperties {
    private String type;           // 无默认值，用户不配置则为 null
    private Integer defaultTtl;    // 无默认值，可能导致 NPE
}
```

### 2.4 嵌套配置规范

**规则**：嵌套配置类必须定义为 `public static class`，且字段都有默认值。

```java
@Data
@ConfigurationProperties(prefix = "nebula.storage")
public class NebulaStorageProperties {

    private String tempDir = "build/nebula-storage/temp";

    private ContentConfig content = new ContentConfig();

    private PermanentConfig permanent = new PermanentConfig();

    @Data
    public static class ContentConfig {
        private String type = "filesystem";
        private FilesystemConfig filesystem = new FilesystemConfig();
    }

    @Data
    public static class FilesystemConfig {
        private String baseDir = "build/nebula-storage/files";
    }
}
```

---

## 三、属性注册规范

### 3.1 推荐方式：Bean 方法级别注解

**适用于**：基础设施模块（base-*）、避免 Spring Boot 3 重复 Bean 问题。

```java
@AutoConfiguration
@EnableConfigurationProperties
public class NebulaCacheAutoConfiguration {

    /**
     * 注册缓存配置属性 Bean
     */
    @Bean("nebulaCacheProperties")
    @ConditionalOnMissingBean(name = "nebulaCacheProperties")
    @ConfigurationProperties(prefix = "nebula.cache")
    public NebulaCacheProperties nebulaCacheProperties() {
        return new NebulaCacheProperties();
    }

    // 使用配置属性
    @Bean
    public NebulaCacheService nebulaCacheService(NebulaCacheProperties properties) {
        return new NebulaCacheServiceImpl(properties);
    }
}
```

**优点**：
- Properties 类为纯 POJO，无 Spring 注解污染
- 避免 Spring Boot 3 环境下重复 Bean 注册
- 配合 `@ConditionalOnMissingBean` 允许业务覆盖

### 3.2 替代方式：类级别注解

**适用于**：业务模块（auth、storage 等）。

```java
// Properties 类
@Data
@ConfigurationProperties(prefix = "nebula.auth")
public class AuthProperties {
    // ...
}

// AutoConfiguration 类
@AutoConfiguration
@EnableConfigurationProperties(AuthProperties.class)
public class AuthCoreAutoConfiguration {

    @Bean
    public AuthService authService(AuthProperties properties) {
        return new AuthServiceImpl(properties);
    }
}
```

### 3.3 注册文件配置

Spring Boot 3 使用 `AutoConfiguration.imports` 文件注册：

**路径**: `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`

```
cn.cloudomni.nebula.auth.config.AuthCoreAutoConfiguration
cn.cloudomni.nebula.auth.config.AuthRemoteAutoConfiguration
```

---

## 四、IDE 配置提示规范

### 4.1 依赖配置

在包含 `@ConfigurationProperties` 的模块 `pom.xml` 中添加：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-configuration-processor</artifactId>
    <optional>true</optional>  <!-- 关键：设置为 optional -->
</dependency>
```

**说明**：
- `<optional>true</optional>`：依赖不传递给下游模块
- 编译时生成 `META-INF/spring-configuration-metadata.json`
- IDEA 读取该文件提供配置提示、自动补全、悬停文档

### 4.2 配置提示效果

添加依赖后，IDEA 中：
- 输入 `nebula.` 自动提示所有可用配置项
- 悬停配置项显示文档注释
- 配置项有默认值提示
- 配置值错误时有警告提示

### 4.3 配置元数据生成

编译后生成 `target/classes/META-INF/spring-configuration-metadata.json`：

```json
{
  "groups": [
    {
      "name": "nebula.auth",
      "type": "cn.cloudomni.nebula.auth.config.AuthProperties",
      "sourceType": "cn.cloudomni.nebula.auth.config.AuthProperties"
    },
    {
      "name": "nebula.auth.token",
      "type": "cn.cloudomni.nebula.auth.config.AuthProperties.Token",
      "sourceType": "cn.cloudomni.nebula.auth.config.AuthProperties"
    }
  ],
  "properties": [
    {
      "name": "nebula.auth.mode",
      "type": "java.lang.String",
      "description": "认证模式：local（本地）或 remote（远程）",
      "defaultValue": "local"
    },
    {
      "name": "nebula.auth.token.access-token-expire",
      "type": "java.lang.Long",
      "description": "Access Token 过期时间（秒）",
      "defaultValue": 7200
    }
  ]
}
```

---

## 五、默认配置文件规范

### 5.1 默认配置位置

**nebula-app-starter** 的 `application.yml` 作为单体应用默认配置：

```yaml
# nebula-app-starter/src/main/resources/application.yml
nebula:
  architecture:
    mode: local

  web:
    result-advice-enable: true
    request-body-cache-limit: 1048576
    default-locale: zh-CN

  cache:
    type: caffeine
    default-ttl: 300

  auth:
    mode: local
    excludedPaths:
      - /api/auth/oauth2/**
      - /api/public/**

  storage:
    mode: local
    temp-dir: build/nebula-storage/temp
    content:
      type: filesystem
      filesystem:
        base-dir: build/nebula-storage/files

  event:
    mode: LOCAL
```

### 5.2 独立服务默认配置

每个 `*-service` 模块的 `application.yml` 作为独立服务默认配置：

```yaml
# nebula-auth-service/src/main/resources/application.yml
server:
  port: 9900

nebula:
  auth:
    mode: local
    token:
      access-token-expire: 7200
```

### 5.3 零配置启动原则

**目标**：用户不做任何配置，应用也能正常启动运行。

**实现方式**：
1. Properties 类所有字段设置默认值
2. `nebula-app-starter` 提供完整的默认配置文件
3. Starter 或业务应用在依赖层默认引入 local 模块
4. 基础设施（数据库、Redis）使用内嵌方案或开发友好默认值

```yaml
# 开发环境友好默认值示例
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/nebula?useSSL=false  # 本地数据库
    username: root
    password: root
  data:
    redis:
      host: localhost
      port: 6379
```

---

## 六、敏感配置处理规范

### 6.1 环境变量覆盖

**推荐**：敏感配置使用环境变量覆盖默认值。

```yaml
# application.yml
nebula:
  auth:
    token:
      secret-key: ${AUTH_TOKEN_SECRET_KEY:default-secret-key}  # 环境变量优先
    oauth2:
      enabled: ${AUTH_OAUTH2_ENABLED:true}
      register-allowed: ${AUTH_OAUTH2_REGISTER_ALLOWED:true}

spring:
  datasource:
    url: ${DB_URL:jdbc:mysql://localhost:3306/nebula}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:root}  # 生产环境必须通过环境变量覆盖
```

### 6.2 禁止硬编码敏感值

```java
// ❌ 错误 - 硬编码敏感密钥
private String secretKey = "my-super-secret-key-12345";

// ✅ 正确 - 使用环境变量或占位符
private String secretKey = "${AUTH_TOKEN_SECRET_KEY:default-dev-key}";
```

### 6.3 配置文件加密（生产环境）

生产环境建议使用 Jasypt 等工具加密敏感配置：

```yaml
# 加密配置示例
spring:
  datasource:
    password: ENC(encrypted-password-here)

jasypt:
  encryptor:
    password: ${JASYPT_ENCRYPTOR_PASSWORD}
```

---

## 七、配置项文档规范

### 7.1 字段注释要求

每个配置字段必须有 Javadoc 注释，说明含义、单位、默认值：

```java
@Data
@ConfigurationProperties(prefix = "nebula.auth")
public class AuthProperties {

    /**
     * 认证模式。
     * <p>可选值：
     * <ul>
     *   <li>local - 本地模式，Controller + Service 同进程</li>
     *   <li>remote - 远程模式，通过 Feign 调用独立服务</li>
     * </ul>
     * <p>默认值：local
     */
    private String mode = "local";

    /**
     * Access Token 过期时间（秒）。
     * <p>默认值：7200（2小时）
     */
    private Long accessTokenExpire = 7200L;
}
```

### 7.2 README 配置说明

每个模块 README 中应包含配置说明章节：

```markdown
## 配置说明

| 配置项 | 说明 | 默认值 |
|---|---|---|
| `nebula.auth.mode` | 认证模式 | `local` |
| `nebula.auth.token.access-token-expire` | Token 过期时间（秒） | `7200` |
| `nebula.auth.token.secret-key` | 签名密钥 | 需配置 |
```

---

## 八、配置校验规范

### 8.1 启动时校验

关键配置在 AutoConfiguration 中校验：

```java
@AutoConfiguration
@EnableConfigurationProperties(AuthProperties.class)
public class AuthCoreAutoConfiguration {

    @Bean
    public AuthService authService(AuthProperties properties) {
        // 启动时校验关键配置
        if (properties.getToken().getSecretKey() == null 
            || properties.getToken().getSecretKey().isEmpty()) {
            throw new IllegalStateException("nebula.auth.token.secret-key 未配置");
        }
        return new AuthServiceImpl(properties);
    }
}
```

### 8.2 JSR-303 校验（可选）

使用 `@Validated` + JSR-303 注解校验：

```java
@Validated
@Data
@ConfigurationProperties(prefix = "nebula.auth")
public class AuthProperties {

    @NotBlank(message = "认证模式不能为空")
    private String mode = "local";

    @Positive(message = "Token 过期时间必须为正数")
    private Long accessTokenExpire = 7200L;
}
```

---

## 九、禁止行为

### 9.1 命名禁止

- ❌ 使用非标准前缀（如 `app.xxx` 应为 `nebula.xxx`）
- ❌ 配置类命名为 `*Config` 或 `*Settings`（应为 `*Properties`）
- ❌ 嵌套配置类非 `static`（应为 `public static class`）

### 9.2 默认值禁止

- ❌ 字段无默认值（用户必须配置才能使用）
- ❌ 嵌套对象字段为 `null`（应 `new` 初始化）
- ❌ 硬编码敏感配置值（密码、密钥等）
- ❌ 使用 `@DefaultValue` 注解（项目统一使用字段赋值）

### 9.3 注册禁止

- ❌ Properties 类不加 `@ConfigurationProperties` 却期望生效
- ❌ AutoConfiguration 不注册 Properties Bean
- ❌ 缺少 `spring-boot-configuration-processor` 依赖（无 IDE 提示）
- ❌ 未在 `AutoConfiguration.imports` 文件中注册 AutoConfiguration

### 9.4 配置文件禁止

- ❌ 默认配置文件缺少关键配置项
- ❌ 配置文件中使用硬编码密码/密钥
- ❌ 配置层级混乱（如 `nebula.auth.token.expire` 应为 `nebula.auth.token.access-token-expire`）

---

## 十、速查表

### 10.1 配置类模板

```java
@Data
@ConfigurationProperties(prefix = "nebula.{module}")
public class {Module}Properties {

    /** 模块模式：local 或 remote */
    private String mode = "local";

    /** 子配置 */
    private SubConfig sub = new SubConfig();

    @Data
    public static class SubConfig {
        /** 配置项说明 */
        private String item = "default-value";
    }
}
```

### 10.2 AutoConfiguration 模板

```java
@AutoConfiguration
@EnableConfigurationProperties({Module}Properties.class)
public class {Module}AutoConfiguration {

    @Bean
    public {Module}Service {module}Service({Module}Properties properties) {
        return new {Module}ServiceImpl(properties);
    }
}
```

### 10.3 pom.xml 依赖模板

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-configuration-processor</artifactId>
    <optional>true</optional>
</dependency>
```

### 10.4 配置前缀速查

| 模块 | 前缀 |
|---|---|
| auth | `nebula.auth` / `nebula.auth.remote` |
| storage | `nebula.storage` / `nebula.storage.remote` |
| notify | `nebula.notify` / `nebula.notify.remote` |
| event | `nebula.event` / `nebula.event.rocketmq` |
| web | `nebula.web` |
| cache | `nebula.cache` |
| mybatis | `nebula.mybatis` |
| gateway | `nebula.gateway` |
| architecture | `nebula.architecture` |
