# 分层规范

## 一、业务模块五层结构

每个业务模块遵循统一的五层结构：

```
nebula-{module}/
├── nebula-{module}-api      # 契约层
├── nebula-{module}-core     # 核心实现层
├── nebula-{module}-local    # 本地接入层
├── nebula-{module}-remote   # 远程接入层
└── nebula-{module}-service  # 独立服务启动层
```

| 层级 | 模块后缀 | 职责 | 示例 |
|---|---|---|---|
| **契约层** | `*-api` | 接口、DTO、Command、Query、错误码 | `nebula-auth-api` |
| **核心层** | `*-core` | Entity、DAO、Service实现、业务编排 | `nebula-auth-core` |
| **本地接入层** | `*-local` | Controller + 本地自动配置 | `nebula-auth-local` |
| **远程接入层** | `*-remote` | FeignClient + 远程代理 | `nebula-auth-remote` |
| **服务启动层** | `*-service` | 独立服务入口、配置 | `nebula-auth-service` |

---

## 二、各层包结构规范

### 2.1 契约层（*-api）

```
nebula-{module}-api/
└── src/main/java/cn/cloudomni/nebula/{module}/
    ├── constant/                 # 常量、错误码枚举
    │   └── {Module}ErrorInfo.java
    ├── model/
    │   ├── dto/                  # DTO类
    │   │   ├── {Module}Dto.java
    │   │   └── {Module}DetailDto.java
    │   ├── command/              # Command类
    │   │   ├── Create{Module}Command.java
    │   │   ├── Update{Module}Command.java
    │   │   └── Delete{Module}Command.java
    │   └── query/                # Query类
    │   │   ├── Page{Module}Query.java
    │   │   └── Get{Module}ByIdQuery.java
    ├── service/                  # Service接口
    │   └── I{Module}Service.java
    └── configuration/            # 模块守卫、Marker/Guard 配置
        └── {Module}ModuleGuardAutoConfiguration.java
```

**允许内容**：
- Service 接口定义（`I{Module}Service`）
- DTO、Command、Query 类
- 错误码枚举（`{Module}ErrorInfo`）
- 模块守卫（`{Module}ModuleDependencyGuard`）
- Marker/Guard 配置类

**禁止内容**：
- Entity 类
- DAO 类
- Controller 类
- Service 实现类
- FeignClient

### 2.2 核心层（*-core）

```
nebula-{module}-core/
└── src/main/java/cn/cloudomni/nebula/{module}/
    ├── model/
    │   └── entity/               # Entity类
    │   │   └── {Module}Entity.java
    ├── dao/
    │   ├── {Module}DAO.java      # DAO类
    │   └── mapper/
    │   │   └── {Module}Mapper.java
    ├── service/
    │   └── impl/
    │   │   └── {Module}ServiceImpl.java
    ├── convert/                  # Converter类
    │   └── {Module}Converter.java
    └── configuration/            # 核心层自动配置
        └── {Module}CoreAutoConfiguration.java
```

**允许内容**：
- Entity 类（`{Module}Entity`）
- DAO 类（`{Module}DAO`）
- Mapper 接口（`{Module}Mapper`）
- Service 实现类（`{Module}ServiceImpl`）
- Converter 类（`{Module}Converter`）
- 业务编排逻辑

**禁止内容**：
- Controller 类
- FeignClient
- DTO/Command/Query 类（应在 api 层）
- Request/Response 类（应在 local 层）

### 2.3 本地接入层（*-local）

```
nebula-{module}-local/
└── src/main/java/cn/cloudomni/nebula/{module}/
    ├── controller/               # Controller类
    │   └── {Module}Controller.java
    ├── model/
    │   ├── req/                  # Request类（接口层入参）
    │   │   ├── Create{Module}Req.java
    │   │   ├── Update{Module}Req.java
    │   │   └── {Module}PageReq.java
    │   ├── resp/                 # Response类（接口层出参）
    │   │   └── {Module}DetailResp.java
    │   └── convert/              # Req/Resp与DTO转换器
    │   │   └── {Module}LocalConverter.java
    ├── local/                    # Marker类
    │   └── {Module}LocalMarker.java
    └── configuration/
        └── {Module}LocalAutoConfiguration.java
```

**Req/Resp 类职责说明**：

