# 命名规范

## 一、类命名规范

### 1.1 Entity 类

- **后缀**: `Entity`（首字母大写）
- **位置**: `model/entity` 包下（core 模块）
- **继承**: 继承 `BaseEntity` 或 `BaseIdEntity`
- **命名**: `XxxEntity`，使用业务领域名称

```
// ✅ 正确
UserEntity, RoleEntity, DictItemEntity, StorageFileEntity

// ❌ 错误
User, Users, UserDO, UserPo
```

### 1.2 DTO 类

- **后缀**: `Dto`（小写 d, 小写 o）
- **位置**: `model/dto` 包下（api 模块）
- **细化类型**:

| 类型 | 后缀 | 示例 |
|---|---|---|
| 基础 DTO | `Dto` | `UserDto`, `RoleDto` |
| 详情 DTO | `DetailDto` | `UserDetailDto`, `RoleDetailDto` |
| 树形 DTO | `TreeDto` | `MenuTreeDto`, `OrganizationTreeDto` |
| 结果 DTO | `ResultDto` | `LoginResultDto`, `SendResultDto` |
| 简单 DTO（内部类） | `SimpleDto` | `RoleSimpleDto`, `OrganizationSimpleDto` |

```
// ✅ 正确
UserDto, UserDetailDto, MenuTreeDto, LoginResultDto
// 内部类
public class UserDetailDto {
    private List<RoleSimpleDto> roles;  // 小写 Dto
}

// ❌ 错误
UserDTO, UserResponseDTO, RoleSimpleDTO  // 全大写 DTO
```

### 1.3 Command 类

- **后缀**: `Command`
- **位置**: `model/command` 包下（api 模块）
- **操作类型**:

| 操作 | 前缀 | 示例 |
|---|---|---|
| 创建 | `Create` | `CreateUserCommand`, `CreateRoleCommand` |
| 更新 | `Update` | `UpdateUserCommand`, `UpdateRoleCommand` |
| 删除 | `Delete` | `DeleteUserCommand`, `DeleteRoleCommand` |
| 其他操作 | 操作名 | `LoginCommand`, `LogoutCommand`, `RefreshTokenCommand` |

### 1.4 Query 类

- **后缀**: `Query`
- **位置**: `model/query` 包下（api 模块）
- **查询类型**:

| 类型 | 前缀 | 示例 |
|---|---|---|
| 分页查询 | `Page` | `PageUserQuery`, `PageRoleQuery` |
| 列表查询 | `List` | `ListDictItemQuery`, `ListRoleQuery` |
| 单条查询 | `Get` + 条件 | `GetUserByIdQuery`, `GetUserByUsernameQuery` |

### 1.5 Request/Response 类

- **位置**: `model/req` / `model/resp` 包下（local 模块）
- **用途**: Controller 层入参/出参，**禁止**用于跨模块传输或 Service 层

**命名规范**：
- **Req 类必须以 `Req` 结尾**：如 `CreateUserReq`, `UpdateUserReq`, `UserPageReq`
- **Resp 类必须以 `Resp` 结尾**：如 `UserDetailResp`, `LoginResp`, `CurrentUserResp`

| 类型 | 后缀 | 示例 |
|---|---|---|
| 创建请求 | `CreateXxxReq` | `CreateUserReq`, `CreateRoleReq` |
| 更新请求 | `UpdateXxxReq` | `UpdateUserReq`, `UpdateRoleReq` |
| 分页请求 | `XxxPageReq` | `UserPageReq`, `RolePageReq` |
| 详情请求 | `XxxDetailReq` | `UserDetailReq` |
| 详情响应 | `XxxDetailResp` | `UserDetailResp`, `RoleDetailResp` |
| 其他响应 | `XxxResp` | `LoginResp`, `CurrentUserResp` |

**Req/Resp 与 DTO/Command/Query 的关系**：

