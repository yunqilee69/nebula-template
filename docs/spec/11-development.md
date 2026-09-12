# 开发规范

## 一、代码风格

### 1.1 缩进与空格

| 规则 | 值 | 说明 |
|---|---|---|
| **缩进** | 4 空格 | 禁止使用 Tab |
| **行最大长度** | 120 字符 | 超长行需换行 |
| **方法间空行** | 1 行 | 方法之间保留一个空行 |
| **逻辑块间空行** | 1 行 | 同一方法内不同逻辑块之间 |
| **左大括号** | 不换行 | `{` 与前文同行，前面加 1 空格 |
| **右大括号** | 独占一行 | `}` 单独一行，与语句块开头对齐 |

```java
// ✅ 正确 - 4 空格缩进，方法间空行
@Override
@Transactional(rollbackFor = Exception.class)
public String createUser(CreateUserCommand command) {
    log.info("创建用户: username={}", command.getUsername());
    
    // Check if username exists
    long count = userDAO.countByUsername(command.getUsername());
    if (count > 0) {
        throw new BusinessException(AuthErrorInfo.USERNAME_ALREADY_EXISTS);
    }
    
    UserEntity user = new UserEntity();
    user.setUsername(command.getUsername());
    userDAO.save(user);
    
    return user.getId();
}

// ❌ 错误 - 使用 Tab 缩进
public String createUser(CreateUserCommand command) {
\tlog.info("创建用户");  // 禁止 Tab
\tUserEntity user = new UserEntity();
\treturn user.getId();
}

// ❌ 错误 - 方法间无空行
public String createUser(CreateUserCommand command) { ... }
public Boolean removeUser(String id) { ... }  // 应有空行分隔

// ❌ 错误 - 左大括号换行
public String createUser(CreateUserCommand command)
{
    return user.getId();
}
```

### 1.2 Import 导入顺序

Import 语句按以下顺序分组，每组之间空一行：

| 序号 | 类型 | 示例 |
|---|---|---|
| 1 | Java 标准库 | `java.util.*`, `java.time.*` |
| 2 | 第三方框架 | `com.baomidou.*`, `org.apache.*` |
| 3 | Spring 框架 | `org.springframework.*` |
| 4 | Jakarta/Servlet | `jakarta.*` |
| 5 | Lombok | `lombok.*` |
| 6 | Swagger/OpenAPI | `io.swagger.*` |
| 7 | 项目内部（cn.cloudomni） | `cn.cloudomni.nebula.*` |
| 8 | 静态导入 | `static xxx.*` |

**组内排序规则**：按包名字母升序排列。

```java
// ✅ 正确 - Import 分组排序
package cn.cloudomni.nebula.auth.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import cn.cloudomni.nebula.common.exception.BusinessException;
import cn.cloudomni.nebula.auth.converter.UserConverter;
import cn.cloudomni.nebula.auth.dao.*;
import cn.cloudomni.nebula.auth.model.entity.*;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

// ❌ 错误 - Import 未分组
import org.springframework.stereotype.Service;
import java.util.List;
import cn.cloudomni.nebula.auth.model.entity.UserEntity;
import lombok.extern.slf4j.Slf4j;
import com.baomidou.mybatisplus.core.metadata.IPage;

// ❌ 错误 - 使用通配符导入（禁止）
import java.util.*;  // 应明确导入具体类
import lombok.*;     // 应明确导入 @Slf4j, @Data 等

// ❌ 错误 - 未导入但使用完整路径
org.mapstruct.factory.Mappers.getMapper(UserConverter.class);  // 应先导入
```

### 1.3 注解排列

多个注解按以下顺序排列：

| 序号 | 注解类型 | 示例 |
|---|---|---|
| 1 | 文档注解 | `@Tag`, `@Operation`, `@Schema` |
| 2 | Spring 条件注解 | `@ConditionalOnProperty`, `@ConditionalOnBean`, `@ConditionalOnMissingBean` |
| 3 | Spring 组件注解 | `@Service`, `@RestController`, `@Component`, `@Configuration` |
| 4 | Spring MVC 注解 | `@RequestMapping`, `@GetMapping`, `@PostMapping` |
| 5 | Spring AOP 注解 | `@Transactional`, `@Async` |
| 6 | Lombok 注解 | `@Slf4j`, `@Data`, `@RequiredArgsConstructor` |
| 7 | 参数注解 | `@PathVariable`, `@RequestBody`, `@Valid` |

