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
| Crypto | `nebula.crypto` |
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

### 5.4 对象存储后端与直连下载配置

正式内容存储后端由 `nebula.storage.content.type` 选择，取值来自**依赖里装进来的 provider 模块**：

| type | 提供模块 | 说明 |
|---|---|---|
| `filesystem` | nebula-storage-core（内置） | 本地目录，默认值 |
| `db` | nebula-storage-core（内置） | 内容落 `storage_content` 表 |
| `minio` | nebula-storage-provider-minio | MinIO 原生 SDK |
| `aliyun-oss` | nebula-storage-provider-aliyun-oss | 阿里云 OSS 原生 SDK |
| `tencent-cos` | nebula-storage-provider-tencent-cos | 腾讯云 COS 原生 SDK |

一个厂商一个模块、各用各家原生 SDK，于是「寻址风格」「签名算法」「哪些响应头覆盖受支持」这些厂商差异都在模块内部消化，
配置面上不再有 path-style / vendor 之类的通用开关。新增厂商只加模块，不改核心。

`nebula-app-starter` 默认引入四个对象存储模块；只有被 `type` 选中的那个才建立外部连接，
其余模块的配置项即使为空也不影响启动。`type` 填了未安装的后端会在启动时直接失败，并列出当前已安装的类型。

```yaml
nebula:
  storage:
    content:
      type: aliyun-oss
      aliyun-oss:
        endpoint: ${NEBULA_STORAGE_ALIYUN_OSS_ENDPOINT:}
        access-key: ${NEBULA_STORAGE_ALIYUN_OSS_ACCESS_KEY:}     # 只能来自环境变量
        secret-key: ${NEBULA_STORAGE_ALIYUN_OSS_SECRET_KEY:}
        bucket: ${NEBULA_STORAGE_ALIYUN_OSS_BUCKET:}
        # 桶不存在时是否自动建；多数云厂商的 AK 无建桶权限，生产建议 false
        create-bucket-if-missing: false
        # false（默认）时所有下载经服务端流式转发；true 时登录态下载签发对象存储临时直链
        direct-download-enabled: ${NEBULA_STORAGE_ALIYUN_OSS_DIRECT_DOWNLOAD_ENABLED:false}
        # 直链有效期（秒），上限 3600，超出按上限截断
        direct-download-expire-seconds: ${NEBULA_STORAGE_ALIYUN_OSS_DIRECT_DOWNLOAD_EXPIRE_SECONDS:300}
```

其余后端的键与上面同构，只换厂商段名与必填项：

- `minio`：`endpoint`、`access-key`、`secret-key`、`bucket`。
- `tencent-cos`：额外需要 `region`（如 `ap-guangzhou`）；bucket 必须是 `<桶名>-<APPID>` 形式。
- `aliyun-oss`：只需 `endpoint`，地域由 SDK 从 endpoint 推导，不需要填 region。
- `filesystem` / `db` 的键见 5.1。

约束：

1. 对象存储后端默认**关闭直连**：endpoint 常常只有内网可达，开启是运维显式动作，需先确认 bucket 对客户端可达并配好跨域规则。
2. `filesystem` 与 `db` 后端的内容对客户端不可达，**没有开关能让它们直连**，恒为服务端代理。
3. 内容类型在上传时按对象键扩展名随对象落上，直链不再承担纠正 Content-Type 的职责。
   阿里云 OSS 明确拒绝 `response-content-type` 覆盖（实测返回 400 `InvalidRequest`），`aliyun-oss` 模块因此不发送该参数。
4. 强制下载的 `Content-Disposition` 真名按 RFC 5987 编码（`filename*=UTF-8''...`），中文名不再乱码。
5. 签名分享下载 `/api/storage/download-signed` 恒经服务端代理，以强制下载次数与时效，不受该开关影响。
6. 直链 URL 本身即下载凭据，禁止写入日志、审计快照或错误信息（见 08-logging）。
7. 对象存储凭据只能来自环境变量，禁止写入配置文件、数据库、仓库或日志（见六、敏感配置处理规范）。

### 5.5 下载响应缓存配置

```yaml
nebula:
  storage:
    download:
      # 预览响应给浏览器的私有缓存秒数；0 表示不给缓存头
      preview-max-age-seconds: ${NEBULA_STORAGE_PREVIEW_MAX_AGE_SECONDS:300}
      # 下载位置接口的私有缓存秒数；0 表示不缓存
      location-max-age-seconds: ${NEBULA_STORAGE_LOCATION_MAX_AGE_SECONDS:60}
```

下载接口按「预览」与「下载」两种语义分流，两者不可混用：

| 语义 | 判定 | Content-Disposition | Cache-Control |
|---|---|---|---|
| 预览 | 未传 `filename` | `inline` | `private, max-age=<preview>, must-revalidate` |
| 下载 | 传了 `filename` | `attachment` | `no-store` |

