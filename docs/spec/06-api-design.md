# 接口设计规范

## 一、分页接口约定

- 分页接口统一使用 `POST`，不再使用 `GET` 传递分页条件。
- 分页参数与业务查询条件统一放在请求体中传递，即使只有 `pageNum`、`pageSize` 两个字段也必须走请求体。
- 新增分页接口时，Controller、Feign Client 与对外文档必须保持同一契约，避免本地调用、远程调用和 README 描述不一致。

---

## 二、OpenAPI 注解规范

`nebula-base-web` 模块已集成 OpenAPI（Swagger）依赖，所有 Controller、Req/Resp 类必须添加 `@Schema` 相关注解，确保接口文档清晰完整。

### 2.1 Controller 注解规范

**类级别注解**：

每个 Controller 类必须添加 `@Tag` 注解，描述接口分组：

```java
// ✅ 正确 - Controller 类注解
@Tag(name = "用户管理", description = "用户的增删改查接口")
@RestController
@RequestMapping("/api/auth/users")
public class UserController {
    // ...
}

// ❌ 错误 - 缺少 @Tag 注解
@RestController
@RequestMapping("/api/auth/users")
public class UserController {
    // ...
}
```

**方法级别注解**：

每个接口方法必须添加 `@Operation` 注解，描述接口功能：

```java
// ✅ 正确 - 方法注解
@Operation(summary = "创建用户", description = "根据请求参数创建新用户")
@PostMapping
public ApiResult<UserDetailResp> createUser(@RequestBody CreateUserReq req) {
    // ...
}

@Operation(summary = "分页查询用户", description = "根据条件分页查询用户列表")
@PostMapping("/page")
public ApiResult<PageResp<UserResp>> pageUsers(@RequestBody UserPageReq req) {
    // ...
}

@Operation(summary = "获取用户详情", description = "根据用户ID获取用户详细信息")
@GetMapping("/{id}")
public ApiResult<UserDetailResp> getUser(@PathVariable Long id) {
    // ...
}

// ❌ 错误 - 缺少 @Operation 注解
@PostMapping
public ApiResult<UserDetailResp> createUser(@RequestBody CreateUserReq req) {
    // ...
}
```

**参数注解**：

接口参数应添加 `@Parameter` 注解描述：

```java
// ✅ 正确 - 路径参数注解
@Operation(summary = "获取用户详情")
@GetMapping("/{id}")
public ApiResult<UserDetailResp> getUser(
    @Parameter(name = "id", description = "用户ID", required = true, example = "1")
    @PathVariable Long id
) {
    // ...
}

// ✅ 正确 - 请求体参数注解
@Operation(summary = "创建用户")
@PostMapping
public ApiResult<UserDetailResp> createUser(
    @RequestBody(description = "创建用户请求参数", required = true)
    @Valid CreateUserReq req
) {
    // ...
}
```

### 2.2 Req 类注解规范

所有 Req 类的字段必须添加 `@Schema` 注解，说明字段描述、是否必填、验证规则（如有）。

**基础字段注解**：

```java
// ✅ 正确 - Req 类字段注解
@Data
@Schema(description = "创建用户请求参数")
public class CreateUserReq {

    @Schema(description = "用户名", required = true, example = "admin")
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 20, message = "用户名长度必须在3-20之间")
    private String username;

    @Schema(description = "昵称", required = true, example = "管理员")
    @NotBlank(message = "昵称不能为空")
    private String nickname;

    @Schema(description = "邮箱", requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "admin@example.com")
    @Email(message = "邮箱格式不正确")
    private String email;

    @Schema(description = "手机号", requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "13800138000")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @Schema(description = "状态", requiredMode = Schema.RequiredMode.NOT_REQUIRED, 
            allowableValues = {"0", "1"}, defaultValue = "1", example = "1")
    private Integer status;
}
```

**分页请求注解**：