| 类型 | 职责 | 说明 |
|---|---|---|
| `*Req` | Controller 入参 | 接口层请求参数，仅用于 HTTP 接口 |
| `*Resp` | Controller 出参 | 接口层响应结果，仅用于 HTTP 接口 |
| `*Dto` | Service 层数据 | 跨模块传输、Service 层内部使用 |

**Req/Resp 与 DTO 的关系**：
- `Req` 和 `Resp` **仅用于 Controller 层**，不传递给 Service 层
- Service 层使用 `Command`（入参）和 `Dto`（出参）
- Controller 通过 `LocalConverter` 完成 Req→Command 和 Dto→Resp 的转换

**Local Controller @RequestBody 约束**：

本地 Controller **禁止**直接在 `@RequestBody` 中接收 API 层的 `Command` 或 `Query` 类：

```java
// ❌ 错误 - Controller 直接接收 Command
@PostMapping
public ApiResult<UserDetailResp> createUser(@RequestBody CreateUserCommand command) {
    return ApiResult.success(userService.createUser(command));
}

// ✅ 正确 - Controller 接收 Req，转换为 Command
@PostMapping
public ApiResult<UserDetailResp> createUser(@RequestBody CreateUserReq req) {
    CreateUserCommand command = userLocalConverter.toCommand(req);
    UserDetailDto dto = userService.createUser(command);
    return ApiResult.success(userLocalConverter.toResp(dto));
}
```

**约束原因**：

1. **隔离性**：`Req` 类属于 `*-local` 层，`Command` 类属于 `*-api` 层。Controller 直接接收 Command 会破坏分层边界。
2. **演进性**：HTTP 接口参数可能与 Service 层入参不完全一致，通过 Req 类可独立演进。
3. **契约稳定性**：`Command/Query` 是跨模块契约，应保持稳定；`Req` 可根据 HTTP 接口需求灵活调整。
4. **内部接口同样适用**：包括回调接口、管理接口等内部 Controller，也应遵循 Req/Resp 模式。

**Remote Feign Contract 例外**：

远程接入层的 Feign Client **可以**在 `@RequestBody` 中直接使用 API 层的 `Command/Query`：

```java
// ✅ 正确 - Feign Client 可直接使用 Command
@FeignClient(name = "nebula-user-service")
public interface UserFeignClient {
    
    @PostMapping("/api/user/users")
    ApiResult<UserDetailDto> createUser(@RequestBody CreateUserCommand command);
}
```

**例外原因**：

- Feign Client 是远程契约层，`Command/Query` 作为跨服务传输的统一契约
- 远程调用无需 Req/Resp 转换，直接传输 Command 可简化远程接入逻辑
- Feign Client 仅定义契约，实际转换发生在服务提供方的 local 层

**LocalConverter 职责说明**：

```java
// LocalConverter 负责接口层与 Service 层的数据转换
public class UserLocalConverter {

    // Req → Command（Controller 入参转 Service 入参）
    public CreateUserCommand toCommand(CreateUserReq req) {
        CreateUserCommand command = new CreateUserCommand();
        command.setUsername(req.getUsername());
        command.setNickname(req.getNickname());
        // ...
        return command;
    }

    // Dto → Resp（Service 出参转 Controller 出参）
    public UserDetailResp toResp(UserDetailDto dto) {
        UserDetailResp resp = new UserDetailResp();
        resp.setId(dto.getId());
        resp.setUsername(dto.getUsername());
        // ...
        return resp;
    }

    // 批量转换
    public List<UserDetailResp> toRespList(List<UserDto> dtos) {
        return dtos.stream()
            .map(this::toResp)
            .collect(Collectors.toList());
    }
}
```

**允许内容**：
- Controller 类（`{Module}Controller`）
- Request 类（`*Req`）— 位于 `model/req` 包
- Response 类（`*Resp`）— 位于 `model/resp` 包
- LocalConverter（Req → Command，Dto → Resp）— 位于 `model/convert` 包
- Local Marker 类

**禁止内容**：
- Entity 类（应在 core 层）
- DAO 类（应在 core 层）
- FeignClient（应在 remote 层）
- DTO/Command/Query 类（应在 api 层）
- Core Converter（Entity ↔ DTO，应在 core 层）

### 2.4 远程接入层（*-remote）

