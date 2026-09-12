# Auth 模块使用指南

认证、用户、角色、权限、组织架构、OAuth2 相关能力。

## 模块结构

```
nebula-auth/
├── nebula-auth-api      # Service接口、DTO、Command、Query、错误码
├── nebula-auth-core     # Entity、DAO、ServiceImpl、Converter
├── nebula-auth-local    # Controller、Req/Resp、LocalConverter
├── nebula-auth-remote   # FeignClient、RemoteServiceImpl
└── nebula-auth-service  # 独立服务入口（端口 9900）
```

---

## 引入方式

### 单体模式

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-auth-local</artifactId>
</dependency>
```

### 微服务消费者

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-auth-remote</artifactId>
</dependency>
```

### 独立服务

```bash
mvn spring-boot:run -pl nebula-auth/nebula-auth-service
# 默认端口: 9900
```

---

## 核心能力

### 1. 认证登录

**登录接口**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "accessToken": "xxx",
    "refreshToken": "xxx",
    "expiresIn": 7200
  }
}
```

**刷新令牌**:
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "xxx"
}
```

**退出登录**:
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
```

---

### 2. 当前用户

**获取当前登录用户**:
```http
GET /api/auth/current
Authorization: Bearer {accessToken}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": "user-123",
    "username": "admin",
    "nickname": "管理员",
    "avatar": "https://...",
    "roles": ["admin"],
    "permissions": ["user:create", "user:delete"]
  }
}
```

---

### 3. 用户管理

**创建用户**:
```http
POST /api/auth/users
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "nickname": "新用户",
  "email": "user@example.com"
}
```

**更新用户**:
```http
PUT /api/auth/users/{userId}
Content-Type: application/json

{
  "nickname": "新昵称",
  "email": "newemail@example.com"
}
```

**删除用户**:
```http
DELETE /api/auth/users/{userId}
```

**用户详情**:
```http
GET /api/auth/users/{userId}
```

**分页查询用户**:
```http
POST /api/auth/users/page
Content-Type: application/json

{
  "pageNum": 1,
  "pageSize": 20,
  "keyword": "admin"
}
```

---

### 4. 角色管理

**创建角色**:
```http
POST /api/auth/roles
Content-Type: application/json

{
  "code": "editor",
  "name": "编辑员",
  "description": "内容编辑角色"
}
```

**绑定角色到用户**:
```http
POST /api/auth/users/{userId}/roles
Content-Type: application/json

{
  "roleIds": ["role-1", "role-2"]
}
```

---

### 5. 权限管理

**创建权限**:
```http
POST /api/auth/permissions
Content-Type: application/json

{
  "code": "user:create",
  "name": "创建用户",
  "type": "BUTTON"
}
```

**绑定权限到角色**:
```http
POST /api/auth/roles/{roleId}/permissions
Content-Type: application/json

{
  "permissionIds": ["perm-1", "perm-2"]
}
```

---

### 6. 组织架构

**创建组织**:
```http
POST /api/auth/orgs
Content-Type: application/json

{
  "name": "技术部",
  "parentId": "org-root",
  "sort": 1
}
```

**获取组织树**:
```http
GET /api/auth/orgs/tree
```

---

### 7. 菜单管理

**创建菜单**:
```http
POST /api/auth/menus
Content-Type: application/json

{
  "name": "用户管理",
  "path": "/auth/users",
  "parentId": "menu-auth",
  "sort": 1
}
```

**获取菜单树**:
```http
GET /api/auth/menus/tree
```

---

### 8. OAuth2 管理

**创建 OAuth2 客户端**:
```http
POST /api/auth/oauth2/clients
Content-Type: application/json

{
  "clientId": "web-app",
  "clientName": "Web应用",
  "redirectUri": "https://app.example.com/callback"
}
```

---

## 典型用例

### 用例1: 用户注册后自动分配默认角色

```java
@Service
public class UserServiceImpl implements IUserService {
    
    private final IRoleService roleService;
    private final IUserRoleService userRoleService;
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public String register(RegisterCommand command) {
        // 1. 创建用户
        UserEntity user = new UserEntity();
        user.setUsername(command.getUsername());
        user.setPassword(passwordEncoder.encode(command.getPassword()));
        userDAO.save(user);
        
        // 2. 查询默认角色
        RoleDto defaultRole = roleService.getByCode("user");
        
        // 3. 绑定角色
        userRoleService.bindRoles(user.getId(), List.of(defaultRole.getId()));
        
        return user.getId();
    }
}
```

### 用例2: 检查用户是否有某个权限

```java
@Service
public class PermissionChecker {
    
    private final IPermissionService permissionService;
    
    public boolean hasPermission(String userId, String permissionCode) {
        List<String> permissions = permissionService.listByUserId(userId);
        return permissions.contains(permissionCode);
    }
}
```

---

## 接口入口

| 接口 | 路径 |
|---|---|
| 登录认证 | `/api/auth/*` |
| 用户管理 | `/api/auth/users/*` |
| 角色管理 | `/api/auth/roles/*` |
| 权限管理 | `/api/auth/permissions/*` |
| 组织管理 | `/api/auth/orgs/*` |
| 菜单管理 | `/api/auth/menus/*` |
| 按钮管理 | `/api/auth/buttons/*` |
| OAuth2 | `/api/auth/oauth2/*` |

---

## 配置项

```yaml
nebula:
  auth:
    mode: local  # local 或 remote
    token:
      access-token-expire: 7200    # 访问令牌过期时间（秒）
      refresh-token-expire: 604800 # 刷新令牌过期时间（秒）
    password:
      min-length: 6                # 密码最小长度
```