```java
// ✅ 正确 - 分页请求注解
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "用户分页查询请求参数")
public class UserPageReq extends BasePageReq {

    @Schema(description = "用户名（模糊查询）", requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "admin")
    private String username;

    @Schema(description = "昵称（模糊查询）", requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "管理员")
    private String nickname;

    @Schema(description = "状态", requiredMode = Schema.RequiredMode.NOT_REQUIRED, 
            allowableValues = {"0", "1"}, example = "1")
    private Integer status;
}

// BasePageReq 基类注解
@Data
@Schema(description = "分页请求基类")
public class BasePageReq {

    @Schema(description = "页码", defaultValue = "1", example = "1", minimum = "1")
    private Integer pageNum = 1;

    @Schema(description = "每页条数", defaultValue = "20", example = "20", minimum = "1", maximum = "100")
    private Integer pageSize = 20;

    @Schema(description = "排序字段", requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "createTime")
    private String orderName;

    @Schema(description = "排序方式", defaultValue = "desc", allowableValues = {"asc", "desc"}, example = "desc")
    private String orderType = "desc";
}
```

### 2.3 Resp 类注解规范

所有 Resp 类的字段必须添加 `@Schema` 注解，说明字段描述和示例值。

**详情响应注解**：

```java
// ✅ 正确 - Resp 类字段注解
@Data
@Schema(description = "用户详情响应")
public class UserDetailResp {

    @Schema(description = "用户ID", example = "1")
    private Long id;

    @Schema(description = "用户名", example = "admin")
    private String username;

    @Schema(description = "昵称", example = "管理员")
    private String nickname;

    @Schema(description = "邮箱", example = "admin@example.com")
    private String email;

    @Schema(description = "手机号", example = "13800138000")
    private String phone;

    @Schema(description = "状态", allowableValues = {"0", "1"}, example = "1")
    private Integer status;

    @Schema(description = "创建时间", example = "2024-01-01 10:00:00")
    private LocalDateTime createTime;

    @Schema(description = "更新时间", example = "2024-01-01 11:00:00")
    private LocalDateTime updateTime;
}
```

### 2.4 @Schema 注解属性说明

| 属性 | 类型 | 说明 | 使用场景 |
|---|---|---|---|
| `description` | `String` | 字段描述 | **必填**，所有字段必须提供 |
| `required` | `boolean` | 是否必填 | 必填字段设为 `true` |
| `requiredMode` | `RequiredMode` | 必填模式 | 推荐使用 `Schema.RequiredMode.REQUIRED` 或 `NOT_REQUIRED` |
| `example` | `String` | 示例值 | **必填**，便于文档展示 |
| `defaultValue` | `String` | 默认值 | 有默认值的字段 |
| `allowableValues` | `String[]` | 允许值列表 | 枚举类字段、状态字段 |
| `minimum` | `String` | 最小值 | 数值类字段 |
| `maximum` | `String` | 最大值 | 数值类字段 |
| `hidden` | `boolean` | 是否隐藏 | 不对外暴露的字段 |

**requiredMode 推荐用法**：

```java
// ✅ 推荐 - 使用 requiredMode
@Schema(description = "用户名", requiredMode = Schema.RequiredMode.REQUIRED, example = "admin")
private String username;

@Schema(description = "邮箱", requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "admin@example.com")
private String email;

// ⚠️ 可接受 - 使用 required（旧方式）
@Schema(description = "用户名", required = true, example = "admin")
private String username;
```

### 2.5 完整 Controller 示例