**注解格式**：
- 类注解：每个注解独占一行，对齐排列
- 方法注解：每个注解独占一行，对齐排列
- 参数注解：与参数同行

```java
// ✅ 正确 - 类注解排列
@Tag(name = "用户管理", description = "用户相关接口")
@RestController
@RequestMapping("/api/auth/users")
@RequiredArgsConstructor
public class UserController {
    // ...
}

// ✅ 正确 - 方法注解排列
@Override
@Transactional(rollbackFor = Exception.class)
public String createUser(CreateUserCommand command) {
    // ...
}

// ✅ 正确 - Controller 方法注解
@Operation(summary = "创建用户", description = "创建新用户")
@PostMapping
public ApiResult<String> createUser(@Valid @RequestBody CreateUserReq req) {
    // ...
}

// ❌ 错误 - 注解未分行
@RestController @RequestMapping("/api/auth/users") @RequiredArgsConstructor
public class UserController { ... }  // 每个注解应独占一行

// ❌ 错误 - 注解顺序混乱
@RequiredArgsConstructor
@RestController
@Tag(name = "用户管理")
@RequestMapping("/api/auth/users")
public class UserController { ... }  // 文档注解应在最前
```

### 1.4 代码块格式

**if/else/for/while 格式**：
- 关键字与左括号之间保留 1 空格
- 左大括号不换行，前面加 1 空格
- 右大括号独占一行
- else/else if/catch/finally 与右大括号同行

```java
// ✅ 正确 - if/else 格式
if (count > 0) {
    throw new BusinessException(AuthErrorInfo.USERNAME_ALREADY_EXISTS);
} else {
    userDAO.save(user);
}

// ✅ 正确 - for 循环格式
for (String roleId : roleIds) {
    UserRoleEntity userRole = new UserRoleEntity();
    userRole.setUserId(userId);
    userRole.setRoleId(roleId);
    userRoleDAO.save(userRole);
}

// ✅ 正确 - try/catch 格式
try {
    riskyOperation();
} catch (Exception e) {
    log.error("操作失败: {}", e.getMessage(), e);
    throw new BusinessException(AuthErrorInfo.OPERATION_FAILED, e);
} finally {
    cleanup();
}

// ❌ 错误 - 左大括号换行
if (count > 0)
{
    throw new BusinessException(...);
}

// ❌ 错误 - else 独占一行
if (count > 0) {
    throw new BusinessException(...);
}
else {  // else 应与前文右大括号同行
    userDAO.save(user);
}
```

### 1.5 空行使用规则

| 场景 | 空行数 | 说明 |
|---|---|---|
| 包声明与 Import 之间 | 1 行 | `package xxx;` 后空一行 |
| Import 组之间 | 1 行 | 不同 Import 组之间空一行 |
| Import 与类声明之间 | 1 行 | 最后一个 Import 后空一行 |
| 类内字段与方法之间 | 1 行 | 字段声明与第一个方法之间 |
| 方法之间 | 1 行 | 相邻方法之间 |
| 方法内逻辑块之间 | 1 行 | 不同逻辑步骤之间 |
| 方法内注释前 | 1 行 | 行注释或块注释前空一行 |

```java
// ✅ 正确 - 空行使用
package cn.cloudomni.nebula.auth.service.impl;

import java.util.List;

import com.baomidou.mybatisplus.core.metadata.IPage;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

@Slf4j
@Service
public class UserServiceImpl implements IUserService {

    private final UserDAO userDAO;
    private final RoleDAO roleDAO;
    
    @Override
    public String createUser(CreateUserCommand command) {
        log.info("创建用户: username={}", command.getUsername());
        
        // Check if username exists
        long count = userDAO.countByUsername(command.getUsername());
        if (count > 0) {
            throw new BusinessException(AuthErrorInfo.USERNAME_ALREADY_EXISTS);
        }
        
        UserEntity user = new UserEntity();
        user.setUsername(command.getUsername());
        userDAO.save(user);
        
        return user.getId();
    }
    
    @Override
    public Boolean removeUser(String id) {
        // ...
    }
}
```

