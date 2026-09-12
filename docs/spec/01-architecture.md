# 架构设计规范

## 一、架构模式

### 1.1 双模式架构

项目支持 **单体模式** 和 **微服务模式** 两种部署方式，通过依赖选择切换：

| 模式 | 语义 | 适用场景 |
|---|---|---|
| `local` | 本地直接实现，Controller + Service 同进程 | 单体应用、开发调试 |
| `remote` | Feign 远程调用，通过网关访问独立服务 | 微服务消费者、跨服务调用 |

### 1.2 架构切换机制

通过 **Maven 依赖引入与排除** 实现切换：

- 引入 `nebula-{module}-local`：启用本地实现。
- 引入 `nebula-{module}-remote`：启用远程代理。
- 同一业务模块的 `local` 与 `remote` 互斥，禁止同时出现在同一个应用 classpath。
- 配置文件中的 `nebula.{module}.mode` 只表达期望模式和远程参数，不负责动态导入依赖。

启动期通过 `@NebulaModuleMarker` 与 `ModuleMarkerConflictChecker` 检查同模块 local/remote 是否同时存在。

### 1.3 配置优先级

```
模块级配置 > 全局配置 > 默认值(local)
```

**配置示例**：
```yaml
# 全局配置（影响所有模块）
nebula:
  architecture:
    mode: local  # 或 remote

# 模块级配置（覆盖全局配置）
nebula:
  auth:
    mode: local   # auth 模块本地模式
  dict:
    mode: remote  # dict 模块远程模式
```

**配置说明**：
1. 优先读取 `nebula.{module}.mode`
2. 若未配置，回退到 `nebula.architecture.mode`
3. 若都未配置，默认按 local 语义处理
4. 配置值必须与实际 Maven 依赖一致，否则应在启动期校验失败

### 1.4 新模块接入流程

新增业务模块时，需在 `*-local` 和 `*-remote` 子模块中提供明确的依赖边界和 Marker：

```java
@NebulaModuleMarker(module = "{module}", side = NebulaModuleSide.LOCAL)
public final class {Module}LocalMarker {
    private {Module}LocalMarker() {
    }
}

@NebulaModuleMarker(module = "{module}", side = NebulaModuleSide.REMOTE)
public final class {Module}RemoteMarker {
    private {Module}RemoteMarker() {
    }
}
```

---

## 二、模块划分原则

### 2.1 业务模块五层结构

所有业务模块统一采用 **api/core/local/remote/service** 五层结构：

```
nebula-{module}/
├── nebula-{module}-api      # 契约层
├── nebula-{module}-core     # 核心实现层
├── nebula-{module}-local    # 本地接入层
├── nebula-{module}-remote   # 远程接入层
└── nebula-{module}-service  # 独立服务启动层
```

### 2.2 各层职责定义

| 层级 | 后缀 | 职责 | 关键内容 |
|---|---|---|---|
| **契约层** | `*-api` | 定义稳定接口契约 | 接口定义、DTO、Command、Query、错误码、模块守卫 |
| **核心层** | `*-core` | 业务核心实现 | Entity、DAO、Service 实现、业务编排、Converter |
| **本地接入层** | `*-local` | 本地 HTTP 接入 | Controller、Local Marker、本地自动配置 |
| **远程接入层** | `*-remote` | 远程 Feign 接入 | FeignClient、RemoteServiceImpl、Remote Marker |
| **服务启动层** | `*-service` | 独立服务入口 | 启动类、application.yml、端口配置 |

### 2.3 特殊模块结构

**事件模块** (`nebula-event`) 采用基础设施分层：
```
nebula-event/
├── nebula-event-api                  # 事件模型、发布接口
├── nebula-event-core                 # Dispatcher、Payload解码
├── nebula-event-local                # 本地发布实现
├── nebula-event-remote               # Outbox、Relay
└── nebula-event-remote-by-rocketmq   # RocketMQ适配
```

**事件模块特殊说明**：

事件模块作为基础设施，具有特殊的设计考量：

- 事件模块是**基础设施**而非业务模块，其设计目标是提供统一事件编程模型
- `nebula-event-local` 和 `nebula-event-remote` 子模块**可同时引入**，不同于业务模块的互斥规则
- `nebula-event-remote` 提供 Outbox + Relay 能力，用于分布式事件投递，与业务事务解耦
- `nebula-event-remote-by-rocketmq` 提供 RocketMQ 适配，可根据部署环境选择是否启用
- 所有子模块仍然遵循分层规范，不跨层依赖
- 运行时通过 `nebula.event.mode` 配置决定主发布方式（`LOCAL` 或 `REMOTE`）

**关键区别**：

| 对比项 | 业务模块 | 事件模块 |
|--------|----------|----------|
| local/remote 引入 | **互斥**，禁止同时引入 | **可共存**，按需组合 |
| 模式切换 | 切换接入方式（Controller vs Feign） | 切换发布方式（本地分发 vs 分布式投递） |
| 分层遵守 | 严格遵守 | 严格遵守 |

