# Notify 模块使用指南

公告、通知模板、站内信、发送记录等通知能力。

## 模块结构

```
nebula-notify/
├── nebula-notify-api      # Service接口、DTO、Command、Query、错误码
├── nebula-notify-core     # Entity、DAO、ServiceImpl、Converter
├── nebula-notify-local    # Controller、Req/Resp、LocalConverter
├── nebula-notify-remote   # FeignClient、RemoteServiceImpl
└── nebula-notify-service  # 独立服务入口（端口 9903）
```

---

## 引入方式

### 单体模式

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-notify-local</artifactId>
</dependency>
```

### 微服务消费者

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-notify-remote</artifactId>
</dependency>
```

### 独立服务

```bash
mvn spring-boot:run -pl nebula-notify/nebula-notify-service
# 默认端口: 9903
```

---

## 核心能力

### 1. 公告管理

**创建公告**:
```http
POST /api/notify/announcements
Content-Type: application/json

{
  "title": "系统升级通知",
  "content": "系统将于本周六进行升级...",
  "type": "POPUP",        // POPUP-弹窗, BAR-顶部栏
  "targetType": "ALL",    // ALL-全体, ROLE-角色, USER-指定用户
  "startTime": "2025-01-20T00:00:00",
  "endTime": "2025-01-25T23:59:59"
}
```

**当前用户公告列表**:
```http
GET /api/notify/announcements/current
Authorization: Bearer {token}
```

**未读弹窗公告**:
```http
GET /api/notify/announcements/current/unread
Authorization: Bearer {token}
```

**标记已读**:
```http
POST /api/notify/announcements/{announcementId}/read
Authorization: Bearer {token}
```

---

### 2. 通知模板

**创建模板**:
```http
POST /api/notify/templates
Content-Type: application/json

{
  "code": "USER_REGISTER",
  "name": "用户注册通知",
  "type": "EMAIL",        // EMAIL, SMS, SITE_MESSAGE
  "subject": "注册成功",
  "content": "尊敬的${username}，您已成功注册！",
  "variables": ["username"]
}
```

**模板变量替换**:
```
模板内容: 尊敬的${username}，您已成功注册！
变量值: {"username": "张三"}
结果: 尊敬的张三，您已成功注册！
```

---

### 3. 发送通知

**发送通知**:
```http
POST /api/notify/send
Content-Type: application/json

{
  "templateCode": "USER_REGISTER",
  "recipientId": "user-123",
  "variables": {
    "username": "张三"
  }
}
```

**发送记录查询**:
```http
POST /api/notify/records/page
Content-Type: application/json

{
  "pageNum": 1,
  "pageSize": 20,
  "recipientId": "user-123"
}
```

---

### 4. 站内信

**当前用户站内信**:
```http
GET /api/notify/site-messages
Authorization: Bearer {token}
```

**标记已读**:
```http
POST /api/notify/site-messages/{messageId}/read
Authorization: Bearer {token}
```

**未读数量**:
```http
GET /api/notify/site-messages/unread-count
Authorization: Bearer {token}
```

---

## 典型用例

### 用例1: 用户注册后发送邮件

```java
@Service
public class UserServiceImpl implements IUserService {
    
    private final INotifyService notifyService;
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public String register(RegisterCommand command) {
        // 1. 创建用户
        UserEntity user = new UserEntity();
        user.setUsername(command.getUsername());
        user.setEmail(command.getEmail());
        userDAO.save(user);
        
        // 2. 发送注册成功通知
        SendNotifyCommand notifyCommand = new SendNotifyCommand();
        notifyCommand.setTemplateCode("USER_REGISTER");
        notifyCommand.setRecipientId(user.getId());
        notifyCommand.setVariables(Map.of("username", user.getNickname()));
        notifyService.send(notifyCommand);
        
        return user.getId();
    }
}
```

### 用例2: 首页公告栏

```java
@RestController
@RequestMapping("/api/home")
public class HomeController {
    
    private final IAnnouncementService announcementService;
    
    @GetMapping("/announcements")
    public ApiResult<List<AnnouncementDto>> getAnnouncements() {
        // 获取当前用户可见的公告
        return ApiResult.success(announcementService.listForCurrentUser());
    }
}
```

### 用例3: 操作审批通知

```java
@Service
public class ApprovalServiceImpl {
    
    private final INotifyService notifyService;
    
    public void submitApproval(String approvalId, String approverId) {
        // 发送审批通知
        SendNotifyCommand command = new SendNotifyCommand();
        command.setTemplateCode("APPROVAL_PENDING");
        command.setRecipientId(approverId);
        command.setVariables(Map.of(
            "approvalId", approvalId,
            "submitTime", LocalDateTime.now().toString()
        ));
        notifyService.send(command);
    }
}
```

---

## 接口入口

| 接口 | 路径 |
|---|---|
| 公告管理 | `/api/notify/announcements/*` |
| 当前用户公告 | `/api/notify/announcements/current/*` |
| 通知模板 | `/api/notify/templates/*` |
| 发送通知 | `/api/notify/send` |
| 发送记录 | `/api/notify/records/*` |
| 站内信 | `/api/notify/site-messages/*` |

---

## 配置项

```yaml
nebula:
  notify:
    mode: local  # local 或 remote
    email:
      enabled: true
      host: smtp.example.com
      port: 465
      username: noreply@example.com
      password: xxx
```