```
┌─────────────────────────────────────────────────────────────┐
│                    Controller 层                             │
│                                                             │
│   CreateUserReq ──┬─→ LocalConverter.toCommand()            │
│                   └──→ CreateUserCommand                     │
│                                                             │
│   UserPageReq ────┬─→ LocalConverter.toQuery()               │
│                   └──→ PageUserQuery                         │
│                                                             │
│   UserDetailDto ──┬─→ LocalConverter.toResp()                │
│                   └──→ UserDetailResp                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service 层                                │
│                                                             │
│   入参: Command, Query, 基本类型                             │
│   出参: DTO, IPage<DTO>, 基本类型                            │
└─────────────────────────────────────────────────────────────┘
```

**Controller 层转换规范**：

Controller 调用 Service 前，**必须**通过 LocalConverter 将 Req 转换为 Command/Query：

```java
// ✅ 正确 - Controller 使用 Converter 转换
@PostMapping
public ApiResult<UserDetailResp> createUser(@RequestBody CreateUserReq req) {
    // Req → Command
    CreateUserCommand command = UserLocalConverter.INSTANCE.toCommand(req);
    // 调用 Service
    UserDetailDto dto = userService.createUser(command);
    // DTO → Resp
    UserDetailResp resp = UserLocalConverter.INSTANCE.toResp(dto);
    return ApiResult.success(resp);
}

@PostMapping("/page")
public ApiResult<PageResp<UserResp>> pageUsers(@RequestBody UserPageReq req) {
    // Req → Query
    PageUserQuery query = UserLocalConverter.INSTANCE.toQuery(req);
    // 调用 Service
    IPage<UserDto> page = userService.pageUser(query);
    // IPage<DTO> → PageResp<Resp>
    return ApiResult.success(PageResp.of(
        UserLocalConverter.INSTANCE.toRespList(page.getRecords()),
        page.getTotal()
    ));
}

// ❌ 错误 - Controller 直接传递 Req 给 Service
@PostMapping
public ApiResult<UserDetailResp> createUser(@RequestBody CreateUserReq req) {
    userService.createUser(req);  // Req 不能直接传给 Service
}

// ❌ 错误 - Service 使用 Req/Resp 类型
public interface IUserService {
    UserDetailResp createUser(CreateUserReq req);  // 应使用 Command/DTO
}
```

**分页请求基类**：

所有分页请求类继承 `BasePageReq`（位于 `base-common` 模块）：

```java
// BasePageReq 基类
@Data
public class BasePageReq {
    private Integer pageNum = 1;
    private Integer pageSize = 20;
    private String orderName;
    private String orderType = "desc";
    
    public <T> Page<T> buildPage() { ... }
}

// 分页请求类示例
@Data
@EqualsAndHashCode(callSuper = true)
public class UserPageReq extends BasePageReq {
    private String username;
    private String nickname;
    private Integer status;
}
```

**禁止行为**：
- ❌ Req/Resp 类放在 api 模块（应放在 local 模块）
- ❌ Req/Resp 类用于 Service 层接口参数（应使用 Command/Query/DTO）
- ❌ Req/Resp 类用于跨模块传输（应使用 DTO）
- ❌ Controller 直接传递 Req 给 Service（应先转换为 Command/Query）
- ❌ Service 返回 Resp 类型（应返回 DTO，由 Controller 转换）
- ❌ Req/Resp 类命名不以 Req/Resp 结尾（如 `CreateUserRequest` 应为 `CreateUserReq`)

### 1.6 Controller 类

- **后缀**: `Controller`
- **位置**: `controller` 包下（local 模块）
- **命名**: `XxxController`

```
// ✅ 正确
UserController, RoleController, DictController, LoginController

// ❌ 错误
UserRestController, UserApi, UserControllerImpl
```

### 1.7 Service 类

- **接口**: `I` 前缀 + `Service` 后缀（如 `IUserService`, `IRoleService`）
- **实现**: `ServiceImpl` 后缀（如 `UserServiceImpl`, `RoleServiceImpl`）
- **位置**:
  - 接口: `service` 包下（api 模块）
  - 实现: `service/impl` 包下（core 模块）