```
nebula-{module}-remote/
└── src/main/java/cn/cloudomni/nebula/{module}/
    ├── remote/
    │   ├── {Module}FeignClient.java      # FeignClient
    │   └── {Module}RemoteMarker.java     # Marker类
    │   └── impl/
    │   │   └── {Module}RemoteServiceImpl.java  # 远程代理实现
    └── configuration/
        └── {Module}RemoteAutoConfiguration.java
```

**允许内容**：
- FeignClient（`{Module}FeignClient`）
- RemoteServiceImpl（实现 api 层 Service 接口）
- Remote Marker 类
- Remote Marker 与远程自动配置

**禁止内容**：
- Entity 类（本地服务才有）
- DAO 类（本地服务才有）
- Controller 类（本地服务才有）
- Request/Response 类（本地服务才有）

### 2.5 服务启动层（*-service）

```
nebula-{module}-service/
└── src/main/
    ├── java/cn/cloudomni/nebula/{module}/
    │   └── {Module}ServiceApplication.java  # 启动类
    └── resources/
        └── application.yml                  # 服务配置
```

**允许内容**：
- 启动类（`{Module}ServiceApplication`）
- application.yml（端口、数据库、Redis 等配置）
- 服务特有的配置类

**禁止内容**：
- 业务逻辑类（应在 core 层）
- Controller（应在 local 层，已通过依赖引入）

---

## 三、Converter 分类与职责

### 3.1 两种 Converter 的区别

项目中存在两种 Converter，职责不同，位置也不同：

| Converter 类型 | 所在位置 | 包名 | 转换方向 | 命名示例 |
|---|---|---|---|---|
| **CoreConverter** | `*-core` 模块 | `convert/` 或 `model/convert/` | Entity ↔ DTO | `UserConverter` |
| **LocalConverter** | `*-local` 模块 | `model/convert/` | Req ↔ Command, DTO ↔ Resp | `UserLocalConverter` |

### 3.2 CoreConverter（核心层）

**职责**：Entity 与 DTO 的相互转换。

**位置**：`nebula-{module}-core/.../convert/` 或 `model/convert/`

```java
// CoreConverter - Entity ↔ DTO
public class UserConverter {

    // Entity → DTO
    public UserDto toDto(UserEntity entity) {
        UserDto dto = new UserDto();
        dto.setId(entity.getId());
        dto.setUsername(entity.getUsername());
        dto.setNickname(entity.getNickname());
        return dto;
    }

    // DTO → Entity（用于更新）
    public void updateEntity(UserEntity entity, UpdateUserCommand command) {
        entity.setNickname(command.getNickname());
        entity.setEmail(command.getEmail());
    }

    // 批量转换
    public List<UserDto> toDtoList(List<UserEntity> entities) {
        return entities.stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }
}
```

**使用场景**：
- ServiceImpl 中将 Entity 转换为 DTO 返回给上层
- ServiceImpl 中将 Command 数据写入 Entity

### 3.3 LocalConverter（本地接入层）

**职责**：Req/Resp 与 Command/DTO 的相互转换（接口层适配）。

**位置**：`nebula-{module}-local/.../model/convert/`

```java
// LocalConverter - Req ↔ Command, DTO ↔ Resp
public class UserLocalConverter {

    // Req → Command（Controller 入参转 Service 入参）
    public CreateUserCommand toCommand(CreateUserReq req) {
        CreateUserCommand command = new CreateUserCommand();
        command.setUsername(req.getUsername());
        command.setNickname(req.getNickname());
        command.setEmail(req.getEmail());
        return command;
    }

    // UpdateReq → UpdateCommand
    public UpdateUserCommand toCommand(Long id, UpdateUserReq req) {
        UpdateUserCommand command = new UpdateUserCommand();
        command.setId(id);
        command.setNickname(req.getNickname());
        command.setEmail(req.getEmail());
        return command;
    }

    // DTO → Resp（Service 出参转 Controller 出参）
    public UserDetailResp toResp(UserDetailDto dto) {
        UserDetailResp resp = new UserDetailResp();
        resp.setId(dto.getId());
        resp.setUsername(dto.getUsername());
        resp.setNickname(dto.getNickname());
        resp.setEmail(dto.getEmail());
        resp.setCreateTime(dto.getCreateTime());
        return resp;
    }

    // PageResp<Dto> → PageResp<Resp>
    public PageResp<UserDetailResp> toRespPage(PageResp<UserDto> dtoPage) {
        PageResp<UserDetailResp> respPage = new PageResp<>();
        respPage.setTotal(dtoPage.getTotal());
        respPage.setPageNum(dtoPage.getPageNum());
        respPage.setPageSize(dtoPage.getPageSize());
        respPage.setList(toRespList(dtoPage.getList()));
        return respPage;
    }

    private List<UserDetailResp> toRespList(List<UserDto> dtos) {
        return dtos.stream()
            .map(this::toResp)
            .collect(Collectors.toList());
    }
}
```