**基础设施模块** (`nebula-base`)：
```
nebula-base/
├── nebula-base-common    # DTO、异常、工具类、模块 Marker 与冲突检查
├── nebula-base-mybatis   # MyBatis Plus配置、雪花ID
├── nebula-base-web       # Web拦截器、异常处理、响应封装
├── nebula-base-cache     # Caffeine/Redis缓存抽象
├── nebula-base-cloud     # Feign配置、上下文透传
```

**OAuth2 Provider 插件** (`nebula-auth-oauth2-provider-*`)：

OAuth2 Provider 使用 SPI 插件结构：

```text
nebula-auth/
├── nebula-auth-oauth2-provider        # SPI 契约层
└── nebula-auth-oauth2-provider-github # GitHub 插件
```

插件包可以同时包含 ProviderClient、Controller、FeignClient。插件若需要区分 local/remote，应通过独立依赖、独立自动配置或明确的启用属性控制，不能依赖配置动态导入模块实现。

---

## 三、模块依赖规范

### 3.1 依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│                   nebula-{module}-service                    │
│            (独立服务启动，依赖 local + 其他 remote)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   nebula-{module}-local                      │
│                  (本地接入，Controller层)                     │
│         依赖: api + core + base-web                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   nebula-{module}-core                       │
│             (核心实现，Entity + DAO + Service)               │
│         依赖: api + base-common + base-mybatis + base-cache  │
│         + 其他模块的 api (如 auth-core 依赖 param-api)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   nebula-{module}-api                        │
│                  (契约层，稳定接口)                           │
│         依赖: base-common                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   nebula-{module}-remote                     │
│                (远程接入，FeignClient层)                      │
│         依赖: api + base-cloud + spring-cloud-openfeign      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 各层依赖规则

| 层级 | 允许依赖 | 禁止依赖 |
|---|---|---|
| `*-api` | `base-common` | `core`、`local`、`remote`、`service`、其他模块 `*-api` |
| `*-core` | `*-api`、`base-common`、`base-mybatis`、`base-cache`、其他模块 `*-api` | `local`、`remote`、`service`、其他模块 `*-core` |
| `*-local` | `*-api`、`*-core`、`base-web` | `remote`、其他模块 `*-local` |
| `*-remote` | `*-api`、`base-cloud`、`spring-cloud-openfeign` | `core`、`local`、其他模块 `*-remote` |
| `*-service` | `*-local`、其他模块 `*-remote`、`base-mybatis`、`base-cache` | 其他模块 `*-local`、其他模块 `*-core` |

### 3.3 具体依赖示例（auth模块）

```xml
<!-- nebula-auth-api -->
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-base-common</artifactId>
</dependency>

<!-- nebula-auth-core -->
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-auth-api</artifactId>
</dependency>
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-base-mybatis</artifactId>
</dependency>
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-base-cache</artifactId>
</dependency>
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-param-api</artifactId>  <!-- 跨模块 api -->
</dependency>

<!-- nebula-auth-local -->
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-auth-api</artifactId>
</dependency>
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-auth-core</artifactId>
</dependency>
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-base-web</artifactId>
</dependency>

<!-- nebula-auth-remote -->
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-auth-api</artifactId>
</dependency>
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-base-cloud</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>

<!-- nebula-auth-service -->
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-auth-local</artifactId>
</dependency>
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-param-remote</artifactId>  <!-- 跨模块 remote -->
</dependency>
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-base-mybatis</artifactId>
</dependency>
```

### 3.4 nebula-app-starter 集成方式

`nebula-app-starter` 默认面向单体集成，优先引入业务模块的 `local` 侧。需要把某个模块切换为远程消费时，应在应用 POM 中排除该模块 `*-local` 并显式引入 `*-remote`：

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-app-starter</artifactId>
    <exclusions>
        <exclusion>
            <groupId>cn.cloudomni</groupId>
            <artifactId>nebula-auth-local</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-auth-remote</artifactId>
</dependency>
```

---

## 四、模块冲突检测

### 4.1 Marker 类设计

每个模块在 `local` 和 `remote` 子模块中放置 Marker 类：
- `cn.cloudomni.nebula.{module}.local.{Module}LocalMarker`
- `cn.cloudomni.nebula.{module}.remote.{Module}RemoteMarker`

```java
// nebula-auth-local
package cn.cloudomni.nebula.auth.local;
public class AuthLocalMarker {}