```
// ✅ 正确
// api 模块
public interface IUserService { ... }
// core 模块
public class UserServiceImpl implements IUserService { ... }

// ❌ 错误
public interface UserService { ... }        // 缺少 I 前缀
public class UserService implements IUserService { ... }  // 缺少 Impl 后缀
```

### 1.8 Dao/Mapper 类

- **Dao 后缀**: `Dao`（驼峰式）
- **Mapper 后缀**: `Mapper`
- **位置**:
  - Dao: `dao` 包下（core 模块）
  - Mapper: `dao/mapper` 包下（core 模块）

```
// ✅ 正确
UserDao, RoleDao, DictTypeDao
UserMapper, RoleMapper, DictTypeMapper

// ❌ 错误
UserDAO, UserDaoImpl, UserMapperImpl
```

### 1.9 Converter 类

项目中存在两种 Converter，职责不同，位置也不同：

| 类型 | 后缀 | 所在模块 | 包路径 | 职责 |
|---|---|---|---|---|
| **CoreConverter** | `Converter` | `*-core` | `converter/` 或 `model/convert/` | Entity ↔ DTO/Command 转换 |
| **LocalConverter** | `LocalConverter` | `*-local` | `model/convert/` | Req ↔ Command/Query, DTO ↔ Resp 转换 |

**命名示例**：
```
// CoreConverter - core 模块
UserConverter, RoleConverter, DictConverter, NotifyConverter

// LocalConverter - local 模块
UserLocalConverter, RoleLocalConverter, DictLocalConverter, NotifyLocalConverter
```

**MapStruct 配置规范**：

Converter 使用 MapStruct 实现，必须遵循以下规范：

```java
// ✅ 正确 - 标准配置
@Mapper  // 不配置 componentModel，使用 default 模式
public interface UserConverter {

    // 单例定义 - 使用 Mappers.getMapper()
    UserConverter INSTANCE = Mappers.getMapper(UserConverter.class);

    // 转换方法...
}

// ❌ 错误 - 配置 componentModel = "spring"
@Mapper(componentModel = "spring")  // 禁止使用 Spring 模式
public interface UserConverter { ... }
```

**INSTANCE 单例定义规范**：

```java
// ✅ 正确 - 导入后使用
import org.mapstruct.factory.Mappers;

UserConverter INSTANCE = Mappers.getMapper(UserConverter.class);

// ❌ 错误 - 使用完整路径（不推荐）
UserConverter INSTANCE = org.mapstruct.factory.Mappers.getMapper(UserConverter.class);
```

**完整 Converter 实现示例**：

```java
// CoreConverter 示例（Entity ↔ DTO）
package cn.cloudomni.nebula.auth.converter;

import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

@Mapper
public interface UserConverter {

    UserConverter INSTANCE = Mappers.getMapper(UserConverter.class);

    /** Entity → DTO */
    UserDto toDto(UserEntity entity);

    /** Entity → DetailDto */
    UserDetailDto toDetailDto(UserEntity entity);

    /** DTO → Entity */
    UserEntity toEntity(UserDto dto);
}

// LocalConverter 示例（Req ↔ Command, DTO ↔ Resp）
package cn.cloudomni.nebula.auth.converter;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper
public interface UserLocalConverter {

    UserLocalConverter INSTANCE = Mappers.getMapper(UserLocalConverter.class);

    /** Req → Command */
    CreateUserCommand toCommand(CreateUserReq req);
    UpdateUserCommand toCommand(UpdateUserReq req);

    /** Req → Query */
    PageUserQuery toQuery(UserPageReq req);

    /** DTO → Resp */
    @Mapping(target = "roles", ignore = true)
    UserDetailResp toResp(UserDetailDto dto);
}
```

**使用方式**：

```java
// ✅ 正确 - 通过 INSTANCE 静态调用
UserDto dto = UserConverter.INSTANCE.toDto(entity);
CreateUserCommand command = UserLocalConverter.INSTANCE.toCommand(req);

// ❌ 错误 - 通过 Spring DI 注入（不支持）
@Autowired
private UserConverter userConverter;  // 禁止注入，应使用 INSTANCE
```

---

