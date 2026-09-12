# Param 模块使用指南

系统参数管理，用于开关配置、阈值设置、动态业务配置等。

## 模块结构

```
nebula-param/
├── nebula-param-api      # Service接口、DTO、Command、Query、错误码
├── nebula-param-core     # Entity、DAO、ServiceImpl、Converter
├── nebula-param-local    # Controller、Req/Resp、LocalConverter
├── nebula-param-remote   # FeignClient、RemoteServiceImpl
└── nebula-param-service  # 独立服务入口（端口 9902）
```

---

## 引入方式

### 单体模式

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-param-local</artifactId>
</dependency>
```

### 微服务消费者

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-param-remote</artifactId>
</dependency>
```

### 独立服务

```bash
mvn spring-boot:run -pl nebula-param/nebula-param-service
# 默认端口: 9902
```

---

## 核心能力

### 1. 参数管理

**创建参数**:
```http
POST /api/param
Content-Type: application/json

{
  "key": "system.upload.maxSize",
  "value": "5242880",
  "type": "INTEGER",
  "module": "storage",
  "description": "文件上传最大字节数"
}
```

**更新参数**:
```http
PUT /api/param/{paramId}
Content-Type: application/json

{
  "value": "10485760"
}
```

**删除参数**:
```http
DELETE /api/param/{paramId}
```

**参数详情**:
```http
GET /api/param/key/{paramKey}
```

**参数分页**:
```http
POST /api/param/page
Content-Type: application/json

{
  "pageNum": 1,
  "pageSize": 20,
  "module": "storage"
}
```

---

### 2. 按键读取参数

**读取字符串值**:
```http
GET /api/param/key/{paramKey}
```

**读取布尔值**:
```http
GET /api/param/key/{paramKey}/boolean
```

**读取整数值**:
```http
GET /api/param/key/{paramKey}/integer
```

---

### 3. 按模块批量获取

```http
GET /api/param/module/{moduleCode}
```

**响应**:
```json
{
  "code": 0,
  "data": [
    {
      "key": "system.upload.maxSize",
      "value": "5242880",
      "type": "INTEGER"
    },
    {
      "key": "system.upload.allowTypes",
      "value": "jpg,png,gif",
      "type": "STRING"
    }
  ]
}
```

---

### 4. 保存或更新

```http
POST /api/param/save-or-update
Content-Type: application/json

{
  "key": "system.upload.maxSize",
  "value": "10485760"
}
```

如果参数已存在则更新，不存在则创建。

---

### 5. 批量更新模块参数

```http
POST /api/param/module/{moduleCode}/batch
Content-Type: application/json

{
  "params": [
    {"key": "system.upload.maxSize", "value": "10485760"},
    {"key": "system.upload.allowTypes", "value": "jpg,png,pdf"}
  ]
}
```

---

## 典型用例

### 用例1: 文件上传大小限制

```java
@Service
public class StorageServiceImpl implements IStorageService {
    
    private final ISystemParamService paramService;
    
    public void validateFileSize(long fileSize) {
        // 读取参数配置
        Integer maxSize = paramService.getIntegerValueByKey("system.upload.maxSize");
        
        if (fileSize > maxSize) {
            throw new BusinessException(StorageErrorInfo.FILE_TOO_LARGE);
        }
    }
}
```

### 用例2: 功能开关

```java
@Service
public class FeatureServiceImpl {
    
    private final ISystemParamService paramService;
    
    public boolean isFeatureEnabled(String featureKey) {
        // 读取布尔类型参数
        return paramService.getBooleanValueByKey(featureKey, false);
    }
    
    public void doSomething() {
        if (isFeatureEnabled("feature.new-upload.enabled")) {
            // 执行新功能
        } else {
            // 执行旧功能
        }
    }
}
```

### 用例3: 模块初始化参数

```java
@Configuration
public class StorageConfig {
    
    private final ISystemParamService paramService;
    
    @Bean
    public StorageProperties storageProperties() {
        // 批量获取模块参数
        List<SystemParamDto> params = paramService.listByModule("storage");
        
        StorageProperties props = new StorageProperties();
        props.setMaxSize(getParamValue(params, "system.upload.maxSize", Long::parseLong));
        props.setAllowTypes(getParamValue(params, "system.upload.allowTypes", s -> s.split(",")));
        
        return props;
    }
}
```

---

## 接口入口

| 接口 | 路径 |
|---|---|
| 参数管理 | `/api/param/*` |
| 按键读取 | `/api/param/key/{paramKey}` |
| 按键读取布尔 | `/api/param/key/{paramKey}/boolean` |
| 按键读取整数 | `/api/param/key/{paramKey}/integer` |
| 按模块获取 | `/api/param/module/{moduleCode}` |
| 批量更新 | `/api/param/module/{moduleCode}/batch` |

---

## 配置项

```yaml
nebula:
  param:
    mode: local  # local 或 remote
```