```java
@Tag(name = "用户管理", description = "用户的增删改查接口")
@RestController
@RequestMapping("/api/auth/users")
@RequiredArgsConstructor
public class UserController {

    private final IUserService userService;

    @Operation(summary = "创建用户", description = "根据请求参数创建新用户，返回用户详情")
    @PostMapping
    public ApiResult<UserDetailResp> createUser(
        @RequestBody(description = "创建用户请求参数", required = true)
        @Valid CreateUserReq req
    ) {
        CreateUserCommand command = UserLocalConverter.INSTANCE.toCommand(req);
        UserDetailDto dto = userService.createUser(command);
        return ApiResult.success(UserLocalConverter.INSTANCE.toResp(dto));
    }

    @Operation(summary = "更新用户", description = "根据用户ID更新用户信息")
    @PutMapping("/{id}")
    public ApiResult<UserDetailResp> updateUser(
        @Parameter(name = "id", description = "用户ID", required = true, example = "1")
        @PathVariable Long id,
        @RequestBody(description = "更新用户请求参数", required = true)
        @Valid UpdateUserReq req
    ) {
        UpdateUserCommand command = UserLocalConverter.INSTANCE.toCommand(id, req);
        UserDetailDto dto = userService.updateUser(command);
        return ApiResult.success(UserLocalConverter.INSTANCE.toResp(dto));
    }

    @Operation(summary = "删除用户", description = "根据用户ID删除用户")
    @DeleteMapping("/{id}")
    public ApiResult<Void> removeUser(
        @Parameter(name = "id", description = "用户ID", required = true, example = "1")
        @PathVariable Long id
    ) {
        userService.removeUser(id);
        return ApiResult.success();
    }

    @Operation(summary = "获取用户详情", description = "根据用户ID获取用户详细信息")
    @GetMapping("/{id}")
    public ApiResult<UserDetailResp> getUser(
        @Parameter(name = "id", description = "用户ID", required = true, example = "1")
        @PathVariable Long id
    ) {
        UserDetailDto dto = userService.getUserDetail(id);
        return ApiResult.success(UserLocalConverter.INSTANCE.toResp(dto));
    }

    @Operation(summary = "分页查询用户", description = "根据条件分页查询用户列表")
    @PostMapping("/page")
    public ApiResult<PageResp<UserResp>> pageUsers(
        @RequestBody(description = "分页查询请求参数", required = true)
        @Valid UserPageReq req
    ) {
        PageUserQuery query = UserLocalConverter.INSTANCE.toQuery(req);
        IPage<UserDto> page = userService.pageUsers(query);
        return ApiResult.success(PageResp.of(
            UserLocalConverter.INSTANCE.toRespList(page.getRecords()),
            page.getTotal()
        ));
    }
}
```

---

## 三、RESTful 约定

### 3.1 URL 路径设计

**路径命名规范**：

- 使用小写字母和连字符（`-`）
- 使用名词表示资源，避免动词
- 资源层级不超过3层

```
// ✅ 正确
/api/auth/users
/api/auth/users/{id}
/api/auth/users/{id}/roles
/api/dict/types
/api/dict/items

// ❌ 错误
/api/auth/getUser/{id}    // 避免动词
/api/Auth/Users           // 避免大写
/api/auth/user_info       // 避免下划线
/api/auth/users/roles/permissions  // 层级过深
```

### 3.2 HTTP 方法选择

| 操作 | HTTP 方法 | 示例路径 |
|---|---|---|
| 创建资源 | `POST` | `POST /api/auth/users` |
| 更新资源 | `PUT` | `PUT /api/auth/users/{id}` |
| 删除资源 | `DELETE` | `DELETE /api/auth/users/{id}` |
| 获取单个资源 | `GET` | `GET /api/auth/users/{id}` |
| 分页查询 | `POST` | `POST /api/auth/users/page` |
| 列表查询 | `GET` | `GET /api/auth/roles/list` |
| 树形查询 | `GET` | `GET /api/auth/menus/tree` |

---

## 四、参数校验

### 4.1 入参校验约定

**使用 JSR-303 注解进行参数校验**：

Req 类字段必须添加校验注解，配合 `@Valid` 触发校验。

| 校验类型 | 注解 | 说明 |
|---|---|---|
| 非空校验 | `@NotBlank` | 字符串不能为 null、空字符串或纯空格 |
| 非空校验 | `@NotNull` | 对象不能为 null |
| 非空校验 | `@NotEmpty` | 集合、数组不能为 null 或空 |
| 长度校验 | `@Size(min, max)` | 字符串、集合长度范围 |
| 数值范围 | `@Min`, `@Max` | 数值最小/最大值 |
| 正则校验 | `@Pattern(regexp)` | 正则表达式匹配 |
| 邮箱校验 | `@Email` | 邮箱格式 |
| 枚举校验 | 自定义注解 | 枚举值校验 |