## 二、方法命名规范

### 2.1 Controller 层方法命名

| 操作类型 | 命名模式 | 示例 |
|---|---|---|
| **创建** | `create` + 实体名 | `createUser`, `createRole` |
| **更新** | `update` + 实体名 | `updateUser`, `updateRole` |
| **删除** | `remove` + 实体名 | `removeUser`, `removeRole` |
| **获取详情** | `get` + 实体名 | `getUser`, `getRole`, `getDictType` |
| **分页查询** | `page` + 实体名(复数) | `pageUsers`, `pageRoles`, `pageDictTypes` |
| **列表查询** | `list` + 条件描述 | `listAllRoles`, `listDictItems` |
| **树形查询** | `get` + 实体名 + `Tree` | `getMenuTree`, `getOrgTree` |

```
// ✅ 正确
@PostMapping
public ApiResult<UserDetailResp> createUser(@RequestBody CreateUserReq req);
@PutMapping("/{id}")
public ApiResult<UserDetailResp> updateUser(@PathVariable Long id, @RequestBody UpdateUserReq req);
@DeleteMapping("/{id}")
public ApiResult<Void> removeUser(@PathVariable Long id);
@GetMapping("/{id}")
public ApiResult<UserDetailResp> getUser(@PathVariable Long id);
@PostMapping("/page")
public ApiResult<PageResp<UserDto>> pageUsers(@RequestBody UserPageReq req);
@GetMapping("/tree")
public ApiResult<List<MenuTreeDto>> getMenuTree();

// ❌ 错误
public ApiResult<Void> deleteUser(@PathVariable Long id);      // 应使用 remove
public ApiResult<UserDetailResp> getUserById(@PathVariable Long id);  // ById 多余
public ApiResult<PageResp<UserDto>> userPage(@RequestBody UserPageReq req);  // 应使用 pageUsers
```

### 2.2 Service 层方法命名

#### 2.2.1 方法命名规范

| 操作类型 | 命名模式 | 示例 |
|---|---|---|
| **创建** | `create` + 实体名 | `createUser`, `createRole` |
| **更新** | `update` + 实体名 | `updateUser`, `updateRole` |
| **删除** | `remove` + 实体名 | `removeUser`, `removeRole` |
| **获取详情** | `get` + 实体名 + `Detail` | `getUserDetail`, `getRoleDetail` |
| **分页查询** | `page` + 实体名(复数) | `pageUsers`, `pageRoles` |
| **列表查询** | `list` + 条件描述 | `listAllRoles`, `listDictItems` |
| **树形查询** | `get` + 实体名 + `Tree` | `getMenuTree`, `getOrgTree` |

#### 2.2.2 入参类型规范

**推荐使用 Command/Query 作为入参**：

| 入参类型 | 使用场景 | 命名模式 | 示例 |
|---|---|---|---|
| **Command** | 创建/更新/删除等**写操作** | `CreateXxxCommand`, `UpdateXxxCommand`, `DeleteXxxCommand`, `XxxCommand` | `CreateUserCommand`, `UpdateUserCommand`, `LoginCommand`, `SendNotifyCommand` |
| **Query** | 查询操作 | `PageXxxQuery`, `GetXxxByIdQuery`, `ListXxxQuery` | `PageUserQuery`, `GetUserByIdQuery`, `ListDictItemQuery` |
| **PageQuery** | 分页查询 | `PageXxxQuery`（继承 `BasePageQuery`） | `PageUserQuery`, `PageRoleQuery`, `PageDictTypeQuery` |
| **基本类型** | 简单操作（删除、详情查询、按键读取） | `String id`, `String code`, `String key` | `removeUser(String id)`, `getUserDetail(String id)`, `getParamValueByKey(String paramKey)` |
| **DTO** | 跨 Service 调用（允许） | `{Entity}Dto` | `updateUserFromDto(UserDto dto)` |

**Command 与 Query 区别**：