---

## 二、注释规范

### 2.1 类注释

**要求**：
- 所有 **public 类** 必须有类级 Javadoc 注释
- 注释描述类的职责、主要功能、适用场景
- 使用中文描述，简洁明了
- Controller 类需注明接口入口路径

```java
// ✅ 正确 - Controller 类注释
/**
 * 用户管理控制器。
 * 对外提供用户创建、更新、删除、详情查询和分页查询接口。
 *
 * 接口入口：/api/auth/users
 */
@Tag(name = "用户管理", description = "用户相关接口")
@RestController
@RequestMapping("/api/auth/users")
public class UserController {
    // ...
}

// ✅ 正确 - Service 类注释
/**
 * 用户服务实现类。
 * 提供用户的 CRUD 操作、角色绑定、组织绑定等核心业务逻辑。
 */
@Service
public class UserServiceImpl implements IUserService {
    // ...
}

// ✅ 正确 - Entity 类注释（可简化）
@Data
@TableName("auth_user")
@Schema(description = "用户实体")
public class UserEntity extends BaseEntity {
    // 字段注释见 2.3 字段注释
}

// ❌ 错误 - 缺少类注释
@RestController
@RequestMapping("/api/auth/users")
public class UserController {
    // 缺少类级 Javadoc
}

// ❌ 错误 - 注释过于简单
/** 用户控制器 */  // 描述不够详细
public class UserController { ... }

// ❌ 错误 - 使用英文注释
/** User management controller */  // 应使用中文
public class UserController { ... }
```

### 2.2 方法注释

**要求**：
- 所有 **public 方法** 必须有方法级 Javadoc 注释
- 注释包含：方法功能描述、参数说明（`@param`）、返回值说明（`@return`）、异常说明（`@throws`）
- 使用中文描述
- Controller 方法还需配合 `@Operation` 注解

```java
// ✅ 正确 - Service 方法注释
/**
 * 创建新用户。
 *
 * @param command 用户创建命令
 * @return 新创建的用户ID
 * @throws BusinessException 当用户名已存在时抛出
 */
@Override
@Transactional(rollbackFor = Exception.class)
public String createUser(CreateUserCommand command) {
    // ...
}

// ✅ 正确 - Controller 方法注释
/**
 * 创建新用户。
 *
 * @param req 用户创建请求
 * @return 用户ID
 */
@Operation(summary = "创建用户", description = "创建新用户")
@PostMapping
public ApiResult<String> createUser(@Valid @RequestBody CreateUserReq req) {
    // ...
}

// ✅ 正确 - 简单方法可省略 @param/@return（但有参数/返回值时必须标注）
/**
 * 获取所有角色列表。
 */
@Override
public List<RoleDto> listAllRoles() {
    // ...
}

// ❌ 错误 - 缺少参数说明
/**
 * 创建用户。
 */
public String createUser(CreateUserCommand command) { ... }  // 缺少 @param/@return

// ❌ 错误 - 使用英文注释
/**
 * Create a new user.
 * @param command user creation command
 */
public String createUser(CreateUserCommand command) { ... }  // 应使用中文
```

### 2.3 字段注释

**要求**：
- Entity、DTO、Req/Resp 类的 **public 字段** 必须有注释
- 优先使用 `@Schema` 注解（OpenAPI 文档生成）
- 状态码字段需注明含义（如 `0-禁用, 1-启用`）
- 时间字段需注明格式（如 `epoch 毫秒`）

