# Scheduler 模块使用指南

任务调度能力，支持定时任务、异步任务。

## 模块结构

```
nebula-scheduler/
├── nebula-scheduler-api      # Service接口、DTO、Command、Query
├── nebula-scheduler-core     # 任务执行器、XXL-Job 集成
├── nebula-scheduler-local    # Controller
├── nebula-scheduler-remote   # FeignClient
└── nebula-scheduler-service  # 独立服务入口（端口 9906）
```

---

## 引入方式

### 单体模式

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-scheduler-local</artifactId>
</dependency>
```

### 微服务消费者

```xml
<dependency>
    <groupId>cn.cloudomni</groupId>
    <artifactId>nebula-scheduler-remote</artifactId>
</dependency>
```

### 独立服务

```bash
mvn spring-boot:run -pl nebula-scheduler/nebula-scheduler-service
# 默认端口: 9906
```

---

## 核心能力

### 1. 定时任务

基于 XXL-Job 实现：

```java
@Component
public class DailyReportTask {
    
    @XxlJob("dailyReportJob")
    public void execute() {
        log.info("执行日报生成任务");
        // 生成日报逻辑
    }
}
```

**任务配置**:
- 在 XXL-Job 控制台配置调度规则
- Cron 表达式定义执行时间
- 支持失败重试、超时控制

---

### 2. 异步任务

使用 Spring `@Async` 实现异步执行：

```java
@Service
public class NotificationServiceImpl {
    
    @Async
    public void sendBatchNotifications(List<String> userIds) {
        for (String userId : userIds) {
            // 异步发送通知
            notificationService.send(userId);
        }
    }
}
```

---

### 3. 任务管理

**查询任务列表**:
```http
GET /api/scheduler/tasks
```

**查询执行记录**:
```http
GET /api/scheduler/tasks/{taskId}/logs
```

---

## 典型用例

### 用例1: 每日数据统计

```java
@Component
public class DailyStatisticsTask {
    
    private final StatisticsService statisticsService;
    
    @XxlJob("dailyStatistics")
    public void execute() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        
        // 统计昨日数据
        statisticsService.calculateDaily(yesterday);
    }
}
```

### 用例2: 定时清理临时文件

```java
@Component
public class TempFileCleanupTask {
    
    private final StorageService storageService;
    
    @XxlJob("cleanupTempFiles")
    public void execute() {
        // 清理超过24小时的临时文件
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        storageService.cleanupTempFiles(threshold);
    }
}
```

### 用例3: 定时发送提醒

```java
@Component
public class ReminderTask {
    
    private final NotifyService notifyService;
    
    @XxlJob("sendReminders")
    public void execute() {
        // 查询需要提醒的事项
        List<Reminder> reminders = reminderService.listPending();
        
        for (Reminder reminder : reminders) {
            notifyService.send(reminder);
        }
    }
}
```

---

## 接口入口

| 接口 | 路径 |
|---|---|
| 任务列表 | `/api/scheduler/tasks` |
| 执行记录 | `/api/scheduler/tasks/{taskId}/logs` |

---

## 配置项

```yaml
nebula:
  scheduler:
    mode: local
    xxl-job:
      admin-addresses: http://xxl-job-admin:8080/xxl-job-admin
      app-name: nebula-scheduler
      port: 9999
```