| 类型 | 语义 | 适用场景 |
|---|---|---|
| **Command** | 写操作（创建/更新/删除/执行） | 数据变更、业务执行、状态修改 |
| **Query** | 读操作（查询/检索） | 数据查询、详情获取、列表检索 |
| **PageQuery** | 分页查询 | 继承 `BasePageQuery`，包含分页参数 |

```
// ✅ 正确 - Command 用于写操作
String createUser(CreateUserCommand command);
String updateUser(UpdateUserCommand command);
Boolean removeUser(DeleteUserCommand command);  // 或简单场景使用 String id
void sendNotify(SendNotifyCommand command);

// ✅ 正确 - Query 用于读操作
IPage<UserDto> pageUsers(PageUserQuery query);
UserDetailDto getUserDetail(GetUserByIdQuery query);  // 或简单场景使用 String id
List<RoleDto> listRoles(ListRoleQuery query);

// ✅ 正确 - 分页查询使用 PageQuery（继承 BasePageQuery）
@Data
@EqualsAndHashCode(callSuper = true)
public class PageUserQuery extends BasePageQuery {
    private String username;
    private Integer status;
}

// ✅ 正确 - 允许基本类型作为入参（简单场景）
UserDetailDto getUserDetail(String id);
Boolean removeUser(String id);
String getParamValueByKey(String paramKey);

// ✅ 正确 - 允许其他 Service 方法以 DTO 作为入参
void syncUserFromDto(UserDto dto);  // 跨 Service 调用

// ❌ 错误 - 使用 Req 作为入参
UserDetailDto createUser(CreateUserReq req);  // Req 仅用于 Controller 层

// ❌ 错误 - 使用 Resp 作为入参
void updateUser(UserDetailResp resp);  // Resp 仅用于 Controller 层
```

#### 2.2.3 返回值类型规范

| 返回值类型 | 使用场景 | 示例 |
|---|---|---|
| **IPage<{Entity}Dto>** | 分页查询 | `IPage<UserDto>`, `IPage<RoleDto>` |
| **{Entity}DetailDto** | 详情查询 | `UserDetailDto`, `RoleDetailDto` |
| **{Entity}Dto** | 列表项/简单返回 | `UserDto`, `RoleDto` |
| **{Entity}TreeDto** | 树形结构 | `MenuTreeDto`, `OrganizationTreeDto` |
| **List<DTO>** | 列表查询 | `List<RoleDto>`, `List<MenuTreeDto>` |
| **{Action}ResultDto** | 业务操作结果 | `LoginResultDto`, `SendResultDto` |
| **String** | 创建/更新返回 ID | `createUser() -> String`, `updateUser() -> String` |
| **Boolean** | 删除/标记操作 | `removeUser() -> Boolean`, `markRead() -> Boolean` |
| **void** | 无需返回结果 | `logout()`, `deleteFile()` |

```
// ✅ 正确 - 分页返回 IPage<DTO>
IPage<UserDto> pageUsers(PageUserQuery query);

// ✅ 正确 - 详情返回 DetailDto
UserDetailDto getUserDetail(String id);

// ✅ 正确 - 创建返回 ID（String）
String createUser(CreateUserCommand command);

// ✅ 正确 - 删除返回 Boolean
Boolean removeUser(String id);

// ✅ 正确 - 树形返回 List<TreeDto>
List<MenuTreeDto> getMenuTree();

// ✅ 正确 - 业务操作返回 ResultDto
LoginResultDto login(LoginCommand command);

// ✅ 正确 - 列表返回 List<DTO>
List<RoleDto> listAllRoles();

// ❌ 错误 - 返回 Resp 类型
UserDetailResp getUserDetail(String id);  // 应返回 DTO

// ❌ 错误 - 分页返回 PageResp（应为 IPage）
PageResp<UserDto> pageUsers(PageUserQuery query);  // Controller 转换为 PageResp
```

#### 2.2.4 完整方法签名示例