```java
// ✅ 正确 - Entity 字段注释
@Data
@TableName("auth_user")
@Schema(description = "用户实体")
public class UserEntity extends BaseEntity {

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "密码")
    private String password;

    @Schema(description = "状态: 0-禁用, 1-启用")
    private Integer status;

    @Schema(description = "权限更新时间戳(epoch毫秒), 用于判断权限新鲜度")
    private Long permissionUpdatedAt;
}

// ✅ 正确 - DTO 字段注释
@Data
@Schema(description = "用户详细信息DTO")
public class UserDetailDto {

    @Schema(description = "用户ID")
    private String id;

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "创建时间")
    private LocalDateTime createTime;
}

// ❌ 错误 - 字段缺少注释
@Data
public class UserEntity {
    private String username;  // 缺少 @Schema 注解
    private Integer status;   // 缺少状态含义说明
}

// ❌ 错误 - 使用 Javadoc 注释而非 @Schema
@Data
public class UserEntity {
    /** 用户名 */  // 应使用 @Schema 注解
    private String username;
}
```

### 2.4 行内注释

**要求**：
- 仅用于解释 **非显而易见** 的逻辑
- 使用中文，以 `//` 开头
- 注释前空一行
- 注释与代码之间保留 1 空格

```java
// ✅ 正确 - 解释非显而易见逻辑
public String createUser(CreateUserCommand command) {
    log.info("创建用户: username={}", command.getUsername());
    
    // Check if username exists
    long count = userDAO.countByUsername(command.getUsername());
    if (count > 0) {
        throw new BusinessException(AuthErrorInfo.USERNAME_ALREADY_EXISTS);
    }
    
    // Admin user cannot be deleted
    if ("admin".equals(user.getUsername())) {
        throw new BusinessException(AuthErrorInfo.CANNOT_DELETE_ADMIN);
    }
    
    return user.getId();
}

// ❌ 错误 - 注释显而易见逻辑
user.setUsername(command.getUsername());  // 设置用户名（无需注释）
userDAO.save(user);                       // 保存用户（无需注释）

// ❌ 错误 - 注释格式不规范
user.setUsername(command.getUsername());//设置用户名  // 缺少空格

// ❌ 错误 - 使用块注释解释单行逻辑
/* Check if username exists */  // 应使用 // 注释
long count = userDAO.countByUsername(command.getUsername());
```

---

## 三、IDE 配置

### 3.1 IntelliJ IDEA 配置对齐

项目要求 IDE 配置与以下设置对齐，确保代码格式统一。

**Code Style 配置**：

| 配置项 | 值 | 说明 |
|---|---|---|
| **Indent** | 4 spaces | 缩进使用 4 空格 |
| **Use tab character** | false | 禁止使用 Tab |
| **Right margin** | 120 | 行最大长度 120 |
| **Keep blank lines** | 1 | 方法/类体内最多保留 1 空行 |
| **Class count to use import with '*'** | 5 | 同包超过 5 类才使用通配符 |
| **Names count to use static import with '*'** | 3 | 静态导入超过 3 才用通配符 |

**Import Layout 配置**（顺序）：

```
1. java.*
2. <blank line>
3. com.baomidou.*
4. org.apache.*
5. <blank line>
6. org.springframework.*
7. <blank line>
8. jakarta.*
9. <blank line>
10. lombok.*
11. <blank line>
12. io.swagger.*
13. <blank line>
14. cn.cloudomni.*
15. <blank line>
16. static xxx.*
```

**Editor 配置**：

| 配置项 | 值 | 说明 |
|---|---|---|
| **Ensure line break at end of file** | true | 文件末尾保留空行 |
| **Trim trailing whitespace** | true | 自动删除行尾空白 |

### 3.2 编译器配置对齐

基于 `pom.xml` 的编译配置，IDE 应同步设置：

| 配置项 | pom.xml 值 | 说明 |
|---|---|---|
| **Java version** | 21 | `<java.version>21` |
| **Source version** | 21 | `<maven.compiler.source>21` |
| **Target version** | 21 | `<maven.compiler.target>21` |
| **Encoding** | UTF-8 | `<encoding>UTF-8` |
| **Parameters** | true | `<parameters>true`（保留参数名） |

