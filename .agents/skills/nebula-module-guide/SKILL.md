# Nebula 模块使用指南

介绍 Nebula 各模块提供的功能及使用方式。帮助开发者识别可复用的模块，避免重复开发。

## 触发词

- "如何使用"
- "模块功能"
- "可复用"
- "怎么实现"
- 模块名称（auth/storage/dict/param/notify/scheduler/audit）

---

## 模块清单

| 模块 | 功能 | 典型用例 | 详细文档 |
|---|---|---|---|
| `auth` | 用户认证、角色权限、组织架构、OAuth2 | 登录注册、权限控制、第三方登录 | @references/auth.md |
| `storage` | 文件上传、分片上传、鉴权下载 | 头像上传、附件上传、大文件上传 | @references/storage.md |
| `dict` | 数据字典类型与字典项管理 | 状态枚举、下拉选项、标签分类 | @references/dict.md |
| `param` | 系统参数管理、按键读取 | 开关参数、阈值配置、动态配置 | @references/param.md |
| `notify` | 公告、通知模板、站内信 | 首页公告、弹窗通知、邮件通知 | @references/notify.md |
| `scheduler` | 任务调度 | 定时任务、异步任务 | @references/scheduler.md |
| `audit` | 审计日志 | 操作留痕、审计查询 | @references/audit.md |

---

## 模块引入方式

### 单体模式（local）

```xml
<!-- 引入模块的 local 版本 -->
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-{module}-local</artifactId>
</dependency>
```

### 微服务模式（remote）

```xml
<!-- 引入模块的 remote 版本 -->
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-{module}-remote</artifactId>
</dependency>
```

### 独立服务

```bash
# 启动独立服务
mvn spring-boot:run -pl nebula-{module}/nebula-{module}-service
```

---

## Service 层使用方式

### 依赖注入

所有模块的 Service 接口都在 `{module}-api` 层定义，命名规则为 `I{Module}Service`：

```java
@Service
@RequiredArgsConstructor
public class MyBusinessServiceImpl implements IMyBusinessService {
    
    // 注入模块 Service 接口
    private final IUserService userService;           // auth 模块
    private final IStorageService storageService;      // storage 模块
    private final IDictService dictService;            // dict 模块
    private final ISystemParamService paramService;    // param 模块
    private final INotifyService notifyService;        // notify 模块
    private final IAuditService auditService;          // audit 模块
}
```

### 命名规则速查

| 模块 | Service 接口 | 说明 |
|---|---|---|
| auth | `IUserService` | 用户管理 |
| auth | `IRoleService` | 角色管理 |
| auth | `IPermissionService` | 权限管理 |
| auth | `ILoginService` | 登录认证 |
| storage | `IStorageService` | 文件存储 |
| dict | `IDictService` | 数据字典 |
| param | `ISystemParamService` | 系统参数 |
| notify | `INotifyService` | 通知发送 |
| notify | `IAnnouncementService` | 公告管理 |
| audit | `IAuditService` | 审计日志 |

### 调用模式：Command/Query 模式

模块 Service 方法使用 Command/Query 模式，入参为命令对象，出参为 DTO 对象：

```java
// 入参：Command（写操作）或 Query（读操作）
// 出参：DTO 或 基本类型

// 示例：创建用户
CreateUserCommand command = new CreateUserCommand();
command.setUsername("zhangsan");
command.setPassword("password123");
String userId = userService.createUser(command);

// 示例：查询用户详情
UserDetailDto dto = userService.getDetailById(userId);

// 示例：分页查询
PageUserQuery query = new PageUserQuery();
query.setPageNum(1);
query.setPageSize(20);
query.setKeyword("admin");
PageResp<UserDto> page = userService.page(query);
```

---

## 模块快速选择

### 用户需要文件上传 → `storage`

**核心能力**:
- 普通文件上传
- 分片上传（大文件）
- 临时文件 → 绑定转正
- 鉴权下载

**Service 层使用**:
```java
@Service
@RequiredArgsConstructor
public class OrderServiceImpl {
    
    private final IStorageService storageService;
    
    public String createOrderWithAttachment(CreateOrderCommand command, MultipartFile file) {
        // 1. 创建上传任务
        CreateUploadTaskCommand taskCommand = new CreateUploadTaskCommand();
        taskCommand.setFileName(file.getOriginalFilename());
        taskCommand.setFileSize(file.getSize());
        taskCommand.setContentType(file.getContentType());
        UploadTaskDto task = storageService.createUploadTask(taskCommand);
        
        // 2. 上传文件
        storageService.uploadFile(task.getUploadTaskId(), file);
        
        // 3. 保存订单业务逻辑
        OrderEntity order = new OrderEntity();
        // ...
        orderDAO.save(order);
        
        // 4. 绑定文件到业务
        BindFileCommand bindCommand = new BindFileCommand();
        bindCommand.setUploadTaskId(task.getUploadTaskId());
        bindCommand.setBizType("ORDER_ATTACHMENT");
        bindCommand.setBizId(order.getId());
        FileDto fileDto = storageService.bindFile(bindCommand);
        
        return order.getId();
    }
}
```