```java
public interface IUserService {

    // === 标准 CRUD 模式 ===
    String createUser(CreateUserCommand command);              // 创建 -> 返回ID
    String updateUser(UpdateUserCommand command);              // 更新 -> 返回ID
    Boolean removeUser(String id);                             // 删除 -> Boolean
    UserDetailDto getUserDetail(String id);                    // 详情 -> DetailDto
    IPage<UserDto> pageUsers(PageUserQuery query);             // 分页 -> IPage<DTO>

    // === 列表/树形模式 ===
    List<RoleDto> listAllRoles();                              // 全量列表 -> List<DTO>
    List<MenuTreeDto> getMenuTree();                           // 树形 -> List<TreeDto>

    // === 业务操作模式 ===
    LoginResultDto login(LoginCommand command);                // 登录 -> ResultDto
    CurrentUserDto getCurrentUser();                           // 当前用户 -> DTO
    void logout(String cacheKey, String userId);               // 登出 -> void

    // === 按键读取模式 ===
    String getParamValueByKey(String paramKey);                // 字符串值
    Boolean getBooleanParamByKey(String paramKey);             // 布尔值
    Integer getIntegerParamByKey(String paramKey);             // 整数值
}
```

```
// ✅ 正确
UserDetailDto createUser(CreateUserCommand command);
UserDetailDto updateUser(UpdateUserCommand command);
void removeUser(DeleteUserCommand command);
UserDetailDto getUserDetail(Long id);
IPage<UserDto> pageUsers(PageUserQuery query);
List<RoleDto> listAllRoles();

// ❌ 错误
UserDetailDto getUser(Long id);             // Service 应使用 getUserDetail
void deleteUser(Long id);                   // 应使用 remove
PageResp<UserDto> pageUser(PageUserQuery query);  // 应使用 IPage，复数 pageUsers
UserDetailResp getUserDetail(String id);    // 应返回 DTO，而非 Resp
CreateUserCommand createUser(UserDto dto);  // 入参应为 Command
```

### 2.3 特殊业务方法命名

| 操作类型 | 前缀 | 示例 |
|---|---|---|
| **状态标记** | `mark` | `markAnnouncementRead`, `markSiteMessageRead` |
| **发送操作** | `send` | `sendNotify`, `sendMessage` |
| **批量操作** | `batch` + 操作 | `batchUpdateParamValues`, `batchDeleteUsers` |
| **保存或更新** | `saveOrUpdate` | `saveOrUpdateSystemParamByKey` |
| **按键/按条件读取** | `get` + 属性 + By条件 | `getParamValueByKey`, `getUserByUsername` |
| **校验操作** | `validate` 或 `check` | `validatePermission`, `checkExists` |
| **启用/禁用** | `enable` / `disable` | `enableUser`, `disableMenu` |

---

## 三、字段命名规范

### 3.1 Entity/DTO 字段

- 使用 **camelCase**（驼峰命名）
- 布尔字段见 [数据库规范 - 布尔类型](./04-database.md)
- 时间字段使用 `xxxTime`（如 `createTime`, `updateTime`, `publishTime`）
- ID 字段使用 `xxxId`（如 `userId`, `roleId`, `parentId`）

```
// ✅ 正确
private String username;
private Long userId;
private Boolean enabled;          // 见数据库规范
private LocalDateTime createTime;

// ❌ 错误
private String user_name;         // 应使用 camelCase
private Long ID;                  // 应使用 id 或 xxxId
private Boolean is_enabled;       // 禁止 is 前缀，见数据库规范
```

### 3.2 常量命名

- 使用 **UPPER_SNAKE_CASE**（全大写下划线分隔）
- 常量类使用 `Constants` 或 `XxxConstants` 后缀

```
// ✅ 正确
public static final String DEFAULT_PASSWORD = "******";
public static final int MAX_PAGE_SIZE = 100;
public class UserConstants { ... }

// ❌ 错误
public static final String defaultPassword = "******";
public static final int maxPageSize = 100;
```

---

## 四、包命名规范

### 4.1 模块包结构

- **基础包**: `cn.cloudomni.nebula`
- **模块包**: `cn.cloudomni.nebula.{模块名}`（如 `auth`, `dict`, `param`, `notify`）
- **分层包**:

| 包名 | 所属模块 | 内容 |
|---|---|---|
| `model/entity` | core | Entity 类 |
| `model/dto` | api | DTO 类 |
| `model/command` | api | Command 类（写操作参数） |
| `model/query` | api | Query 类（读操作参数），继承 `BasePageQuery` |
| `model/query` | base-common | `BasePageQuery` 基类 |
| `model/req` | local | Request 类（Controller 入参），继承 `BasePageReq` |
| `model/req` | base-common | `BasePageReq` 基类 |
| `model/resp` | local | Response 类（Controller 出参） |
| `model/convert` | local | LocalConverter（Req ↔ Command/Query, DTO ↔ Resp） |
| `convert` 或 `model/convert` | core | CoreConverter（Entity ↔ DTO） |
| `controller` | local | Controller 类 |
| `service` | api | Service 接口 |
| `service/impl` | core | Service 实现 |
| `dao` | core | Dao 类 |
| `dao/mapper` | core | Mapper 接口 |

---

## 五、禁止行为

### 5.1 类命名禁止

- ❌ DTO 使用全大写后缀 `DTO`（应使用 `Dto`）
- ❌ Service 接口缺少 `I` 前缀（如 `UserService` 应为 `IUserService`）
- ❌ Service 实现缺少 `Impl` 后缀（如 `UserService` 应为 `UserServiceImpl`）
- ❌ Dao 使用全大写后缀 `DAO`（应使用 `Dao`）
- ❌ Entity 使用无后缀命名（如 `User` 应为 `UserEntity`）
- ❌ Req/Resp 用于 Service 接口参数（应使用 Command/Query/DTO）
- ❌ Req/Resp 类命名不以 `Req`/`Resp` 结尾（如 `CreateUserRequest` 应为 `CreateUserReq`）
- ❌ Converter 配置 `componentModel = "spring"`（应使用 default 模式 + INSTANCE）
- ❌ Converter 通过 Spring DI 注入（应使用 `XxxConverter.INSTANCE`）
- ❌ PageQuery 继承 `BasePageReq`（应继承 `BasePageQuery`）

### 5.2 方法命名禁止

- ❌ 删除操作使用 `delete`（应统一使用 `remove`）
- ❌ Controller 获取详情使用 `getById`（应使用 `get` + 实体名）
- ❌ Service 获取详情使用 `get` + 实体名（应使用 `get` + 实体名 + `Detail`）
- ❌ 分页方法使用单数形式（应使用复数，如 `pageUsers`）
- ❌ 方法名使用中文拼音或无意义缩写（如 `getUserList` 应为 `listUsers`）
- ❌ Service 使用 `Req`/`Resp` 作为参数（应使用 `Command`/`Query`/`DTO`）
- ❌ Service 返回 `Resp` 类型（应返回 `DTO`，由 Controller 转换）
- ❌ Service 分页返回 `PageResp`（应返回 `IPage<DTO>`，由 Controller 转换）
- ❌ Controller 直接传递 `Req` 给 Service（应先通过 LocalConverter 转换为 Command/Query）

### 5.3 字段命名禁止

- ❌ 使用 snake_case（如 `user_name`）
- ❌ 布尔字段使用 `is` 前缀（见数据库规范）
- ❌ 使用 SQL 关键字作为字段名（如 `select`, `from`, `order`）

### 5.4 Converter 禁止

- ❌ Converter 配置 `@Mapper(componentModel = "spring")`
- ❌ Converter 通过 `@Autowired` 注入使用
- ❌ Converter INSTANCE 使用完整路径（应导入后使用 `Mappers.getMapper()`）
- ❌ LocalConverter 放在 core 模块（应放在 local 模块）
- ❌ CoreConverter 放在 local 模块（应放在 core 模块）

---

## 六、命名对照速查表

### 6.1 类后缀对照

