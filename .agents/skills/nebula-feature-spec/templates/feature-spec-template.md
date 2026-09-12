# {功能名称} 功能说明书

> **状态**: 开发中
> **创建时间**: {yyyy-MM-dd}
> **完成时间**: {归档时填写}

---

## 1. 功能概述

### 1.1 功能描述
{描述功能是什么，做什么用}

### 1.2 目标用户
{描述使用此功能的用户群体}

### 1.3 业务价值
{描述此功能带来的业务价值}

---

## 2. 功能点清单

| 序号 | 功能点 | 优先级 | 涉及模块 | 状态 |
|---:|---|---|---|---|
| 1 | {功能点1} | P0 | {模块} | 待开发 |
| 2 | {功能点2} | P1 | {模块} | 待开发 |
| 3 | {功能点3} | P2 | {模块} | 待开发 |

---

## 3. 接口设计

### 3.1 接口列表

| 序号 | 接口名称 | 方法 | 路径 | 说明 |
|---:|---|---|---|---|
| 1 | {接口名} | POST | /api/{module}/{resource} | {说明} |
| 2 | {接口名} | GET | /api/{module}/{resource}/{id} | {说明} |
| 3 | {接口名} | PUT | /api/{module}/{resource}/{id} | {说明} |
| 4 | {接口名} | DELETE | /api/{module}/{resource}/{id} | {说明} |

### 3.2 请求结构

#### 接口1: {接口名}

**请求体**:
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| field1 | String | 是 | {说明} |
| field2 | String | 否 | {说明} |

### 3.3 响应结构

**成功响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "xxx",
    "name": "xxx"
  }
}
```

**失败响应**:
```json
{
  "code": 10001,
  "message": "错误描述",
  "data": null
}
```

### 3.4 状态码

| 状态码 | 错误码常量 | 说明 |
|---|---|---|
| 0 | - | 成功 |
| {code} | `{Module}ErrorInfo.{ERROR_CODE}` | {错误说明} |

---

## 4. 数据模型

### 4.1 涉及 Entity

| Entity | 模块 | 变更类型 | 说明 |
|---|---|---|---|
| {Module}Entity | {module}-core | 新增 | 新增实体 |
| UserEntity | auth-core | 修改 | 新增字段 |

**Entity 结构**:
```java
@Data
@TableName("{module}_{table}")
@Schema(description = "{实体描述}")
public class {Module}Entity extends BaseEntity {

    @Schema(description = "{字段描述}")
    private String field1;

    @Schema(description = "{字段描述}")
    private Integer status;
}
```

### 4.2 新增 DTO

```java
@Data
@Schema(description = "{DTO描述}")
public class {Module}Dto {

    @Schema(description = "{字段描述}")
    private String id;

    @Schema(description = "{字段描述}")
    private String name;
}
```

### 4.3 新增 Command/Query

```java
// Command
@Data
@Schema(description = "创建{模块}命令")
public class Create{Module}Command {

    @Schema(description = "{字段描述}")
    private String field1;
}

// Query
@Data
@Schema(description = "分页查询{模块}")
public class Page{Module}Query extends BasePageQuery {

    @Schema(description = "{查询条件}")
    private String keyword;
}
```

### 4.4 新增 Req/Resp

```java
// Req
@Data
@Schema(description = "创建{模块}请求")
public class Create{Module}Req {

    @Schema(description = "{字段描述}")
    private String field1;
}

// Resp
@Data
@Schema(description = "{模块}详情响应")
public class {Module}DetailResp {

    @Schema(description = "{字段描述}")
    private String id;
}
```

---

## 5. 编码要求

### 5.1 设计模式
- 使用{模式名}模式实现{用途}
- 示例：使用工厂模式创建不同类型的处理器

### 5.2 前端路由
- `/{module}/{page}` - {页面说明}
- 示例：`/auth/profile/avatar` - 头像上传页面

### 5.3 命名约定

| 类型 | 命名 | 示例 |
|---|---|---|
| Controller | `{Module}Controller` | `UserAvatarController` |
| Service | `I{Module}Service` | `IUserAvatarService` |
| ServiceImpl | `{Module}ServiceImpl` | `UserAvatarServiceImpl` |
| DAO | `{Module}DAO` | `UserAvatarDAO` |
| Mapper | `{Module}Mapper` | `UserAvatarMapper` |

### 5.4 异常处理
- {异常场景}: `{Module}ErrorInfo.{ERROR_CODE}`
- 示例：文件过大: `StorageErrorInfo.FILE_TOO_LARGE`

### 5.5 规范引用
- 架构规范: @docs/spec/01-architecture.md
- 分层规范: @docs/spec/02-layering.md
- 命名规范: @docs/spec/03-naming.md
- 异常处理: @docs/spec/07-exception.md

---

## 6. 测试用例（TDD）

> ⚠️ **先写测试，再实现功能**

### 6.1 单元测试

| 序号 | 测试类 | 测试方法 | 测试场景 |
|---:|---|---|---|
| 1 | `{Module}ServiceTest` | `testCreateSuccess` | 正常创建 |
| 2 | `{Module}ServiceTest` | `testCreateValidationError` | 参数校验失败 |
| 3 | `{Module}ServiceTest` | `testCreateDuplicateError` | 重复创建 |

### 6.2 Controller 测试

| 序号 | 测试类 | 测试方法 | 测试场景 |
|---:|---|---|---|
| 1 | `{Module}ControllerTest` | `testCreate` | POST 创建测试 |
| 2 | `{Module}ControllerTest` | `testGetById` | GET 查询测试 |
| 3 | `{Module}ControllerTest` | `testPage` | 分页查询测试 |

### 6.3 集成测试

| 序号 | 测试类 | 测试场景 |
|---:|---|---|
| 1 | `{Module}IT` | 完整流程测试 |

### 6.4 TDD 流程

1. **编写单元测试** → 预期失败（功能未实现）
2. **实现最小代码** → 使测试通过
3. **重构代码** → 优化实现
4. **重复** → 直到所有测试通过

---

## 7. 用例

### 7.1 典型场景

**场景1: {场景名}**
1. 用户进入{页面}
2. 点击{按钮}
3. 填写{表单}
4. 提交{操作}
5. 系统返回{结果}

**场景2: {场景名}**
1. ...
2. ...

### 7.2 边界情况

- {边界情况1}: {处理方式}
  - 示例：文件大小超过限制（5MB）→ 返回错误提示
- {边界情况2}: {处理方式}

### 7.3 异常情况

- {异常情况1}: 抛出 `{Module}ErrorInfo.{ERROR_CODE}`，提示"{消息}"
- {异常情况2}: 抛出 `{Module}ErrorInfo.{ERROR_CODE}`，提示"{消息}"

---

## 8. 附录

### 8.1 相关模块

| 模块 | 用途 |
|---|---|
| `nebula-{module}-local` | {用途说明} |
| `nebula-{module}-core` | {用途说明} |

### 8.2 参考规范

| 规范文件 | 内容 |
|---|---|
| `docs/spec/01-architecture.md` | 架构规范 |
| `docs/spec/02-layering.md` | 分层规范 |
| `docs/spec/03-naming.md` | 命名规范 |

### 8.3 开发日志

| 时间 | 事项 |
|---|---|
| {yyyy-MM-dd} | 创建功能书 |
| {归档时填写} | 完成开发，归档 |