// nebula-auth-remote
package cn.cloudomni.nebula.auth.remote;
public class AuthRemoteMarker {}
```

### 4.2 启动期检测

在 `*-api` 模块注册 Guard，启动时检测冲突：

```java
// nebula-auth-api 的 AutoConfiguration
@AutoConfiguration
public class AuthModuleGuardAutoConfiguration {
    @Bean
    public SmartInitializingSingleton authModuleDependencyGuard(ApplicationContext ctx) {
        return () -> AuthModuleDependencyGuard.verify(ctx.getClassLoader());
    }
}
```

Guard 实现检测逻辑：
```java
public static void verify(ClassLoader classLoader) {
    boolean hasLocal = ClassUtils.isPresent(LOCAL_MARKER_CLASS, classLoader);
    boolean hasRemote = ClassUtils.isPresent(REMOTE_MARKER_CLASS, classLoader);
    if (hasLocal && hasRemote) {
        throw new IllegalStateException(
            "检测到 auth-local 与 auth-remote 同时存在，请仅保留一种接入方式。"
        );
    }
}
```

---

## 五、Gateway 配置规范

### 5.1 路由配置

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: auth-service-route
          uri: ${nebula.gateway.services.auth.url:http://localhost:9900}
          predicates:
            - Path=/api/auth/**
        - id: dict-service-route
          uri: ${nebula.gateway.services.dict.url:http://localhost:9901}
          predicates:
            - Path=/api/dict/**
```

**路由命名约定**：
- 路由 ID：`{module}-service-route`
- 路径前缀：`/api/{module}/**`
- URI 变量：`nebula.gateway.services.{module}.url`

### 5.2 OpenAPI 文档聚合

```yaml
springdoc:
  swagger-ui:
    urls:
      - name: auth-service
        url: /v3/api-docs/auth-service

knife4j:
  gateway:
    enabled: true
    routes:
      - name: auth-service
        url: /v3/api-docs/auth-service
        service-name: nebula-auth-service
```

### 5.3 服务地址配置

```yaml
nebula:
  gateway:
    services:
      auth:     { url: http://localhost:9900 }
      dict:     { url: http://localhost:9901 }
      param:    { url: http://localhost:9902 }
      notify:   { url: http://localhost:9903 }
      storage:  { url: http://localhost:9905 }
      scheduler: { url: http://localhost:9906 }
      frontend: { url: http://localhost:9907 }
      audit:    { url: http://localhost:9908 }
```

---

## 六、禁止行为

### 6.1 架构模式禁止

- ❌ 同一模块同时引入 `*-local` 和 `*-remote`（启动会失败）
- ❌ 在 `*-api` 模块中放置业务实现代码
- ❌ 在 `*-core` 模块中放置 Controller
- ❌ 在 `*-remote` 模块中直接调用本地 DAO

### 6.2 依赖禁止

- ❌ `*-api` 依赖 `*-core`（契约层依赖实现层）
- ❌ `*-core` 依赖 `*-local`（实现层依赖接入层）
- ❌ `*-local` 依赖 `*-remote`（本地接入依赖远程接入）
- ❌ `*-service` 依赖其他模块的 `*-local`（服务间应通过 remote 调用）
- ❌ 跨模块 `*-core` 依赖（如 `auth-core` 依赖 `dict-core`）

### 6.3 配置禁止

- ❌ 使用非标准配置项（如 `nebula.mode` 应为 `nebula.architecture.mode`）
- ❌ 模块级配置与全局配置不一致（如全局 `local`，模块 `remote`，需明确说明）

---

## 七、速查表

### 7.1 架构配置项

| 配置项 | 说明 | 示例值 |
|---|---|---|
| `nebula.architecture.mode` | 全局架构模式 | `local` / `remote` |
| `nebula.{module}.mode` | 模块级模式（覆盖全局） | `local` / `remote` |
| `nebula.gateway.services.{module}.url` | Gateway 服务地址 | `http://localhost:9900` |
| `nebula.event.mode` | 事件模式 | `LOCAL` / `REMOTE` |

### 7.2 模块端口分配

| 模块 | 默认端口 | 服务名 |
|---|---|---|
| `gateway` | `9999` | `nebula-gateway-service` |
| `auth` | `9900` | `nebula-auth-service` |
| `dict` | `9901` | `nebula-dict-service` |
| `param` | `9902` | `nebula-param-service` |
| `notify` | `9903` | `nebula-notify-service` |
| `storage` | `9905` | `nebula-storage-service` |
| `scheduler` | `9906` | `nebula-scheduler-service` |
| `frontend` | `9907` | `nebula-frontend-service` |
| `audit` | `9908` | `nebula-audit-service` |

### 7.3 依赖规则速查

| 源层级 | 可依赖 | 不可依赖 |
|---|---|---|
| `api` | `base-common` | `core`, `local`, `remote` |
| `core` | `api`, `base-*`, 其他 `*-api` | `local`, `remote`, 其他 `*-core` |
| `local` | `api`, `core`, `base-web` | `remote`, 其他 `*-local` |
| `remote` | `api`, `base-cloud` | `core`, `local` |
| `service` | `local`, 其他 `*-remote` | 其他 `*-local`, 其他 `*-core` |