**HTTP 接口**:
```http
POST /api/storage/upload
POST /api/storage/bind
```

详见: @references/storage.md

---

### 用户需要认证/权限 → `auth`

**核心能力**:
- 注册、登录、退出
- 用户、角色、权限管理
- 组织架构、菜单、按钮
- OAuth2 客户端管理

**Service 层使用**:
```java
@Service
@RequiredArgsConstructor
public class MyServiceImpl {
    
    private final IUserService userService;
    private final IRoleService roleService;
    private final IPermissionService permissionService;
    
    // 创建用户
    public String createUser(CreateUserCommand command) {
        return userService.createUser(command);
    }
    
    // 查询用户详情
    public UserDetailDto getUserDetail(String userId) {
        return userService.getDetailById(userId);
    }
    
    // 分页查询用户
    public PageResp<UserDto> pageUsers(String keyword, int pageNum, int pageSize) {
        PageUserQuery query = new PageUserQuery();
        query.setKeyword(keyword);
        query.setPageNum(pageNum);
        query.setPageSize(pageSize);
        return userService.page(query);
    }
    
    // 绑定角色
    public void bindRoles(String userId, List<String> roleIds) {
        userService.bindRoles(userId, roleIds);
    }
    
    // 检查权限
    public boolean hasPermission(String userId, String permissionCode) {
        List<String> permissions = permissionService.listCodesByUserId(userId);
        return permissions.contains(permissionCode);
    }
}
```

**HTTP 接口**:
```http
POST /api/auth/login
GET /api/auth/current
```

详见: @references/auth.md

---

### 用户需要数据字典 → `dict`

**核心能力**:
- 字典类型管理
- 字典项管理
- 按编码查询字典项

**Service 层使用**:
```java
@Service
@RequiredArgsConstructor
public class MyServiceImpl {
    
    private final IDictService dictService;
    
    // 获取字典项列表（用于前端下拉框）
    public List<DictItemDto> getDictOptions(String dictCode) {
        return dictService.listItemsByDictCode(dictCode);
    }
    
    // 根据字典值获取标签
    public String getDictLabel(String dictCode, String value) {
        List<DictItemDto> items = dictService.listItemsByDictCode(dictCode);
        return items.stream()
            .filter(item -> item.getValue().equals(value))
            .findFirst()
            .map(DictItemDto::getLabel)
            .orElse("未知");
    }
    
    // 创建字典类型
    public String createDictType(CreateDictTypeCommand command) {
        return dictService.createDictType(command);
    }
    
    // 创建字典项
    public String createDictItem(CreateDictItemCommand command) {
        return dictService.createDictItem(command);
    }
}
```

**HTTP 接口**:
```http
GET /api/dict/items/dict/{dictCode}
```

详见: @references/dict.md

---

### 用户需要系统配置 → `param`

**核心能力**:
- 系统参数管理
- 按键读取参数值
- 按模块批量获取参数

**Service 层使用**:
```java
@Service
@RequiredArgsConstructor
public class StorageServiceImpl {
    
    private final ISystemParamService paramService;
    
    // 读取整数参数（文件大小限制）
    public long getMaxUploadSize() {
        return paramService.getIntegerValueByKey("system.upload.maxSize", 5242880);
    }
    
    // 读取布尔参数（功能开关）
    public boolean isFeatureEnabled(String featureKey) {
        return paramService.getBooleanValueByKey(featureKey, false);
    }
    
    // 读取字符串参数
    public String getAllowTypes() {
        return paramService.getStringValueByKey("system.upload.allowTypes", "jpg,png");
    }
    
    // 批量获取模块参数
    public Map<String, String> getModuleParams(String moduleCode) {
        List<SystemParamDto> params = paramService.listByModule(moduleCode);
        return params.stream()
            .collect(Collectors.toMap(SystemParamDto::getKey, SystemParamDto::getValue));
    }
    
    // 更新参数
    public void updateParam(String key, String value) {
        SaveOrUpdateParamCommand command = new SaveOrUpdateParamCommand();
        command.setKey(key);
        command.setValue(value);
        paramService.saveOrUpdate(command);
    }
}
```

**HTTP 接口**:
```http
GET /api/param/key/{paramKey}
GET /api/param/module/{moduleCode}
```

详见: @references/param.md

---

### 用户需要通知/公告 → `notify`