| 类型 | 后缀 | 示例 | 位置 | 职责 |
|---|---|---|---|---|
| Entity | `Entity` | `UserEntity` | core/model/entity | 数据库实体 |
| DTO | `Dto` | `UserDto`, `UserDetailDto` | api/model/dto | Service 层数据传输 |
| Command | `Command` | `CreateUserCommand` | api/model/command | Service 写操作入参 |
| Query | `Query` | `PageUserQuery` | api/model/query | Service 读操作入参 |
| PageQuery | `PageQuery` | `PageUserQuery`（继承 `BasePageQuery`） | api/model/query | 分页查询参数 |
| BasePageQuery | - | `BasePageQuery` | base-common/model/query | 分页查询基类 |
| Request | `Req` | `CreateUserReq` | local/model/req | Controller 入参 |
| BasePageReq | - | `BasePageReq` | base-common/model/req | 分页请求基类 |
| Response | `Resp` | `UserDetailResp` | local/model/resp | Controller 出参 |
| Controller | `Controller` | `UserController` | local/controller | HTTP 接口 |
| Service接口 | `IXxxService` | `IUserService` | api/service | 业务接口 |
| Service实现 | `ServiceImpl` | `UserServiceImpl` | core/service/impl | 业务实现 |
| Dao | `Dao` | `UserDao` | core/dao | 数据访问 |
| Mapper | `Mapper` | `UserMapper` | core/dao/mapper | MyBatis Mapper |
| CoreConverter | `Converter` | `UserConverter` | core/convert 或 model/convert | Entity ↔ DTO 转换 |
| LocalConverter | `LocalConverter` | `UserLocalConverter` | local/model/convert | Req ↔ Command/Query, DTO ↔ Resp 转换 |

### 6.2 Converter 职责对照

| Converter | 所在层 | 包名 | 转换方向 | 使用场景 |
|---|---|---|---|---|
| `XxxConverter` | core | `convert/` 或 `model/convert/` | Entity ↔ DTO | ServiceImpl 内部 |
| `XxxLocalConverter` | local | `model/convert/` | Req ↔ Command/Query, DTO ↔ Resp | Controller 层适配 |

### 6.3 Service 层参数对照

| 入参类型 | 语义 | 适用场景 | 示例 |
|---|---|---|---|
| `Command` | 写操作 | 创建/更新/删除/执行 | `CreateUserCommand`, `LoginCommand` |
| `Query` | 读操作 | 查询/检索 | `PageUserQuery`, `GetUserByIdQuery` |
| `PageQuery` | 分页查询 | 继承 `BasePageQuery` | `PageUserQuery`, `PageRoleQuery` |
| 基本类型 | 简单操作 | 删除/详情/按键读取 | `String id`, `String key` |
| `DTO` | 跨 Service | 允许其他 Service 以 DTO 入参 | `UserDto` |

| 返回值类型 | 适用场景 | 示例 |
|---|---|---|
| `IPage<DTO>` | 分页查询 | `IPage<UserDto>` |
| `DetailDto` | 详情查询 | `UserDetailDto` |
| `Dto` | 列表项/简单返回 | `UserDto` |
| `TreeDto` | 树形结构 | `MenuTreeDto` |
| `List<DTO>` | 列表查询 | `List<RoleDto>` |
| `ResultDto` | 业务操作结果 | `LoginResultDto` |
| `String` | 创建/更新返回 ID | 返回实体 ID |
| `Boolean` | 删除/标记操作 | 返回是否成功 |
| `void` | 无需返回 | 无返回值操作 |

### 6.4 方法前缀对照

| 操作 | 前缀 | Controller | Service |
|---|---|---|---|
| 创建 | `create` | `createUser` | `createUser` |
| 更新 | `update` | `updateUser` | `updateUser` |
| 删除 | `remove` | `removeUser` | `removeUser` |
| 详情 | `get` | `getUser` | `getUserDetail` |
| 分页 | `page` | `pageUsers` | `pageUsers` |
| 列表 | `list` | `listAllRoles` | `listAllRoles` |
| 树形 | `get` + `Tree` | `getMenuTree` | `getMenuTree` |
| 标记 | `mark` | `markRead` | `markRead` |
| 发送 | `send` | `sendNotify` | `sendNotify` |
| 批量 | `batch` | `batchUpdate` | `batchUpdate` |