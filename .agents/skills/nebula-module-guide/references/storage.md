# Storage 模块使用指南

文件上传、分片上传、绑定转正、鉴权下载能力。

## 模块结构

```
nebula-storage/
├── nebula-storage-api      # Service接口、DTO、Command、Query、错误码
├── nebula-storage-core     # Entity、DAO、ServiceImpl、Converter
├── nebula-storage-local    # Controller、Req/Resp、LocalConverter
├── nebula-storage-remote   # FeignClient、RemoteServiceImpl
└── nebula-storage-service  # 独立服务入口（端口 9905）
```

---

## 引入方式

### 单体模式

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-storage-local</artifactId>
</dependency>
```

### 微服务消费者

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-storage-remote</artifactId>
</dependency>
```

### 独立服务

```bash
mvn spring-boot:run -pl nebula-storage/nebula-storage-service
# 默认端口: 9905
```

---

## 核心概念

### 两阶段上传模型

Storage 模块采用**两阶段上传模型**：

1. **第一阶段**：上传到临时存储
   - 文件为临时状态（`is_temp=true`）
   - 有上传任务 ID
   
2. **第二阶段**：业务保存后绑定转正
   - 绑定后文件变为正式文件
   - 关联业务类型和业务 ID

```
上传文件 → 临时文件 → 业务保存 → 绑定转正 → 正式文件
           (is_temp=true)           (is_temp=false)
```

---

## 核心能力

### 1. 普通文件上传

**创建上传任务**:
```http
POST /api/storage/tasks
Content-Type: application/json

{
  "fileName": "avatar.jpg",
  "fileSize": 102400,
  "contentType": "image/jpeg"
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "uploadTaskId": "task-123",
    "uploadUrl": "/api/storage/upload/task-123"
  }
}
```

**上传文件**:
```http
POST /api/storage/upload/{uploadTaskId}
Content-Type: multipart/form-data

file: [二进制文件]
```

---

### 2. 分片上传（大文件）

**创建分片上传任务**:
```http
POST /api/storage/tasks
Content-Type: application/json

{
  "fileName": "video.mp4",
  "fileSize": 104857600,  // 100MB
  "contentType": "video/mp4",
  "chunkSize": 5242880    // 5MB 分片
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "uploadTaskId": "task-456",
    "totalChunks": 20
  }
}
```

**上传分片**:
```http
POST /api/storage/upload/{uploadTaskId}/chunks/{chunkIndex}
Content-Type: multipart/form-data

file: [分片二进制数据]
```

**完成上传**:
```http
POST /api/storage/tasks/{uploadTaskId}/complete
```

---

### 3. 绑定文件

业务保存成功后，绑定临时文件转正：

```http
POST /api/storage/bind
Content-Type: application/json

{
  "uploadTaskId": "task-123",
  "bizType": "USER_AVATAR",
  "bizId": "user-456"
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "fileId": "file-789",
    "fileUrl": "https://storage.example.com/files/file-789"
  }
}
```

---

### 4. 获取正式文件

**文件详情**:
```http
GET /api/storage/files/{fileId}
```

**文件分页查询**:
```http
POST /api/storage/files/page
Content-Type: application/json

{
  "pageNum": 1,
  "pageSize": 20,
  "bizType": "USER_AVATAR"
}
```

---

### 5. 鉴权下载

```http
GET /api/storage/files/{fileId}/download?token={downloadToken}
```

下载需要鉴权，系统会验证用户是否有权限下载该文件。

---

### 6. 删除文件

```http
DELETE /api/storage/files/{fileId}
```

---

## 存储 Provider

正式内容存储后端由 `nebula.storage.content.type` 选择，取值来自已安装的 provider 模块（一厂商一模块、各用各家原生 SDK）：

| type | 模块 | 必填项 |
|---|---|---|
| `filesystem` | nebula-storage-core（内置，默认值） | `content.filesystem.base-dir` |
| `db` | nebula-storage-core（内置） | 无 |
| `minio` | nebula-storage-provider-minio | `endpoint` / `access-key` / `secret-key` / `bucket` |
| `aliyun-oss` | nebula-storage-provider-aliyun-oss | `endpoint` / `access-key` / `secret-key` / `bucket`（地域由 endpoint 推导） |
| `tencent-cos` | nebula-storage-provider-tencent-cos | `region` / `access-key` / `secret-key` / `bucket`（bucket 须为 `<桶名>-<APPID>`） |

只有被 `type` 选中的后端会建立外部连接，其余段留空不影响启动；填了未安装的类型会启动失败并列出已安装类型。
凭据只能来自环境变量，禁止写入配置文件、数据库、仓库或日志。

### 1. filesystem（本地文件系统）