**核心能力**:
- 公告管理
- 通知模板
- 站内信
- 发送记录

**Service 层使用**:
```java
@Service
@RequiredArgsConstructor
public class UserServiceImpl {
    
    private final INotifyService notifyService;
    private final IAnnouncementService announcementService;
    
    // 用户注册后发送通知
    public String register(RegisterCommand command) {
        // 1. 创建用户
        UserEntity user = new UserEntity();
        // ...
        userDAO.save(user);
        
        // 2. 发送注册成功通知
        SendNotifyCommand notifyCommand = new SendNotifyCommand();
        notifyCommand.setTemplateCode("USER_REGISTER");
        notifyCommand.setRecipientId(user.getId());
        notifyCommand.setVariables(Map.of("username", user.getNickname()));
        notifyService.send(notifyCommand);
        
        return user.getId();
    }
    
    // 获取当前用户公告
    public List<AnnouncementDto> getCurrentUserAnnouncements() {
        return announcementService.listForCurrentUser();
    }
    
    // 获取未读弹窗公告
    public List<AnnouncementDto> getUnreadPopupAnnouncements() {
        return announcementService.listUnreadPopup();
    }
    
    // 标记公告已读
    public void markAnnouncementRead(String announcementId) {
        announcementService.markRead(announcementId);
    }
}
```

**HTTP 接口**:
```http
POST /api/notify/send
GET /api/notify/announcements/current
```

详见: @references/notify.md

---

### 用户需要定时任务 → `scheduler`

**核心能力**:
- 定时任务配置
- 任务执行器
- XXL-Job 集成

**Service 层使用**:
```java
// 定时任务通过 @XxlJob 注解定义
@Component
@RequiredArgsConstructor
public class DailyReportTask {
    
    private final IReportService reportService;
    private final INotifyService notifyService;
    
    @XxlJob("dailyReportJob")
    public void executeDailyReport() {
        log.info("开始执行日报生成任务");
        
        // 1. 生成日报
        LocalDate yesterday = LocalDate.now().minusDays(1);
        reportService.generateDailyReport(yesterday);
        
        // 2. 发送通知
        SendNotifyCommand command = new SendNotifyCommand();
        command.setTemplateCode("DAILY_REPORT_READY");
        command.setRecipientId("admin");
        notifyService.send(command);
        
        log.info("日报生成任务完成");
    }
}

// 异步任务使用 @Async
@Service
public class NotificationServiceImpl {
    
    @Async
    public void sendBatchNotifications(List<String> userIds) {
        for (String userId : userIds) {
            // 异步发送
        }
    }
}
```

详见: @references/scheduler.md

---

### 用户需要审计日志 → `audit`

**核心能力**:
- 操作留痕
- 审计记录查询
- 注解式审计

**Service 层使用**:
```java
// 方式1: 注解式审计（推荐）
@RestController
@RequestMapping("/api/auth/users")
public class UserController {
    
    @AuditLog(module = "auth", operation = "创建用户", type = "CREATE")
    @PostMapping
    public ApiResult<String> createUser(@RequestBody CreateUserReq req) {
        // 方法执行后自动记录审计日志
        return ApiResult.success(userService.createUser(req));
    }
}

// 方式2: 手动记录审计
@Service
@RequiredArgsConstructor
public class SalaryServiceImpl {
    
    private final IAuditService auditService;
    
    public SalaryDto getSalary(String userId) {
        // 查询薪资
        SalaryDto salary = salaryDAO.getByUserId(userId);
        
        // 手动记录敏感操作审计
        AuditCommand command = new AuditCommand();
        command.setModule("hr");
        command.setOperation("查看薪资");
        command.setType("READ");
        command.setTargetId(userId);
        command.setDetail("查看了用户薪资信息");
        auditService.record(command);
        
        return salary;
    }
    
    // 查询审计日志
    public PageResp<AuditLogDto> queryAuditLogs(String module, String operatorId, 
            LocalDateTime startTime, LocalDateTime endTime, int pageNum, int pageSize) {
        PageAuditLogQuery query = new PageAuditLogQuery();
        query.setModule(module);
        query.setOperatorId(operatorId);
        query.setStartTime(startTime);
        query.setEndTime(endTime);
        query.setPageNum(pageNum);
        query.setPageSize(pageSize);
        return auditService.page(query);
    }
}
```

详见: @references/audit.md

---

## 引用方式

当需要查看模块详细用法时，引用对应的参考文档：

```
@references/{module}.md
```

例如：
- `@references/auth.md`
- `@references/storage.md`

---

## 禁止行为

- ❌ 已有相同功能的模块却重新开发
- ❌ 不查看模块文档就直接开发
- ❌ 模块使用方式与规范不符