**Annotation Processors**：
项目使用 Lombok + MapStruct，需确保 IDE 启用注解处理：

| 配置项 | 值 |
|---|---|---|
| **Enable annotation processing** | true |
| **Obtain processors from project classpath** | true |

**Processor 配置顺序**（pom.xml 已定义）：
```
1. lombok (lombok-mapstruct-binding)
2. mapstruct-processor
3. lombok-mapstruct-binding
```

### 3.3 .editorconfig 配置

项目根目录应放置 `.editorconfig` 文件，确保所有编辑器统一格式：

```editorconfig
# EditorConfig - 统一代码格式
# https://editorconfig.org

root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 4

[*.java]
max_line_length = 120

[*.xml]
indent_size = 2

[*.yml]
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.properties]
indent_size = 2
```

---

## 四、Git 提交规范

### 4.1 Conventional Commits 格式

项目采用 **Conventional Commits** 规范，格式如下：

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**格式要求**：
- `type`：提交类型，小写
- `scope`：影响范围，小写，括号包裹
- `subject`：简短描述，中文，不超过 50 字符
- `body`：详细描述，可选，每行不超过 72 字符
- 正文与标题之间空一行

### 4.2 Type 类型定义

| Type | 含义 | 示例 |
|---|---|---|
| `feat` | 新功能 | `feat(auth): 新增 Opaque Token 认证组件替代 JWT` |
| `fix` | Bug 修复 | `fix(dict): 完善字典类型不存在异常提示` |
| `refactor` | 重构（不改变功能） | `refactor(auth): 删除废弃的 JWT 相关组件` |
| `docs` | 文档变更 | `docs: 补充和完善项目规范文档` |
| `test` | 测试相关 | `test(auth): 更新测试适配 opaque token` |
| `chore` | 构建/工具变更 | `chore: 更新 Maven 依赖版本` |
| `style` | 代码格式（不影响逻辑） | `style: 统一 import 顺序` |
| `perf` | 性能优化 | `perf(cache): 优化缓存查询性能` |

### 4.3 Scope 范围定义

| Scope | 模块 | 说明 |
|---|---|---|
| `auth` | nebula-auth | 认证、用户、角色、权限模块 |
| `dict` | nebula-dict | 数据字典模块 |
| `param` | nebula-param | 系统参数模块 |
| `notify` | nebula-notify | 通知、公告模块 |
| `storage` | nebula-storage | 文件存储模块 |
| `scheduler` | nebula-scheduler | 任务调度模块 |
| `gateway` | nebula-gateway | 网关模块 |
| `event` | nebula-event | 事件模块 |
| `base` | nebula-base | 基础设施模块 |
| `common` | nebula-base-common | 公共模型模块 |
| `web` | nebula-base-web | Web 模块 |
| `mybatis` | nebula-base-mybatis | MyBatis 模块 |
| `cache` | nebula-base-cache | 缓存模块 |
| `cloud` | nebula-base-cloud | 云调用模块 |
| `frontend` | nebula-frontend | 前端配置模块 |
| `app` | nebula-app | 应用启动模块 |
| `dependency` | nebula-dependency | 依赖版本模块 |

### 4.4 Commit Message 示例

```bash
# ✅ 正确 - 新功能
feat(auth): 新增 Opaque Token 认证组件替代 JWT

# ✅ 正确 - Bug 修复
fix(dict): 完善字典类型不存在异常提示

# ✅ 正确 - 重构
refactor(auth): 删除废弃的 JWT 相关组件

# ✅ 正确 - 文档变更
docs: 补充和完善项目规范文档

# ✅ 正确 - 测试
test(auth): 更新测试适配 opaque token

# ✅ 正确 - 带详细描述
refactor(storage): 移除 default_flag 字段并简化字典项更新逻辑

删除 storage_file 表中废弃的 default_flag 字段，
简化 StorageUploadTaskCleanupHandler 的清理逻辑，
统一使用 is_temp 字段判断文件状态。

# ❌ 错误 - 缺少 type
更新用户服务代码  # 应为 feat(auth): 更新用户服务代码

# ❌ 错误 - 缺少 scope
feat: 新增登录功能  # 应为 feat(auth): 新增登录功能

# ❌ 错误 - type 大写
Feat(auth): 新增登录功能  # type 应小写

# ❌ 错误 - scope 大写
feat(Auth): 新增登录功能  # scope 应小写

# ❌ 错误 - subject 过长
feat(auth): 新增用户登录注册刷新令牌退出登录等完整认证流程  # 超过 50 字符

# ❌ 错误 - 使用英文描述
feat(auth): Add login feature  # 应使用中文

# ❌ 错误 - 使用模糊描述
feat(auth): 更新代码  # 应明确具体变更内容
```

