# Dict 模块使用指南

数据字典类型与字典项管理，用于状态枚举、下拉选项、标签分类等。

## 模块结构

```
nebula-dict/
├── nebula-dict-api      # Service接口、DTO、Command、Query、错误码
├── nebula-dict-core     # Entity、DAO、ServiceImpl、Converter
├── nebula-dict-local    # Controller、Req/Resp、LocalConverter
├── nebula-dict-remote   # FeignClient、RemoteServiceImpl
└── nebula-dict-service  # 独立服务入口（端口 9901）
```

---

## 引入方式

### 单体模式

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-dict-local</artifactId>
</dependency>
```

### 微服务消费者

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-dict-remote</artifactId>
</dependency>
```

### 独立服务

```bash
mvn spring-boot:run -pl nebula-dict/nebula-dict-service
# 默认端口: 9901
```

---

## 核心概念

### 字典类型 vs 字典项

- **字典类型（DictType）**: 字典分类，如"状态"、"性别"
- **字典项（DictItem）**: 具体选项，如"启用/禁用"、"男/女"

```
字典类型: status
├── 字典项: enabled (启用) - value: 1
├── 字典项: disabled (禁用) - value: 0
└── 字典项: deleted (已删除) - value: -1
```

---

## 核心能力

### 1. 字典类型管理

**创建字典类型**:
```http
POST /api/dict/types
Content-Type: application/json

{
  "code": "status",
  "name": "状态",
  "description": "通用状态字典"
}
```

**更新字典类型**:
```http
PUT /api/dict/types/{typeId}
Content-Type: application/json

{
  "name": "状态（更新后）"
}
```

**删除字典类型**:
```http
DELETE /api/dict/types/{typeId}
```

**字典类型详情**:
```http
GET /api/dict/types/{typeId}
```

**字典类型分页**:
```http
POST /api/dict/types/page
Content-Type: application/json

{
  "pageNum": 1,
  "pageSize": 20,
  "keyword": "status"
}
```

---

### 2. 字典项管理

**创建字典项**:
```http
POST /api/dict/items
Content-Type: application/json

{
  "dictCode": "status",
  "label": "启用",
  "value": "1",
  "sort": 1,
  "color": "#52c41a"
}
```

**更新字典项**:
```http
PUT /api/dict/items/{itemId}
Content-Type: application/json

{
  "label": "启用（更新后）"
}
```

**删除字典项**:
```http
DELETE /api/dict/items/{itemId}
```

**字典项分页**:
```http
POST /api/dict/items/page
Content-Type: application/json

{
  "pageNum": 1,
  "pageSize": 20,
  "dictCode": "status"
}
```

---

### 3. 按编码查询字典项

**查询字典项列表**:
```http
GET /api/dict/items/dict/{dictCode}
```

**响应**:
```json
{
  "code": 0,
  "data": [
    {
      "id": "item-1",
      "label": "启用",
      "value": "1",
      "color": "#52c41a",
      "sort": 1
    },
    {
      "id": "item-2",
      "label": "禁用",
      "value": "0",
      "color": "#ff4d4f",
      "sort": 2
    }
  ]
}
```

---

## 典型用例

### 用例1: 前端下拉框使用字典

```java
@RestController
@RequestMapping("/api/example")
public class ExampleController {
    
    private final IDictService dictService;
    
    @GetMapping("/status-options")
    public ApiResult<List<DictItemDto>> getStatusOptions() {
        // 查询 status 字典的选项
        return ApiResult.success(dictService.listItemsByDictCode("status"));
    }
}
```

前端调用：
```javascript
// 获取状态下拉选项
const statusOptions = await fetch('/api/dict/items/dict/status');

// 渲染下拉框
<Select options={statusOptions.map(item => ({
  label: item.label,
  value: item.value
}))} />
```

### 用例2: 状态字段使用字典值

```java
@Entity
@TableName("order")
public class OrderEntity extends BaseEntity {
    
    // 状态字段存储字典值
    @Schema(description = "订单状态: 0-待支付, 1-已支付, 2-已发货")
    private Integer status;
}

// 业务代码使用
order.setStatus(1);  // 已支付
```

### 用例3: Service 中查询字典值

```java
@Service
public class OrderServiceImpl {
    
    private final IDictService dictService;
    
    public String getStatusLabel(Integer statusValue) {
        // 根据字典编码和值获取标签
        List<DictItemDto> items = dictService.listItemsByDictCode("order_status");
        return items.stream()
            .filter(item -> item.getValue().equals(String.valueOf(statusValue)))
            .findFirst()
            .map(DictItemDto::getLabel)
            .orElse("未知");
    }
}
```

---

## 接口入口

| 接口 | 路径 |
|---|---|
| 字典类型管理 | `/api/dict/types/*` |
| 字典项管理 | `/api/dict/items/*` |
| 按编码查询 | `/api/dict/items/dict/{dictCode}` |

---

## 配置项

```yaml
nebula:
  dict:
    mode: local  # local 或 remote
```