**使用场景**：
- Controller 中将 Req 转换为 Command 调用 Service
- Controller 中将 DTO 转换为 Resp 返回给前端

### 3.4 数据流转完整路径

```
HTTP Request
    │
    ▼
CreateUserReq (local/model/req)
    │ UserLocalConverter.toCommand()
    ▼
CreateUserCommand (api/model/command)
    │ Service.createUser(command)
    ▼
UserEntity (core/model/entity)
    │ UserConverter.toDto()
    ▼
UserDetailDto (api/model/dto)
    │ UserLocalConverter.toResp()
    ▼
UserDetailResp (local/model/resp)
    │
    ▼
HTTP Response
```

### 3.5 禁止行为

- ❌ Req/Resp 类放在 api 模块（应放在 local 模块）
- ❌ LocalConverter 放在 core 模块（应放在 local 模块）
- ❌ CoreConverter 放在 local 模块（应放在 core 模块）
- ❌ Controller 直接将 Req 传递给 Service（应先转换为 Command）
- ❌ Service 返回 Resp 类型（应返回 DTO，由 Controller 转换）
- ❌ Req/Resp 类用于跨模块传输（应使用 DTO）

---

## 四、层级依赖规则

### 3.1 依赖方向

```
service → local → core → api
         ↘ remote → api
```

**允许的依赖**：

| 层级 | 允许依赖 |
|---|---|
| `*-api` | `nebula-base-common` |
| `*-core` | `*-api`、`nebula-base-common`、`nebula-base-mybatis`、`nebula-base-cache`、其他模块 `*-api` |
| `*-local` | `*-api`、`*-core`、`nebula-base-web` |
| `*-remote` | `*-api`、`nebula-base-cloud`、`spring-cloud-starter-openfeign` |
| `*-service` | `*-local`、其他模块 `*-remote`、`nebula-base-mybatis`、`nebula-base-cache` |

**禁止的依赖**：

| 层级 | 禁止依赖 |
|---|---|
| `*-api` | `*-core`、`*-local`、`*-remote`、`*-service`、其他模块 `*-core` |
| `*-core` | `*-local`、`*-remote`、`*-service`、其他模块 `*-core`、其他模块 `*-local` |
| `*-local` | `*-remote`、其他模块 `*-local`、其他模块 `*-core` |
| `*-remote` | `*-core`、`*-local`、其他模块 `*-remote` |
| `*-service` | 其他模块 `*-local`、其他模块 `*-core` |

### 3.2 跨模块依赖规则

**跨模块调用必须通过 api 层契约**：

```java
// ✅ 正确 - auth-core 依赖 param-api，通过接口调用
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {
    private final ISystemParamService systemParamService;  // param-api 的接口
    
    public String getDefaultPassword() {
        return systemParamService.getStringValueByKey("default.password");
    }
}

// ❌ 错误 - auth-core 直接依赖 param-core
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {
    private final SystemParamServiceImpl systemParamService;  // param-core 的实现
    
    public String getDefaultPassword() {
        return systemParamService.getStringValueByKey("default.password");
    }
}
```

**服务间调用必须通过 remote 层**：

```java
// ✅ 正确 - auth-service 依赖 param-remote
// auth-service 的 pom.xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-param-remote</artifactId>
</dependency>

// ❌ 错误 - auth-service 依赖 param-local
// 这会导致 auth-service 和 param-service 同时运行，产生冲突
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-param-local</artifactId>
</dependency>
```

---

## 五、local / remote 依赖装配规范

### 4.1 local 层依赖与自动配置

```java
@AutoConfiguration
@ComponentScan("cn.cloudomni.nebula.{module}.controller")
@MapperScan("cn.cloudomni.nebula.{module}.dao.mapper")
public class {Module}LocalAutoConfiguration {
}
```

local 层是否生效由 `nebula-{module}-local` 是否在 classpath 上决定。

### 4.2 remote 层依赖与自动配置