```java
// ✅ 正确 - 参数校验注解
@Data
@Schema(description = "创建用户请求参数")
public class CreateUserReq {

    @Schema(description = "用户名", requiredMode = Schema.RequiredMode.REQUIRED, example = "admin")
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 20, message = "用户名长度必须在3-20之间")
    private String username;

    @Schema(description = "昵称", requiredMode = Schema.RequiredMode.REQUIRED, example = "管理员")
    @NotBlank(message = "昵称不能为空")
    private String nickname;

    @Schema(description = "年龄", requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "25")
    @Min(value = 0, message = "年龄不能小于0")
    @Max(value = 150, message = "年龄不能大于150")
    private Integer age;

    @Schema(description = "邮箱", requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "admin@example.com")
    @Email(message = "邮箱格式不正确")
    private String email;
}

// Controller 使用 @Valid 触发校验
@PostMapping
public ApiResult<UserDetailResp> createUser(@Valid @RequestBody CreateUserReq req) {
    // ...
}
```

---

## 五、响应结构

### 5.1 ApiResult 使用约定

**统一响应格式**：

```java
// 成功响应（无数据）
@ApiResult.success()

// 成功响应（有数据）
@ApiResult.success(data)

// 失败响应（错误码 + 消息）
@ApiResult.fail(code, message)

// 失败响应（BusinessException）
@ApiResult.fail(exception)
```

**响应结构**：

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "id": 1,
        "username": "admin"
    }
}
```

### 5.2 PageResp 使用约定

**分页响应结构**：

```java
// Controller 转换 IPage 为 PageResp
@PostMapping("/page")
public ApiResult<PageResp<UserResp>> pageUsers(@Valid @RequestBody UserPageReq req) {
    PageUserQuery query = UserLocalConverter.INSTANCE.toQuery(req);
    IPage<UserDto> page = userService.pageUsers(query);
    return ApiResult.success(PageResp.of(
        UserLocalConverter.INSTANCE.toRespList(page.getRecords()),
        page.getTotal()
    ));
}
```

**PageResp 结构**：

```json
{
    "code": "00000",
    "message": "success",
    "data": {
        "total": 100,
        "pageNum": 1,
        "pageSize": 20,
        "list": [
            { "id": 1, "username": "admin" },
            { "id": 2, "username": "user" }
        ]
    }
}
```

---

## 六、禁止行为

### 6.1 注解缺失禁止

- ❌ Controller 类缺少 `@Tag` 注解
- ❌ Controller 方法缺少 `@Operation` 注解
- ❌ Req 类字段缺少 `@Schema` 注解
- ❌ Resp 类字段缺少 `@Schema` 注解
- ❌ `@Schema` 注解缺少 `description` 属性
- ❌ `@Schema` 注解缺少 `example` 属性

### 6.2 URL 设计禁止

- ❌ URL 包含动词（如 `/getUser/{id}`）
- ❌ URL 使用大写字母（如 `/Auth/Users`）
- ❌ URL 使用下划线（如 `/user_info`）
- ❌ URL 层级超过3层

### 6.3 参数校验禁止

- ❌ 必填字段缺少校验注解（如 `@NotBlank`）
- ❌ Controller 方法参数缺少 `@Valid` 注解
- ❌ 校验注解缺少 `message` 属性

---

## 七、速查表

### 7.1 Controller 注解速查

| 注解 | 位置 | 必填属性 | 示例 |
|---|---|---|---|
| `@Tag` | 类 | `name`, `description` | `@Tag(name = "用户管理", description = "...")` |
| `@Operation` | 方法 | `summary` | `@Operation(summary = "创建用户")` |
| `@Parameter` | 参数 | `name`, `description` | `@Parameter(name = "id", description = "用户ID")` |
| `@RequestBody` | 参数 | `description`, `required` | `@RequestBody(description = "...", required = true)` |

### 7.2 @Schema 属性速查

| 属性 | 必填 | 说明 |
|---|---|---|
| `description` | **是** | 字段描述 |
| `example` | **是** | 示例值 |
| `requiredMode` | 推荐 | `REQUIRED` 或 `NOT_REQUIRED` |
| `allowableValues` | 枚举字段必填 | 允许值列表 |
| `defaultValue` | 有默认值时必填 | 默认值 |