```yaml
nebula:
  storage:
    content:
      type: filesystem
      filesystem:
        base-dir: /data/storage
```

### 2. db（数据库存储）

```yaml
nebula:
  storage:
    content:
      type: db
```

文件内容存储在数据库 `storage_content` 表的 BLOB 字段。

### 3. 对象存储（minio / aliyun-oss / tencent-cos）

```yaml
nebula:
  storage:
    content:
      type: aliyun-oss
      aliyun-oss:
        endpoint: https://oss-cn-hangzhou.aliyuncs.com
        access-key: ${NEBULA_STORAGE_ALIYUN_OSS_ACCESS_KEY}
        secret-key: ${NEBULA_STORAGE_ALIYUN_OSS_SECRET_KEY}
        bucket: nebula-storage
        # 让客户端直连对象存储取文件（默认 false，恒经服务端代理）
        direct-download-enabled: false
```

`minio` / `tencent-cos` 的键同构，只换段名：`minio` 用 `content.minio.*`，`tencent-cos` 用 `content.tencent-cos.*`（多一项 `region`）。

---

## 典型用例

### 用例1: 用户头像上传

```java
@RestController
@RequestMapping("/api/auth/users")
@RequiredArgsConstructor
public class UserController {
    
    private final IUserService userService;
    private final IStorageService storageService;
    
    @PostMapping("/{userId}/avatar")
    public ApiResult<String> uploadAvatar(
            @PathVariable String userId,
            @RequestParam("file") MultipartFile file) {
        
        // 1. 创建上传任务
        CreateUploadTaskCommand taskCommand = new CreateUploadTaskCommand();
        taskCommand.setFileName(file.getOriginalFilename());
        taskCommand.setFileSize(file.getSize());
        taskCommand.setContentType(file.getContentType());
        
        UploadTaskDto task = storageService.createUploadTask(taskCommand);
        
        // 2. 上传文件
        storageService.uploadFile(task.getUploadTaskId(), file);
        
        // 3. 绑定文件到用户
        BindFileCommand bindCommand = new BindFileCommand();
        bindCommand.setUploadTaskId(task.getUploadTaskId());
        bindCommand.setBizType("USER_AVATAR");
        bindCommand.setBizId(userId);
        
        FileDto fileDto = storageService.bindFile(bindCommand);
        
        // 4. 更新用户头像
        userService.updateAvatar(userId, fileDto.getId());
        
        return ApiResult.success(fileDto.getFileUrl());
    }
}
```

### 用例2: 业务表单保存后绑定附件

```java
@Service
public class OrderServiceImpl implements IOrderService {
    
    private final IOrderDAO orderDAO;
    private final IStorageService storageService;
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public String createOrder(CreateOrderCommand command) {
        // 1. 保存订单
        OrderEntity order = new OrderEntity();
        order.setOrderNo(generateOrderNo());
        order.setAmount(command.getAmount());
        orderDAO.save(order);
        
        // 2. 绑定附件
        if (command.getAttachmentTaskIds() != null) {
            for (String taskId : command.getAttachmentTaskIds()) {
                BindFileCommand bindCommand = new BindFileCommand();
                bindCommand.setUploadTaskId(taskId);
                bindCommand.setBizType("ORDER_ATTACHMENT");
                bindCommand.setBizId(order.getId());
                storageService.bindFile(bindCommand);
            }
        }
        
        return order.getId();
    }
}
```

---

## 接口入口

| 接口 | 路径 |
|---|---|
| 上传任务 | `/api/storage/tasks/*` |
| 文件上传 | `/api/storage/upload/*` |
| 分片上传 | `/api/storage/upload/*/chunks/*` |
| 文件绑定 | `/api/storage/bind` |
| 文件查询 | `/api/storage/files/*` |
| 文件下载 | `/api/storage/files/*/download` |

---

## 配置项

```yaml
nebula:
  storage:
    mode: local
    temp-dir: /tmp/nebula              # 临时区：上传中的文件与分片，恒为本地目录
    content:
      type: db                         # filesystem / db / minio / aliyun-oss / tencent-cos
      filesystem:
        base-dir: /data/storage
      aliyun-oss:                      # 只有被 type 选中的后端才需要填
        endpoint: https://oss-cn-hangzhou.aliyuncs.com
        access-key: ${NEBULA_STORAGE_ALIYUN_OSS_ACCESS_KEY}
        secret-key: ${NEBULA_STORAGE_ALIYUN_OSS_SECRET_KEY}
        bucket: nebula-storage
        direct-download-enabled: false
    signed-download:                   # 分享场景的短时签名下载
      enabled: true
      secret: ${NEBULA_STORAGE_SIGNED_DOWNLOAD_SECRET}
```