```java
@AutoConfiguration
@EnableFeignClients(basePackages = "cn.cloudomni.nebula.{module}.remote")
public class {Module}RemoteAutoConfiguration {
}
```

remote 层是否生效由 `nebula-{module}-remote` 是否在 classpath 上决定。

### 4.3 依赖互斥规则

| 层级 | 说明 |
|---|---|
| `*-local` | 单体或独立服务本地实现，不能与同模块 `*-remote` 同时引入 |
| `*-remote` | 微服务消费者远程代理，不能与同模块 `*-local` 同时引入 |
| `*-service` | 独立服务通常引入自身 `*-local`，调用其他模块时引入其他模块 `*-remote` |

配置项 `nebula.{module}.mode` 只能用于表达期望模式、启动期一致性校验和 remote 参数承载，不能替代 Maven 依赖选择。

---

## 六、禁止行为

### 5.1 包结构禁止

- ❌ 在 `*-api` 中放置 Entity 类（应在 core 层）
- ❌ 在 `*-api` 中放置 Controller 类（应在 local 层）
- ❌ 在 `*-core` 中放置 Request/Response 类（应在 local 层）
- ❌ 在 `*-core` 中放置 FeignClient（应在 remote 层）
- ❌ 在 `*-local` 中放置 Entity 类（应在 core 层）

### 5.2 依赖禁止

- ❌ `*-api` 依赖 `*-core`（契约层依赖实现层）
- ❌ `*-core` 依赖 `*-local`（实现层依赖接入层）
- ❌ `*-core` 依赖其他模块 `*-core`（跨模块实现层依赖）
- ❌ `*-local` 依赖 `*-remote`（本地接入依赖远程接入）
- ❌ `*-local` 依赖其他模块 `*-local`（跨模块本地依赖）
- ❌ `*-service` 依赖其他模块 `*-local`（服务间应通过 remote 调用）

### 5.3 local / remote 装配禁止

- ❌ 同一业务模块同时引入 `*-local` 和 `*-remote`
- ❌ 只修改 YAML 为 remote，但 POM 仍只引入 local
- ❌ 在 core 层根据 local/remote 分支选择实现

---

## 七、速查表

### 7.1 各层内容速查

| 内容类型 | 所属层 | 包路径 | 示例 |
|---|---|---|---|
| Service 接口 | `*-api` | `service/` | `IUserService` |
| DTO/Command/Query | `*-api` | `model/dto`, `model/command`, `model/query` | `UserDto`, `CreateUserCommand`, `PageUserQuery` |
| 错误码枚举 | `*-api` | `constant/` | `AuthErrorInfo` |
| Entity | `*-core` | `model/entity/` | `UserEntity` |
| DAO/Mapper | `*-core` | `dao/`, `dao/mapper/` | `UserDAO`, `UserMapper` |
| Service 实现 | `*-core` | `service/impl/` | `UserServiceImpl` |
| CoreConverter | `*-core` | `convert/` 或 `model/convert/` | `UserConverter`（Entity ↔ DTO） |
| Controller | `*-local` | `controller/` | `UserController` |
| Request | `*-local` | `model/req/` | `CreateUserReq`, `UserPageReq` |
| Response | `*-local` | `model/resp/` | `UserDetailResp` |
| LocalConverter | `*-local` | `model/convert/` | `UserLocalConverter`（Req ↔ Command, DTO ↔ Resp） |
| FeignClient | `*-remote` | `remote/` | `UserFeignClient` |
| RemoteServiceImpl | `*-remote` | `remote/impl/` | `UserRemoteServiceImpl` |
| 启动类 | `*-service` | 根包 | `AuthServiceApplication` |

### 7.2 Converter 职责速查

| Converter | 所在层 | 包名 | 转换方向 | 使用场景 |
|---|---|---|---|---|
| `{Module}Converter` | `*-core` | `convert/` 或 `model/convert/` | Entity ↔ DTO | ServiceImpl 内部 |
| `{Module}LocalConverter` | `*-local` | `model/convert/` | Req ↔ Command, DTO ↔ Resp | Controller 层适配 |

### 7.3 依赖速查

```
api    → base-common
core   → api + base-mybatis + base-cache + 其他模块 api
local  → api + core + base-web
remote → api + base-cloud + openfeign
service → local + 其他模块 remote + base-mybatis + base-cache
```