### 4.5 分支命名规范

| 分支类型 | 格式 | 示例 |
|---|---|---|
| **主分支** | `main`, `master` | `main` |
| **开发分支** | `develop` | `develop` |
| **功能分支** | `feature/<scope>-<desc>` | `feature/auth-login`, `feature/dict-tree` |
| **修复分支** | `fix/<scope>-<desc>` | `fix/auth-token-expire` |
| **重构分支** | `refactor/<scope>-<desc>` | `refactor/auth-service` |
| **发布分支** | `release/<version>` | `release/1.0.0` |
| **热修复分支** | `hotfix/<version>-<desc>` | `hotfix/1.0.1-token-fix` |

```bash
# ✅ 正确 - 功能分支
feature/auth-login
feature/dict-tree-query
feature/storage-chunk-upload

# ✅ 正确 - 修复分支
fix/auth-token-expire
fix/dict-type-not-found

# ❌ 错误 - 分支名过于简单
feature/login  # 应包含 scope
fix/bug        # 应明确 bug 内容

# ❌ 错误 - 使用大写
Feature/Auth-Login  # 分支名应小写

# ❌ 错误 - 使用驼峰
feature/authLogin  # 应使用连字符 feature/auth-login
```

---

## 五、禁止行为

### 5.1 代码风格禁止

- ❌ 使用 Tab 缩进（应使用 4 空格）
- ❌ 行长度超过 120 字符（应换行）
- ❌ 使用通配符导入（`import java.util.*`）
- ❌ Import 未按规则分组排序
- ❌ 类/方法注解未分行排列
- ❌ 左大括号换行
- ❌ 方法间无空行分隔
- ❌ 同一方法内连续多空行（最多 1 空行）

### 5.2 注释禁止

- ❌ public 类缺少 Javadoc 注释
- ❌ public 方法缺少 Javadoc 注释
- ❌ Entity/DTO 字段缺少 `@Schema` 注解
- ❌ 注释显而易见逻辑（如 `// 设置用户名`）
- ❌ 使用英文注释（应使用中文）
- ❌ 使用块注释解释单行逻辑（应使用 `//`）
- ❌ 注释格式不规范（缺少空格、空行）

### 5.3 Git 提交禁止

- ❌ Commit 缺少 type（如 `更新代码`）
- ❌ Commit 缺少 scope（如 `feat: 新增功能`）
- ❌ Type/Scope 使用大写（如 `Feat(Auth)`）
- ❌ Subject 过长（超过 50 字符）
- ❌ Subject 使用英文（应使用中文）
- ❌ Subject 使用模糊描述（如 `更新代码`）
- ❌ 分支名使用驼峰（应使用连字符）
- ❌ 分支名使用大写
- ❌ 分支名缺少 scope

### 5.4 IDE 配置禁止

- ❌ 使用 Tab 缩进而非空格
- ❌ 行右边界超过 120
- ❌ 文件末尾缺少空行
- ❌ 未启用注解处理（Lombok/MapStruct）
- ❌ 编译器版本与 pom.xml 不一致
- ❌ 编码设置为非 UTF-8

---

## 六、速查表

### 6.1 代码风格速查