三条硬约束：

1. **预览一律 `private`，不得 `public`。** 文件受 `STORAGE_FILE_QUERY` 权限保护，进共享缓存会把受控内容暴露给中间代理与其他用户。
2. **下载一律 `no-store`。** 带附件名的下载语义是「用户要拿最新的一份」，可缓存会让替换后的同名文件取不到。
3. **签名分享下载 `/api/storage/download-signed` 恒 `no-store`。** 它带次数与时效限制，任何缓存都会让下载计数失真、或让过期凭据继续可用。

预览响应带强 `ETag`（`fileId` + `variant` 组合）与 `Last-Modified`，命中 `If-None-Match` /
`If-Modified-Since` 时返回 304 且**不读取文件内容**。这要求正式文件一经绑定即视为内容不可变：
**替换文件内容必须换新的 `fileId`**，复用旧 `fileId` 覆盖内容会让客户端拿着旧 ETag 取到过期内容。
ETag 必须把 `variant` 拼进去，否则缩略图与原图会共用同一个标识而互相串内容。

`location-max-age-seconds` 必须显著小于对象存储直链有效期（默认 300 秒），否则客户端会反复拿到
已过期的直链。直链模式下 ETag 条件请求不生效（每次签发的 URL 都不同），重复下载的治理交由对象存储侧的
CDN 与客户端缓存策略，不在本配置覆盖范围内。

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
      providers:
        wechat:
          enabled: ${NEBULA_AUTH_WECHAT_ENABLED:false}
          mini:
            app-id: ${NEBULA_AUTH_WECHAT_MINI_APP_ID:}
            app-secret: ${NEBULA_AUTH_WECHAT_MINI_APP_SECRET:}   # 生产环境必须通过环境变量注入
          web:
            app-id: ${NEBULA_AUTH_WECHAT_WEB_APP_ID:}
            app-secret: ${NEBULA_AUTH_WECHAT_WEB_APP_SECRET:}
            redirect-uri: ${NEBULA_AUTH_WECHAT_WEB_REDIRECT_URI:}
            frontend-callback-uri: ${NEBULA_AUTH_WECHAT_WEB_FRONTEND_CALLBACK_URI:/login/wechat-callback}

spring:
  datasource:
    url: ${DB_URL:jdbc:mysql://localhost:3306/nebula}
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:root}  # 生产环境必须通过环境变量覆盖

nebula:
  crypto:
    keys:
      - id: "1"
        # 对称加密密钥（Base64 编码的 32 字节），推荐用环境变量注入，默认空串表示未配置
        secret: ${NEBULA_CRYPTO_KEY_1:}
```

### 6.2 禁止硬编码敏感值

```java
// ❌ 错误 - 硬编码敏感密钥
private String secretKey = "my-super-secret-key-12345";

// ✅ 正确 - 使用环境变量或占位符
private String secretKey = "${AUTH_TOKEN_SECRET_KEY:default-dev-key}";
```

### 6.3 配置文件加密（生产环境）

配置文件**自身**的加密（如把 `spring.datasource.password` 写成 `ENC(...)`）本项目**未集成**任何方案：仓库里没有 Jasypt 之类的依赖，也没有对应的解密装配，照抄 `ENC(...)` 写法不会生效。生产环境的敏感配置一律走环境变量（§6.1）。

**数据库里存放的敏感数据是另一层问题**：运行期凭据（SMTP 授权码、初始密码等）以业务数据形式落在 `sys_param` 里，会进备份、进缓存、进 Binlog，环境变量解决不了。这一层由 `nebula-base-crypto` 承担——逐行声明 `is_encrypted`，读写自动加解密，而密钥走 `nebula.crypto.keys` 配置（推荐环境变量注入，也可直接写值，见 §9.4）。

两层不可互相替代：配置文件加密解决"配置源码里不能有明文"，落库加密解决"数据库与备份里不能有明文"。

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
- ❌ 配置文件使用硬编码密码/密钥（**限于随仓库分发的默认配置文件**，如 `nebula-app-runner/application.yml`；运维自己的部署配置不进仓库，写值属正常用法，见下方说明）
- ❌ 配置层级混乱（如 `nebula.auth.token.expire` 应为 `nebula.auth.token.access-token-expire`）

> **加解密密钥的来源不做强制**：`nebula.crypto.keys[].secret` 直接写值即可用——框架不校验来源、不要求 `${ENV:}` 占位符，`keys`/`active-key-id` 的合法性校验与密钥来源无关。推荐环境变量注入只是因为它更省心：密钥写进随仓库分发的配置会随镜像层、备份与 Git 历史一起扩散。

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
| crypto | `nebula.crypto` |
| mybatis | `nebula.mybatis` |
| gateway | `nebula.gateway` |
| architecture | `nebula.architecture` |