| 规则 | 值 | 检查方式 |
|---|---|---|
| 缩进 | 4 空格 | IDE 设置、`.editorconfig` |
| 行最大长度 | 120 字符 | IDE 右边界线 |
| Import 分组 | java → 第三方 → Spring → Lombok → Swagger → cn.cloudomni → static | IDE 自动排序 |
| 通配符导入 | 禁止（同包超过 5/3 类才允许） | IDE 设置阈值 |
| 类注解排列 | 文档 → 条件 → 组件 → Lombok | 人工检查 |
| 方法间空行 | 1 行 | 人工检查 |
| 左大括号 | 不换行 | 人工检查 |

### 6.2 注释速查

| 元素 | 注释类型 | 要求 |
|---|---|---|
| Controller 类 | Javadoc + `@Tag` | 必须注释，注明接口入口 |
| Service 类 | Javadoc | 必须注释职责 |
| Entity 类 | `@Schema` | 类级 + 字级注释 |
| DTO 类 | `@Schema` | 类级 + 字级注释 |
| public 方法 | Javadoc | 必须 `@param` + `@return` |
| Controller 方法 | Javadoc + `@Operation` | 必须注释 |
| 非显而易见逻辑 | `//` 行注释 | 仅复杂逻辑需要 |

### 6.3 Git Commit 格式速查

| 部分 | 格式 | 示例 |
|---|---|---|
| Type | 小写 | `feat`, `fix`, `refactor`, `docs`, `test`, `chore` |
| Scope | 小写，括号包裹 | `(auth)`, `(dict)`, `(storage)` |
| Subject | 中文，≤50 字符 | `新增 Opaque Token 认证组件替代 JWT` |
| Body | 中文，≤72 字符/行 | 可选，详细描述变更 |
| 分支 | `<type>/<scope>-<desc>` | `feature/auth-login`, `fix/dict-type` |

### 6.4 Type 快速选择

| 变更类型 | Type | 适用场景 |
|---|---|---|
| 新增功能/接口 | `feat` | 新 Controller、新 Service 方法、新 DTO |
| Bug 修复 | `fix` | 修复异常、修复逻辑错误、修复测试 |
| 代码重构 | `refactor` | 重命名、抽取方法、优化结构（不改功能） |
| 文档变更 | `docs` | README、AGENTS.md、注释 |
| 测试相关 | `test` | 新增测试、修复测试、调整测试 |
| 构建配置 | `chore` | pom.xml、IDE 配置、CI 配置 |
| 格式调整 | `style` | import 顺序、缩进、空行 |
| 性能优化 | `perf` | 缓存优化、查询优化 |

### 6.5 Scope 快速选择

| 模块 | Scope | 包名 |
|---|---|---|
| 认证/用户/角色/权限 | `auth` | `nebula-auth` |
| 数据字典 | `dict` | `nebula-dict` |
| 系统参数 | `param` | `nebula-param` |
| 通知/公告 | `notify` | `nebula-notify` |
| 文件存储 | `storage` | `nebula-storage` |
| 任务调度 | `scheduler` | `nebula-scheduler` |
| 网关 | `gateway` | `nebula-gateway` |
| 事件 | `event` | `nebula-event` |
| 基础设施 | `base` | `nebula-base` |
| 公共模型 | `common` | `nebula-base-common` |
| Web 层 | `web` | `nebula-base-web` |
| MyBatis | `mybatis` | `nebula-base-mybatis` |
| 缓存 | `cache` | `nebula-base-cache` |
| 云调用 | `cloud` | `nebula-base-cloud` |

### 6.6 IDE 配置检查清单

| 配置项 | 期望值 | 检查路径 |
|---|---|---|
| Java version | 21 | Settings → Build → Compiler → Java Compiler |
| Project SDK | Java 21 | File → Project Structure → Project |
| Indent | 4 spaces | Settings → Editor → Code Style → Java |
| Right margin | 120 | Settings → Editor → Code Style → Java |
| Import layout | 分组排序 | Settings → Editor → Code Style → Java → Imports |
| Encoding | UTF-8 | Settings → Editor → File Encodings |
| Annotation processing | Enabled | Settings → Build → Compiler → Annotation Processors |
| Line break at EOF | true | Settings → Editor → General → Ensure line break |
