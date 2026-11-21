# 通知记录可读性、存储绑定重构与钉钉渠道修复计划

## 1. 背景与目标

本计划收口三个互相独立、但在用户视角下同时暴露的问题：**通知发送记录不可读**、**文件上传后的绑定流程正确性依赖前端时序**、**钉钉群机器人渠道实际不可用且失败不可诊断**。

### 1.1 已确认的问题（逐条证据位置见 2.2）

1. **通知发送记录详情必然失败**：`GET /api/notify/records/{id}` 对任意一条记录都会抛 `NullPointerException`，被 `nebula-base/nebula-base-web/src/main/java/cn/cloudomni/nebula/web/advice/ExceptionHandlerAdvice.java` 兜底成 500，前端 `web/src/pages/system/notify/record/record-detail-modal.tsx` 只能显示「发送记录详情加载失败」。
2. **微服务部署下接收人名称恒为空**：单体（local）下 `receiverUserName` / `targetName` 能正常回填；remote 模式下名称恒为空，前端回退显示用户 ID。
3. **群机器人渠道在页面上回退显示 webhook URL**：钉钉/企业微信/飞书的发送记录接收人列会显示带 `access_token` 的完整机器人地址。
4. **钉钉渠道发送必然失败**：落库阶段就因列宽不足失败，钉钉请求根本不会发出。
5. **钉钉加签完全没有实现**，且当前存储结构也无法安全承载加签密钥。
6. **钉钉/飞书失败不可诊断**：错误信息写「企业微信群机器人发送失败」，平台返回的 `errcode` / HTTP 状态被丢弃。
7. **存储绑定流程有 4 个确定性缺陷**：重试同一 taskId 报错而非幂等、改绑 source 静默返回旧 fileId、一次绑定失败后任务永久不可重试、不校验上传人归属；另有 `getStorageFileBySource` 在多文件时抛 `IllegalStateException`（违反 `docs/spec/07-exception.md` 必须抛 `BusinessException` 的要求）。
8. **前端在业务保存成功之前就绑定文件**，与共享组件自身文档相反，会产生孤儿文件。

### 1.2 目标

- 通知发送记录的详情接口对每条记录都能正常返回，接收人/渠道目标名称在 local 与 remote 两种架构下都能回填。
- 通知记录页与详情中不出现 webhook URL、`access_token`、密钥等敏感内容。
- 钉钉群机器人渠道可落库、可发送、可选加签；发送失败能定位到具体渠道与平台错误码。
- 文件绑定从「前端二次调用」改为「后端业务保存流程内完成」，绑定语义幂等、可重试、校验归属、支持一次多文件。
- 服务间内部调用具备统一的 HMAC 认证机制，内部端点不对外暴露。
- 全部改动有对应自动化测试与可执行验收判据。

### 1.3 非目标（本次明确不做）

以下是调查中确认存在但**不属于本次范围**的相邻缺陷，逐条说明留待后续：

| 编号 | 缺陷 | 证据位置 | 为何不在本次范围 |
|---|---|---|---|
| N1 | `templateVariantName` 前端有字段、后端从未提供，模板变体列恒显示 `-` | `web/src/pages/system/notify/record/record-presentation.tsx` 的 `getRecordTemplateVariantDisplay`；`NotifyRecordDto` 无该字段 | 属「渠道变体展示」独立需求，与本次详情 NPE / 名称回填不是同一根因，混做会扩大改动面；**已确认不在本次范围，也不再另开单** |
| N2 | `StorageFeignClient` 声明 `POST /files/by-source`，但 `StorageController` 无该端点，remote 模式 latent 404 | `nebula-storage/nebula-storage-remote/src/main/java/cn/cloudomni/nebula/storage/feign/StorageFeignClient.java` vs `nebula-storage/nebula-storage-local/src/main/java/cn/cloudomni/nebula/storage/controller/StorageController.java` | **已确认：删除 Feign 声明，不补实现，纳入 B10** |
| N3 | `StorageServiceImpl` 与 `RoutingStorageContentRepository` 抛 `IllegalStateException` 而非 `BusinessException` | `nebula-storage/nebula-storage-core/src/main/java/cn/cloudomni/nebula/storage/service/impl/StorageServiceImpl.java:349`、`RoutingStorageContentRepository.java:58-60` | 本次只修 `getStorageFileBySource:349` 这一处（因语义要改）；`RoutingStorageContentRepository` 需单独梳理异常语义 |
| N4 | `ne-upload` 组件大量主题样式写在 inline style、图片列表无进度/错误态、本地未绑定图片无预览、硬编码中文未走 i18n | `web/src/components/ne-upload/index.tsx` | 本次只做与绑定流程变更直接相关的样式与交互优化（F4），完整重构另开一单 |

另外明确不在范围：

- 不新增通知渠道（除钉钉加签外不改其它渠道行为），不改造通知模板渲染。
- 不重构 `nebula-storage` 的存储后端抽象，不新增存储 provider。
- 不引入新的第三方依赖（加签只用 JDK；服务间签名只用 JDK + 现有 Spring 能力）。
- 不做数据库数据迁移，不改既有数据的 `sourceId` 归属。
- 不改造 `mobile/` 的端上上传交互（仅删除其中的 `bind()` 能力）。
- 不改 `docs/spec/` 下的硬性约束条文；本次产生的服务间认证约定写入模块文档（D 类任务）。

## 2. 现状与约束

### 2.1 技术栈与关键目录

- 后端：Java（Jakarta EE 命名空间）、Spring Boot、Spring MVC、Spring Security、MyBatis（MyBatis-Plus）、JUnit 5 + Mockito + AssertJ；Maven 多模块 reactor（根 `pom.xml`）。
- 前端：React 18、TypeScript、Ant Design 6、Vitest、Testing Library、Vite；进 `web/` 前先读 `web/AGENTS.md`。
- 架构双模：`nebula.architecture.mode` 为 `local`（单体）或 `remote`（微服务）。每个业务模块五层：`-api` / `-core` / `-local` / `-remote` / `-service`（见 `docs/spec/02-layering.md`）。
- 关键目录：
  - 通知：`nebula-notify/`（`-api` 契约与错误码、`-core` 实现、`-local` Controller、`-remote` Feign、`-service` 启动）
  - 存储：`nebula-storage/`
  - 认证/租户：`nebula-auth/`
  - 基础：`nebula-base/`（`nebula-base-cloud` 放 Feign 拦截器与云化配置、`nebula-base-web` 放全局异常处理、`nebula-base-crypto` 放加解密）
  - 网关：`nebula-gateway/nebula-gateway-service`
  - 前端：`web/src/pages/system/notify/record/`、`web/src/pages/profile/info/`、`web/src/pages/tenant/settings/enterprise/`、`web/src/components/ne-upload/`、`web/src/api/storage.ts`、`web/src/types/storage.ts`
  - 移动端：`mobile/src/storage/upload-service.ts`；共享包：`packages/client-sdk/`
  - SQL：`docs/sql/init/{mysql,postgresql}/`、`docs/sql/unreleased/{mysql,postgresql}/`、索引文件 `docs/sql/README.md`
- 规范：`docs/spec/07-exception.md`（禁止用 `IllegalStateException` 表达业务错误；降级 catch 不得丢弃堆栈）、`docs/spec/09-security.md`（密钥不回显、日志不含敏感内容）、`docs/spec/02-layering.md`（层职责）、`docs/spec/06-api-design.md`（`@Schema`、分页用 POST 请求体）、`docs/sql/README.md`（`unreleased/` 双方言成对、脚本必须幂等、`tenant_id` 无 DEFAULT）。

### 2.2 现状事实与证据

以下为调查中已确认的事实，逐条标注可核对位置（文件+行号，或随附可复核的命令）；标注「实测」的项均为带命令的实际运行结果，其余为代码链路推导。

**（1）详情 NPE（确定缺陷）**

`nebula-notify/nebula-notify-core/src/main/java/cn/cloudomni/nebula/notify/service/impl/NotifyServiceImpl.java:788-789`：

```java
Map<String, String> targetNames = resolveTargetNames(List.of(detail.getTargetId()));
Map<String, String> receiverNames = resolveReceiverUserNames(List.of(detail.getReceiverUserId()));
```

而 `target_id` 与 `receiver_user_id` 在写记录时互斥：用户型渠道 `targetId` 为 `null`（同文件 `1462-1484` 的 `resolveNotifyDeliveries`，`1476` 行用户渠道传 `target=null`），群机器人渠道 `receiverUserId` 为 `null`（同文件 `1478-1480` 的 else 分支）。`List.of(...)` 拒绝 `null` 元素，因此详情接口对**每一条**记录都必然抛 NPE，被全局异常处理兜底成 500。

现有 `nebula-notify/nebula-notify-core/src/test/java/cn/cloudomni/nebula/notify/service/impl/NotifyServiceImplTest.java` 共 68 个 `@Test`（`grep -c "@Test"` 实测）全绿，但没有覆盖详情路径 —— 这是「测试全绿但功能全坏」的直接原因。

**（2）列表接收人名称在 local 下正常**

单体下真实接口返回 `receiverUserName`（如 `Administrator`）与 `targetName`，已排除字段映射与前端渲染缺陷。（该条为人工接口观察结论，未留存自动化用例；回归复验见第 7.2 节第 1 条。）

**（3）remote 下名称恒空是确定性链路缺口**

- `nebula-notify/nebula-notify-service/pom.xml:26` 依赖 `nebula-auth-remote`，因此 `IUserService` 的实现是 `UserRemoteServiceImpl`。
- 唯一的 Feign 拦截器 `nebula-base/nebula-base-cloud/src/main/java/cn/cloudomni/nebula/cloud/interceptor/UserContextInterceptor.java:32-52` 只透传 `X-User-Id` / `X-Username` / 租户头，**从不透传 `Authorization`**。
- auth-service 的 `/api/auth/users/{id}` 不在 `nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/config/AuthProperties.java` 的固定放行名单里，`SecurityConfig`（同目录）兜底 `anyRequest().authenticated()`（`SecurityConfig.java:196`）→ 401。
- 401 在 `NotifyServiceImpl.java:872-876` 的 `catch (RuntimeException)` 里被吞成一条 WARN → `names` 里没有该 userId → `receiverUserName` 为 null → 前端回退显示用户 ID。
- 该 catch 只记录 `ex.getMessage()`、不带堆栈，违反 `docs/spec/07-exception.md` 关于日志必须保留异常上下文的约束。

**（4）群机器人渠道回退显示 webhook URL**

`NotifyServiceImpl.resolveReceiver`（`NotifyServiceImpl.java:1689-1701`）对非用户渠道把 `target.getEndpointUrl()` 写入 `record.receiver`；前端 `web/src/pages/system/notify/record/record-presentation.tsx:46-51` 在 `targetName` 为空时用 `receiver` 回退 → 页面暴露带 `access_token` 的机器人地址。

**（5）钉钉发送硬缺陷（静态链路证据：列宽比对 20 < 22，未做运行时复现）**

`sys_notify_record.channel_type` 在全部 5 处定义中都是 `VARCHAR(20)`：

- `docs/sql/init/mysql/01-init-structure.sql:517`
- `docs/sql/init/postgresql/01-init-structure.sql:772`
- `docs/projects/nebula/notify/ddl.md:78`
- `nebula-notify/nebula-notify-service/src/test/resources/db/test/notify-schema-h2.sql:63`
- `nebula-notify/nebula-notify-service/src/test/resources/db/test/notify-schema-postgres.sql:67`

而 `DINGTALK_GROUP_WEBHOOK` 是 22 字符（`nebula-notify/nebula-notify-api/src/main/java/cn/cloudomni/nebula/notify/constant/NotifyChannelTypes.java:11`）。发送流程先落库再发请求（`NotifyServiceImpl.java:560` 的 `notifyRecordDao.save(record)` 在 `613-620` 的渠道分发之前），所以落记录即失败（PG `22001` 值超长 / MySQL 严格模式 `1406`），钉钉请求根本不发出。企业微信 `WECOM_GROUP_WEBHOOK`（19）与飞书 `FEISHU_GROUP_WEBHOOK`（20）恰好通过。

对照：`sys_notify_template_variant.channel_type` 与 `sys_notify_channel_target.channel_type` 均为 `VARCHAR(32)`（`docs/sql/init/mysql/01-init-structure.sql:486,504`）。`docs/sql/unreleased/` 现有 `01-boolean-column-types.sql`、`02-quartz-indexes.sql` 两个成对脚本，无该列加宽脚本。

**（6）钉钉加签未实现**

`sendDingTalkGroupWebhook`（`NotifyServiceImpl.java:1445-1460`）直接 POST `content`，全仓无 `HmacSHA256` / 签名逻辑。`sys_notify_channel_target.config_json` 只在创建/更新时写入、发送链路不读取，且 detail/page 接口原样返回、无加密、无校验，不能承载 secret。

**（7）失败不可诊断**

钉钉与飞书复用 `WEBHOOK_SEND_FAILED`（`nebula-notify/nebula-notify-api/src/main/java/cn/cloudomni/nebula/notify/constant/NotifyErrorInfo.java:30`，码 `22023`，文案「企业微信群机器人发送失败」），且丢弃平台 `errcode` / HTTP 状态（`NotifyServiceImpl.java:1445-1460` 钉钉、`1428-1443` 飞书）。`NotifyErrorInfo` 现有码段已用到 `22046`。

**（8）前端绑定现状**

- `web/src/pages/profile/info/avatar-upload.ts:71-75`：上传成功后立即 `bindUploadTask`，甚至发生在其资料保存成功之前。
- `web/src/pages/tenant/settings/enterprise/tenant-asset-upload.ts:20-24`：上传后立即绑定，且请求体带前端算出来的 `sourceId`（`tenantId`）。
- `web/src/api/storage.ts:70`（接口声明）、`173-179`（实现）、`web/src/types/storage.ts:31-35`（`BindUploadTaskReq`）提供该能力。
- `mobile/src/storage/upload-service.ts:49`（接口 `bind`）、`184`（实现），全仓无调用方。
- `packages/client-sdk/endpoints.ts:53`（`bindUploadTask` 端点）、`packages/client-sdk/types/storage.ts:79`（`BindUploadTaskReq` 类型）。
- `web/src/components/ne-upload/README.md:13` 明确要求「业务页在保存成功后调用 `bindUploadTask`」，与 avatar/tenant 实现相反；共享组件 `web/src/components/ne-upload/index.tsx` 本身不绑定，当前也无页面在用。

**（9）存储绑定缺陷**

`nebula-storage/nebula-storage-core/src/main/java/cn/cloudomni/nebula/storage/service/impl/StorageServiceImpl.java`：

- `bindUploadTask`（`266-325`）第 `268` 行先 `requireUploadTask`，第 `275` 行才查 `getByUploadTaskId`。绑定成功后「清理任务」会删除 task 行（`StorageUploadTaskCleanupHandler`，事件 publish-after-commit 默认 `true`），于是**重试同一个 taskId 命中 `24001 UPLOAD_TASK_NOT_FOUND`**，而不是返回既有 fileId。
- 同一 task 改绑不同 `sourceEntity/sourceId/sourceType` 会静默返回旧 fileId（`276-278` 只比较存在性，不比较 source 三元组）。
- 异常分支把 task 置 `FAILED`（`316-324`），而绑定要求 `COMPLETED`（`269-271`）→ 一次失败后该任务永久不可重试。
- 不校验 `task.getUploadUserId()` 与当前操作人是否一致。
- `getStorageFileBySource`（`342-353`）在 `count > 1` 时抛 `IllegalStateException`（`349`），且 `StorageFileDao.getBySource` 仅按 `create_time DESC` 排序，同秒写入时结果不确定。
- 现有 `IStorageService.bindUploadTask` 单文件签名见 `nebula-storage/nebula-storage-api/src/main/java/cn/cloudomni/nebula/storage/service/IStorageService.java:87`；对外端点 `POST /api/storage/upload-tasks/{taskId}/bind` 见 `nebula-storage/nebula-storage-local/src/main/java/cn/cloudomni/nebula/storage/controller/StorageController.java:151`。

`StorageErrorInfo` 现有码段用到 `24027`（`nebula-storage/nebula-storage-api/src/main/java/cn/cloudomni/nebula/storage/constant/StorageErrorInfo.java`），其中 `24003 UPLOAD_TASK_ALREADY_BOUND` 已存在。

**（10）服务间认证现状**

仓库内没有任何服务间凭据机制。`/api/storage/**` 已在网关路由表内（`nebula-gateway/nebula-gateway-service/src/main/resources/application.yml:37-40`），不能靠网络隔离保护内部端点。`STORAGE_UPLOAD`（`nebula-storage/nebula-storage-api/src/main/java/cn/cloudomni/nebula/storage/constant/StorageApiCodes.java:21`）是接口权限码，普通用户默认没有 —— 绑定时若校验它，普通用户无法保存头像；若不校验，则端点零防护。

可复用先例：

- `nebula-storage/nebula-storage-core/src/main/java/cn/cloudomni/nebula/storage/support/StorageSignedDownloadSupport.java`（HmacSHA256 + 配置密钥 + 时间校验）。
- `nebula-audit/nebula-audit-local/src/main/java/cn/cloudomni/nebula/audit/controller/AuditInternalRecordController.java`（`@RequestMapping("/api/audit/internal")` + `@ConditionalOnProperty(prefix = "nebula.architecture", name = "mode", havingValue = "remote")`，注释明确说明「不带用户鉴权，只在远程架构下注册」）。
- 加解密：`nebula-base/nebula-base-crypto/src/main/java/cn/cloudomni/nebula/crypto/`（`NebulaCryptoService` + `CryptoScope`，作用域绑进 AAD，密文带 `enc:` 前缀）。

**（11）模块依赖现状（本计划的接入前提）**

- `grep -rn "nebula-storage" nebula-auth/*/pom.xml` **无任何匹配**（实测退出码 1）→ auth 目前完全不依赖 storage，B8/B9 要调 `IStorageService` 必须先补依赖。
- `nebula-storage/nebula-storage-core/pom.xml` 的依赖只有 `nebula-storage-api`、`nebula-storage-provider-spi`、`nebula-base-common`、`nebula-base-mybatis`、`nebula-base-cache`、`nebula-event-api`、`nebula-param-api`、`nebula-scheduler-api` 及技术性依赖，**不依赖 auth** → auth 依赖 `nebula-storage-api` 不会产生模块环。
- `nebula-app/nebula-app-starter/pom.xml:81` 已含 `nebula-storage-local` → **local 架构**下 auth-local 无需额外声明即可注入 `IStorageService` 实现。
- `nebula-auth/nebula-auth-service/pom.xml` 已有 `nebula-param-remote`（第 40 行）作为「独立服务装配 remote 实现」的先例 → **remote 架构**下按同一模式补 `nebula-storage-remote`。
- `nebula-auth/nebula-auth-core/pom.xml:43` 已有 `nebula-base-crypto`；而 `nebula-notify/nebula-notify-core/pom.xml` **没有** → B12 的加签密钥加密必须先补该依赖。
- 分层约束（`docs/spec/02-layering.md`）：跨模块只能依赖对方的 `-api`（契约层），实现层由 `-local` / `-remote` 在启动模块装配。

### 2.3 常用命令

```bash
# 后端定向测试
mvn -pl nebula-notify/nebula-notify-core -am test
mvn -pl nebula-notify/nebula-notify-service -am test
mvn -pl nebula-storage/nebula-storage-core,nebula-storage/nebula-storage-local -am test
mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local -am test
mvn -pl nebula-base/nebula-base-cloud -am test
mvn -pl nebula-gateway/nebula-gateway-service -am test

# 全量编译
mvn -q -T1C -DskipTests install

# 前端
cd web && npx vitest run src/pages/system/notify/record
cd web && npm run typecheck
cd web && npm run build
```

### 2.4 并行进行中的改动（实施前必读）

实施前先了解工作区里一批**未提交**的改动：内容与本计划的三组问题无关，但会改到同一批文件。

- **改动内容**：通知发送记录的**批量删除**功能（后端新增删除能力、前端记录页新增批量删除入口、新增批量删除请求类型、初始化数据与未发布升级脚本）。该功能**未进入**本计划的任何任务。
- **涉及本计划同样会修改的文件**：
  - `nebula-notify/nebula-notify-core/src/main/java/cn/cloudomni/nebula/notify/service/impl/NotifyServiceImpl.java`：已新增 `removeNotifyRecords`（约 +25 行）；`getNotifyRecordDetail` 本身**未改**，仍是 `List.of(...)` 写法 —— 即 B1 尚未实施。
  - `nebula-notify/nebula-notify-local/src/main/java/cn/cloudomni/nebula/notify/controller/NotifyController.java`
  - `nebula-notify/nebula-notify-core/src/test/java/cn/cloudomni/nebula/notify/service/impl/NotifyServiceImplTest.java`
  - `web/src/pages/system/notify/record/index.tsx`、`web/src/pages/system/notify/record/record-table.tsx` 及其测试文件
  - `web/src/services/notify.ts`
  - `docs/sql/init/mysql/02-init-data.sql`、`docs/sql/init/postgresql/02-init-data.sql`
  - 未跟踪的新文件：`docs/sql/unreleased/mysql/03-notify-record-delete-button.sql`、`docs/sql/unreleased/postgresql/03-notify-record-delete-button.sql`、`BatchDeleteNotifyRecordReq.java`
- **实施要求**：
  1. 必须在上述未提交改动所在的**同一工作树基础上做增量修改**，禁止整文件覆盖：`NotifyServiceImpl.java`、`NotifyServiceImplTest.java`、`NotifyController.java`、`web/src/services/notify.ts` 与通知记录页三个前端文件都已有未提交改动，覆盖会直接丢失批量删除功能。
  2. B1、B2、B13 与前端 F5 实施完成后，必须重跑对应模块测试确认未破坏批量删除功能：`mvn -pl nebula-notify/nebula-notify-core -am test`、`mvn -pl nebula-notify/nebula-notify-service -am test`、`cd web && npx vitest run src/pages/system/notify/record`（同时执行 `cd web && npm run typecheck`）；改造 `NotifyServiceImplTest` 时不得删除或弱化批量删除的既有用例。
  3. 若该批量删除功能后续被回滚（或这批未提交改动被丢弃），B1 引用的行号（`getNotifyRecordDetail:782-793`、`resolveReceiverUserNames:856-879`、`distinctTextIds:881-890`）需重新核对后再实施。

## 3. 技术方案与关键决策

### 3.1 通知详情修复方式

候选：

- **推荐：入口处先过滤空值，再复用已有的批量解析方法**。`getNotifyRecordDetail` 改为把 `targetId` / `receiverUserId` 收集成可能为空的集合，交给已有的 `distinctTextIds` 过滤（`NotifyServiceImpl.java:881-890` 已实现空值/空白过滤），再调 `resolveTargetNames` / `resolveReceiverUserNames`。
- 改用 `Arrays.asList` / `Collections.singletonList` 允许 null：能消除 NPE，但把 `null` 继续送进 DAO 查询，等于把缺陷往下推。
- 在 `resolveXxxNames` 内部兜底：同样能修，但列表路径与详情路径语义分裂，且掩盖调用方问题。

推荐第一项。理由：`distinctTextIds` 已经承担「空值不进查询」的职责，详情路径绕开它才是缺陷根源；列表路径 `fillRecordDisplayNames`（`824-834`）本来就经过它，两条路径由此统一。

### 3.2 名称解析降级策略

候选：

- **推荐：只吞预期内的业务异常，其余记 ERROR 带堆栈**。`resolveReceiverUserNames` 的 `catch (RuntimeException)` 改为：`BusinessException` 且错误码属于「用户不存在/已删除」这类预期情况 → `log.debug` 且不填名；其它异常 → `log.error("...", ex)` 保留堆栈后不填名（仍不阻断列表/详情）。
- 完全去掉 catch：名称查不到会让整个记录列表 500，回归风险高。
- 保持全吞但补堆栈：仍会把「用户服务彻底不可用」这类系统性故障长期压低级别。

推荐第一项，同时满足 `docs/spec/07-exception.md` 对降级日志的要求：预期分支安静、非预期分支带堆栈进 ERROR。

### 3.3 群机器人接收人展示脱敏

候选：

- **推荐：后端写入 `receiver` 时就脱敏，前端不再把 `receiver` 当群机器人回退**。脱敏规则：保留 `scheme + host + path 前缀`，`access_token` 等查询参数的值替换为固定掩码（如 `***`）；非 URL 值原样保留。
- 只在接口响应层脱敏：库里仍存明文 URL，任何直接查库/导出的路径继续泄露。
- 前端只在渲染层打码：其它消费方（导出、OpenAPI 调试、日志）仍会看到完整地址。

推荐第一项，双管齐下：写入侧脱敏保证存储与所有出口一致；前端去掉回退保证即便历史数据里仍是完整 URL 也不会显示。历史数据不做迁移（见第 8 节风险）。

### 3.4 内部端点认证方案

候选：

- **推荐：在 `nebula-base/nebula-base-cloud` 统一实现服务间 HMAC 签名**。签名串为 `METHOD\nPATH\nTIMESTAMP\nHEX(SHA256(body))`，用配置密钥做 `HmacSHA256` 后 Base64 放进请求头；服务端按同一规则重算并比对，同时校验时间窗口（建议 ±300 秒）。密钥未配置时 **fail-closed：拒绝所有内部调用**。供 notify→auth 用户查询、auth→storage 批量绑定共用。
- 全局透传 `Authorization`。**明确不采用**：会把用户令牌外溢到本不需要它的下游；且 `UserController.getUserById` / `pageUsers` 未加权限码校验，一旦令牌可用，任何登录用户都能借 notify 服务查任意用户，属典型 confused deputy —— 等于用一个漏洞换另一个。
- 复用 `StorageSignedDownloadSupport` 的下载签名。**不采用**：它是「面向终端用户的一次性 URL 签名」，参数与语义都绑在下载链路上，改造成服务间双向认证会把两个关注点耦死。

推荐第一项。内部端点使用独立前缀：auth 用 `/api/auth/internal/**`，storage 用 `/api/storage-internal/**`。`/api/auth/internal/**` 落在网关 `Path=/api/auth/**` 路由内，因此网关必须拦截；`/api/storage-internal/**` 不在任何路由内，但仍在 storage 服务自己的端口上，安全靠签名而非网络。

配套约束：

- 内部端点一律不登记进网关路由；网关新增过滤器对 `/api/auth/internal/**` 直接返回 404，并在既有路由上加 `RemoveRequestHeader` 剥离 `X-Nebula-Internal-*` 签名头，防止外部伪造透传到下游。
- auth 内部用户端点按 `nebula.architecture.mode=remote` 条件注册（照抄 `AuditInternalRecordController` 的先例），且路径放进**可配置白名单**，不改 `AuthProperties` 的固定放行名单（固定名单里塞内部端点会让单体模式也暴露它）。
- 签名校验失败返回新错误码 `24028`（storage 侧）/ 统一 401（auth 侧），只记录「签名不通过 + 调用方 IP」，不记录密钥。
- **密钥配置来源（定案）**：签名密钥**必须走环境变量 `NEBULA_INTERNAL_AUTH_SECRET`**，`application.yml` 只保留占位 `${NEBULA_INTERNAL_AUTH_SECRET:}`，缺省为空即 fail-closed。依据 `docs/spec/09-security.md` 中「配置文件不得直写敏感信息、必须环境变量注入」的既有口径（同文件第 315-318 行微信 `app-secret` 就是这个写法）。禁止在 yml 里落具体密钥值，禁止给默认值。
- **防重放（定案）**：**不做 nonce 缓存**，只靠 ±300 秒时间窗 + 绑定幂等。理由：本计划的内部调用只有两类 —— 用户名称查询（只读、幂等）与文件绑定（幂等键为 `taskId`，重复请求返回同一 fileId）。重放同一请求不会产生额外副作用，为它引入 nonce 存储（Redis/内存 + TTL 清理）属于用有状态组件换一个本就不存在的风险。若未来内部端点出现非幂等写操作，必须回到本节重新评估。

**实现落定（B3 第一批实施定案，下游任务不得各自发挥）**：

- **头部名称固定**：`X-Nebula-Internal-Signature`（签名，Base64）与 `X-Nebula-Internal-Timestamp`（秒级时间戳）。大小写与连字符形式固定，与网关剥离规则 `X-Nebula-Internal-*` 及 4.2 表格一致，B4/B5/B6/B14 一律引用这两个名字。
- **`HEX(SHA256(body))` 取小写十六进制**；空 body 按 `SHA256("")` 计算（不是跳过该段、也不是按 `null` 处理）。小写这一点必须两侧一致，用固定测试向量锁死。
- **加签范围仅两个前缀**：`/api/auth/internal`、`/api/storage-internal`。出站 `Feign` 请求只在这两个前缀上计算并附加签名头，其它既有业务 Feign 调用不带头、行为不变。
- **类名与 Bean 名固定**：`InternalSignatureProperties`、`InternalRequestSigner`、`InternalSignatureVerifier`（B5 的 Feign 客户端与 B6 的拦截器按这三个名字注入，不得另起别名或再包一层）。
- **Bean 始终装配**：`nebula.internal-auth.secret` 为空时仍然注册 `InternalSignatureVerifier`，但校验一律返回拒绝（fail-closed），并打一条 WARN：「内部调用认证未配置，内部端点将拒绝所有请求」。**不是**「缺密钥就不注册 Bean」—— 后者会造成内部端点在无校验者的情况下被放行，或直接让上下文启动失败，两者都与 fail-closed 相悖（yml 占位的落地任务见 B15）。

### 3.5 加签密钥存储方案

候选：

- **推荐：新增专用密文列 `sign_secret_cipher`（`sys_notify_channel_target`），走 `nebula-base-crypto` 的 `CryptoScope` 加密**。`CryptoScope` 自然键取该行的 `id`（建行后不可变），作用域 `("sys_notify_channel_target", "sign_secret_cipher", id)`；接口只写入 `signSecret`、只读出 `hasSignSecret`。`configJson` 保持原样、不承载密钥。
- 复用 `configJson` 存密钥：读接口原样返回、无加密、无校验，等于明文泄露，**不可接受**。
- 单独建一张密钥表：多一张表与一次关联查询，对单列密钥是过度设计，且要额外处理删除级联。

推荐第一项。理由：与 `nebula-base-crypto` 既有契约完全一致（空值原样返回、`enc:` 前缀双读、解不开必须抛异常），自然键用行 id 满足「不可变」要求，能把密文绑定到具体行（搬到别的行解不开）。

**写接口语义（定案）**：

| 入参组合 | 行为 |
|---|---|
| `signSecret` 有值、`clearSignSecret` 为空/false | 加密后写入 `sign_secret_cipher` |
| `signSecret` 为 `null` 或空白、`clearSignSecret` 为空/false | **保留原值**，不动该列 |
| `signSecret` 为 `null` 或空白、`clearSignSecret=true` | 把 `sign_secret_cipher` 置空（清除密钥） |
| `signSecret` 有值、`clearSignSecret=true` | **参数冲突**，返回参数错误，不落库 |

本轮前端可不提供「清除密钥」入口，但**契约必须支持**该字段，否则以后清除密钥只能靠改库。响应侧只有 `hasSignSecret`。

加签算法只用 JDK：`HmacSHA256(secret, timestamp + "\n" + secret)` → Base64 → `URLEncoder.encode`，拼到 webhook URL 的 `timestamp` / `sign` 查询参数。提供纯函数签名工具 + 固定测试向量，便于在假 `HttpServer` 上断言。未配置密钥的机器人按未加签发送（保持现有行为）。

### 3.6 批量绑定语义

候选：

- **推荐：storage 侧新增内部方法 `IStorageService.bindUploadTasks(BindUploadTasksCommand)`**，一次绑定多个 taskId，同一 `(sourceEntity, sourceId, sourceType)` 允许多条 `storage_file`（通用多文件能力）；返回**有序**结果（顺序 = 入参 `taskIds` 顺序）；单次 `taskIds` 总量上限建议 10。
- 保留单文件 `bindUploadTask` 并让业务层循环调用：N 次 RPC、N 个事务，部分成功无法回滚成一致结果。
- 前端继续逐个绑定：与 3.8 的「绑定只在后端完成」冲突。

推荐第一项。

归属由服务端派生：

- 内部命令用 `sourceScope ∈ {USER, TENANT}` + `sourceEntity` + `sourceType`，`sourceId` 由 storage 侧派生（`USER → operatorUserId`，`TENANT → tenantId`）。
- 请求体**永不接受** `sourceId`（`BindUploadTasksCommand` 不含该字段，从契约上消灭伪造可能）。
- 业务对外请求只多一个 `uploadTaskIds: Map<String, List<String>>`（key 为资源位，服务端按白名单校验），对外响应结构不变。

幂等与重试：

- 幂等键为 `taskId`。顺序改为**先** `getByUploadTaskId`、**后** `requireUploadTask`：
  - 命中且 source 三元组一致 → 返回既有 fileId（重试幂等）；
  - 命中但三元组不一致 → 抛 `UPLOAD_TASK_ALREADY_BOUND(24003)`；
  - 未命中 → 才 `requireUploadTask`。
- 批量路径**不再**把 task 置 `FAILED`（`StorageServiceImpl.java:316-324` 的行为在批量方法里去掉），残留交给 `storage.upload.temp-retention-days` 定时清理。
- `task.getUploadUserId()` 与 `operatorUserId` 不一致 → 新增 `24029 UPLOAD_TASK_UPLOADER_MISMATCH`。
- 内部签名不通过 → 新增 `24028 INTERNAL_SIGNATURE_INVALID`。

### 3.7 业务层单值约束

`avatar`、`logo`、`login-logo`、`favicon`、`login-background` 都是**单值资源位**：业务层强制每个资源位 `taskIds.size() == 1`，`>1` 报业务错误。该约束留在 auth 业务层，storage 不为业务开后门（storage 只提供通用多文件能力，不知道哪个资源位是单值）。

候选：把单值约束下推到 storage（靠 `sourceType` 判断）→ 业务语义泄漏到通用存储模块，新增资源位就要改 storage；由前端保证只传一个 → 前端不是可信边界。推荐留在 auth 业务层。

### 3.8 纯后端绑定（删除公共 bind 端点）

决策：**删除公共 `POST /api/storage/upload-tasks/{taskId}/bind` 端点**，同时删除前端 `web/src/api/storage.ts`、`web/src/types/storage.ts`、`mobile/src/storage/upload-service.ts`、`packages/client-sdk` 中的对应能力。绑定只在后端业务保存流程内完成：头像在个人资料保存方法里绑定，4 个企业资料图资源位（`logo` / `login-logo` / `favicon` / `login-background`）在租户资料保存方法里绑定。

理由：绑定正确性依赖「与业务保存同事务/同一次用户操作」，把它开成公共端点等于把内部步骤暴露给任意登录用户；同时删掉它可以让「绑定失败但业务已保存」这类不一致无法由前端制造。

### 3.9 钉钉列宽

`sys_notify_record.channel_type` 统一加宽到 `VARCHAR(32)`（与 `sys_notify_template_variant`、`sys_notify_channel_target` 对齐），修改：两份 init 结构、两份测试 schema、`docs/projects/nebula/notify/ddl.md`；并在 `docs/sql/unreleased/mysql/` 与 `docs/sql/unreleased/postgresql/` 新增**成对、幂等**的加宽脚本，同步更新 `docs/sql/README.md` 的 unreleased 条目。

候选：只加宽到 22 → 下个渠道名再超一字符就复发；把 `channel_type` 改成字典码 + 展示名分离 → 影响面远超本次范围。推荐对齐既有 32。

### 3.10 钉钉错误诊断

按渠道区分错误码，并把 `errcode` / HTTP 状态写入 `fail_reason`：企业微信沿用 `22023`（文案已经正确），钉钉、飞书各自新增专用码（编号见第 4 节）；`fail_reason` 形如 `DINGTALK_GROUP_WEBHOOK: http=200, errcode=310000, errmsg=sign not match`。日志与 `fail_reason` **都不得**包含完整 URL、`access_token` 或密钥。

## 4. 数据模型与接口契约

### 4.1 新增 / 变更的内部命令与 DTO

| 类型 | 模块 | 字段 | 说明 |
|---|---|---|---|
| 新增 `BindUploadTasksCommand` | `nebula-storage-api` | `sourceScope` | `USER` / `TENANT`，决定 `sourceId` 的派生来源 |
| | | `sourceEntity` | 业务实体名，如 `user-avatar` / `tenant-profile` |
| | | `sourceType` | 资源位名，如 `avatar` / `logo` / `login-logo` / `favicon` / `login-background` |
| | | `taskIds` | 有序 `List<String>`，长度上限 10 |
| | | `operatorUserId` | 当前操作人（由服务端上下文填充，不接受客户端直传） |
| | | ~~`sourceId`~~ | **不设该字段**，从契约上禁止伪造归属 |
| 新增 `BindUploadTaskResultDto` | `nebula-storage-api` | `taskId` | 回显入参 taskId |
| | | `fileId` | 正式文件 id（既有或新建） |
| | | `fileName` / `fileSize` / `fileMimeType` | 便于业务层回填展示地址 |
| 变更 `UpdateProfileReq` | `nebula-auth-local` | `uploadTaskIds: Map<String, List<String>>` | 唯一合法 key：`avatar`；`avatar` 的 value 必须恰好 1 个元素 |
| 变更 `UpdateTenantProfileReq` | `nebula-auth-local` | `uploadTaskIds: Map<String, List<String>>` | 合法 key：`logo`、`login-logo`、`favicon`、`login-background`；每个 key 的 value 必须恰好 1 个元素；未知 key 报错 |
| 变更 `CreateNotifyChannelTargetReq` / `UpdateNotifyChannelTargetReq` | `nebula-notify-local` | `signSecret: String` | 只写入；`null` 或空白 = 保留原值 |
| 同上 | 同上 | `clearSignSecret: Boolean` | 只写入；`true` = 清除密文；与有值的 `signSecret` 同时出现视为参数冲突（错误码见 4.3） |
| 变更 `NotifyChannelTargetResp` / `NotifyChannelTargetDto` | `nebula-notify-local` / `nebula-notify-api` | `hasSignSecret: Boolean` | 只读出；**不出现任何形式的密钥明文或密文** |
| 变更 `NotifyRecordDetailDto` / `NotifyRecordDto` | `nebula-notify-api` | 无新增字段 | `receiver` 的语义变更见 4.4；响应结构不变 |
| 新增 `InternalUserQueryReq` / `InternalUserBriefDto` | `nebula-auth-api` | `userIds` / `id, username, nickname, email` | 内部批量用户查询，单次上限 100 |

### 4.2 内部端点

| 项 | auth 内部用户查询 | storage 内部批量绑定 |
|---|---|---|
| 方法与路径 | `POST /api/auth/internal/users/batch` | `POST /api/storage-internal/upload-tasks/bind` |
| 注册条件 | `@ConditionalOnProperty(prefix="nebula.architecture", name="mode", havingValue="remote")` + 路径进可配置白名单 | 常量路径，始终注册，由签名拦截器把关 |
| 认证 | `X-Nebula-Internal-Signature` / `X-Nebula-Internal-Timestamp` 头，HMAC 校验 | 同左 |
| 请求体 | `{"userIds": ["u1","u2"]}` | `{"sourceScope":"USER","sourceEntity":"user-avatar","sourceType":"avatar","operatorUserId":"u1","taskIds":["t1"]}` |
| 响应体 | `ApiResult<List<InternalUserBriefDto>>`，缺失的用户不返回、不报错 | `ApiResult<List<BindUploadTaskResultDto>>`，顺序 = 入参 `taskIds` 顺序 |
| 失败 | 签名不通过 → 401（不泄漏原因细节）；`userIds` 超 100 → 参数错误 | 签名不通过 → `24028`；task 不属于操作人 → `24029`；已绑到别的 source → `24003`；`taskIds` 超上限 → 见 4.3 |
| 网关 | 必须被拦截：`/api/auth/internal/**` 落在 `Path=/api/auth/**` 路由内 | 不登记路由（`/api/storage-internal/**` 不匹配 `Path=/api/storage/**`） |

签名串（两侧必须完全一致，实现以共享工具类为准）：

```
METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + HEX(SHA256(rawBody))
signature = Base64(HmacSHA256(secret, 上述字符串))
```

### 4.3 错误码

| 码 | 枚举 | 文案 | 说明 |
|---|---|---|---|
| `24003` | `UPLOAD_TASK_ALREADY_BOUND`（已存在） | 上传任务已绑定正式文件 | 本次改为：仅当 source 三元组**不一致**时抛出 |
| `24028` | `INTERNAL_SIGNATURE_INVALID`（新增） | 内部调用签名无效 | 签名缺失/过期/不匹配统一用它，不回显差异 |
| `24029` | `UPLOAD_TASK_UPLOADER_MISMATCH`（新增） | 上传任务不属于当前用户 | `task.uploadUserId != operatorUserId` |
| `24030` | `BIND_TASK_LIMIT_EXCEEDED`（新增，已定案） | 单次绑定任务数超出上限 | `taskIds.size() > 10` |
| `22023` | `WEBHOOK_SEND_FAILED`（沿用） | 企业微信群机器人发送失败 | 仅企业微信渠道继续使用 |
| `22047` | `DINGTALK_SEND_FAILED`（新增） | 钉钉群机器人发送失败 | 编号接在现有最大码 `22046` 之后 |
| `22048` | `FEISHU_SEND_FAILED`（新增） | 飞书群机器人发送失败 | 同上 |
| `22049` | `CHANNEL_TARGET_SIGN_SECRET_INVALID`（新增） | 机器人加签密钥配置无效 | 解密失败或密钥格式非法 |
| `10033` | `PROFILE_ASSET_TASK_INVALID`（新增，已定案） | 该资源位只能上传一个文件 | auth 用户模块码段（`10000-10999`）当前最大码为 `10032`，`10033` 为下一个空闲码；**实现前必须复查**（见下） |
| `19024` | `TENANT_PROFILE_INVALID`（沿用） | 租户资料不合法 | 企业资料图资源位校验失败复用它 + 具体消息 |

加签密钥参数冲突（`signSecret` 有值且 `clearSignSecret=true`）：复用 `22049` 并给出明确消息，不新增码。

> **码段复查动作（实现前必做，写进 B7/B12/B13 的完成判据）**：对每个待新增码执行
> `grep -o '"[0-9]{5}"' <对应错误码枚举文件> | tr -d '"' | sort -n | tail -5`，
> 确认目标码未被占用；若已被占用则顺延到下一个空闲码，并在实施回报中记录实际使用的码值。

### 4.4 语义与契约变更清单

| 项 | 变更前 | 变更后 |
|---|---|---|
| `GET /api/notify/records/{id}` | 每条记录 500 | 正常返回；名称缺失时为 `null`，不再抛 NPE |
| `sys_notify_record.receiver`（群机器人渠道） | 完整 webhook URL（含 `access_token`） | 脱敏 URL（保留 scheme+host，`access_token` 打码）；新建记录按新规则写入 |
| 前端群机器人「接收人」列 | `targetName` 为空时回退 `receiver` | 不回退；显示 `targetName`，缺失时显示渠道名或 `-` |
| `POST /api/storage/upload-tasks/{taskId}/bind` | 公共端点，`STORAGE_UPLOAD` 语境 | **删除**（破坏性变更，需 changelog 声明） |
| `IStorageService.bindUploadTask` | 单文件、先查 task 再查 file、失败置 `FAILED` | 保留内部单文件语义但改为先查 file；批量走新增 `bindUploadTasks` |
| `getStorageFileBySource` | 多文件抛 `IllegalStateException` | 多文件返回**最新一条**（`create_time DESC, id DESC`） |
| `StorageFileDao.getBySource` 排序 | `create_time DESC` | `create_time DESC, id DESC` |
| `sys_notify_record.channel_type` | `VARCHAR(20)` | `VARCHAR(32)` |
| `sys_notify_channel_target` | 无密钥列 | 新增 `sign_secret_cipher`（密文，`enc:` 前缀） |
| `Create/UpdateNotifyChannelTargetReq` | 无密钥字段 | 新增 `signSecret`（只写）+ `clearSignSecret`（只写，显式清除） |

### 4.5 DDL 变更与幂等升级脚本

| 变更 | 文件 | 要求 |
|---|---|---|
| `sys_notify_record.channel_type VARCHAR(20) → VARCHAR(32)` | `docs/sql/init/mysql/01-init-structure.sql:517` | 直接改建表语句 |
| 同上 | `docs/sql/init/postgresql/01-init-structure.sql:772` | 同上 |
| 同上 | `nebula-notify/nebula-notify-service/src/test/resources/db/test/notify-schema-h2.sql:63` | 同上 |
| 同上 | `nebula-notify/nebula-notify-service/src/test/resources/db/test/notify-schema-postgres.sql:67` | 同上 |
| 同上 | `docs/projects/nebula/notify/ddl.md:78` | 同步表说明 |
| 同上（升级脚本） | 新增 `docs/sql/unreleased/mysql/04-notify-record-channel-type-width.sql`、`docs/sql/unreleased/postgresql/04-notify-record-channel-type-width.sql` | 成对；`MODIFY COLUMN` / `ALTER COLUMN ... TYPE` 天然幂等（重复执行结果一致）；脚本头注释写明「回滚前先确认存量值均 ≤ 20 字符」 |
| 新增 `sign_secret_cipher` | 两份 init 结构 `sys_notify_channel_target` 建表语句（`mysql:504` 附近 / `postgresql:749` 附近） | `VARCHAR(1024) NULL`，注释「加签密钥密文（enc: 前缀）」 |
| 同上（升级脚本） | 新增 `docs/sql/unreleased/mysql/05-notify-channel-target-sign-secret.sql`、`docs/sql/unreleased/postgresql/05-notify-channel-target-sign-secret.sql` | 用存在性判断实现幂等（MySQL 查 `information_schema.COLUMNS` 后再 `PREPARE` 执行；PG 用 `ADD COLUMN IF NOT EXISTS`）。编号说明：`03-` / `04-` 已被占用（`03` 为并行改动、`04` 为列宽脚本），故本脚本取 `05-` |
| 索引登记 | `docs/sql/README.md` 的 `unreleased/` 条目 | 补 `03` / `04` / `05` 三条说明（`03` 为并行改动的记录删除按钮脚本），各写清方言差异与幂等策略 |

`schema.sql` 之外，`docs/projects/nebula/notify/ddl.md` 需补 `sign_secret_cipher` 行与「密钥只写入、只读出 `hasSignSecret`」的说明。

### 4.6 前后端字段一致性

| 契约点 | 后端 | 前端 | 一致性要求 |
|---|---|---|---|
| 头像提交 | `UpdateProfileReq.uploadTaskIds`（key `avatar`） | `web/src/pages/profile/info/index.tsx` 提交体 | 字段名、key 拼写、`List<String>` 结构完全一致；前端不再传 `avatar` URL |
| 企业资料图提交 | `UpdateTenantProfileReq.uploadTaskIds`（4 个 key） | `web/src/pages/tenant/settings/enterprise/index.tsx` 提交体 | 同上；4 个 key 与 `TenantAssetUpload` 的 `sourceType` 取值一致 |
| 通知记录接收人 | `NotifyRecordResp.receiverUserName` / `targetName` | `record-presentation.tsx` | 前端只读 `receiverUserName`（用户型）/ `targetName`（群机器人型），不再回退 `receiver` |
| 渠道目标密钥 | `signSecret` 入、`hasSignSecret` 出 | 渠道目标表单 | 前端不得出现任何名为 `signSecretCipher` / `signSecret` 的**响应**字段 |
| 存储绑定 | 无公共 bind 端点 | 无 bind 调用 | `web/src/api/storage.ts`、`web/src/types/storage.ts`、`mobile`、`packages/client-sdk` 中 `bindUploadTask` 全部消失 |

## 5. 任务拆分

### 后端任务

#### B1 通知详情 NPE 修复与名称回填降级

- **输入**：`NotifyServiceImpl.getNotifyRecordDetail:782-793`、`resolveReceiverUserNames:856-879`、`distinctTextIds:881-890`、`docs/spec/07-exception.md`。
- **产出文件**：
  - 修改 `nebula-notify/nebula-notify-core/src/main/java/cn/cloudomni/nebula/notify/service/impl/NotifyServiceImpl.java`
  - 修改 `nebula-notify/nebula-notify-core/src/test/java/cn/cloudomni/nebula/notify/service/impl/NotifyServiceImplTest.java`
- **完成判据**：
  - 详情路径改为经 `distinctTextIds` 过滤后解析，`targetId`/`receiverUserId` 为 `null` 时不再构造含 null 的集合。
  - 新增用例：`targetId=null` 的用户型记录、`receiverUserId=null` 的群机器人记录、两者皆空的历史脏数据，三者调用 `getNotifyRecordDetail` 均不抛异常。
  - 新增用例：用户服务抛 `BusinessException(USER_NOT_FOUND)` 时降级不填名、不中断；抛 `RuntimeException("boom")` 时仍不中断但走 `log.error` 且带异常对象（用 `Mockito` + 日志断言或捕获 appender 验证）。
  - 命令 `mvn -pl nebula-notify/nebula-notify-core -am test` 输出 `BUILD SUCCESS`，且 `NotifyServiceImplTest` 用例数 > 68（原 68 个 + 新增）。

#### B2 群机器人 receiver 脱敏（后端）

- **输入**：`NotifyServiceImpl.resolveReceiver:1689-1701`、`docs/spec/09-security.md`。
- **产出文件**：
  - 新增 `nebula-notify/nebula-notify-core/src/main/java/cn/cloudomni/nebula/notify/support/EndpointUrlMasker.java`（纯函数工具）
  - 修改 `NotifyServiceImpl.java`（非用户渠道写 `receiver` 前调用掩码）
  - 新增 `nebula-notify/nebula-notify-core/src/test/java/cn/cloudomni/nebula/notify/support/EndpointUrlMaskerTest.java`
- **完成判据**：
  - 掩码后保留 `scheme://host/path`，`access_token`、`token`、`secret`、`key` 等查询参数的值替换为固定掩码；无查询参数时原样返回；非 URL 字符串原样返回。
  - 用例覆盖：钉钉完整 URL、企业微信 `?key=...`、飞书 `?hook_id=...`、`https://host/path`（无参数）、空值与 `""`。
  - 断言掩码结果不含原始 token 子串（如 `assertThat(masked).doesNotContain("abcdef123456")`）。
  - `mvn -pl nebula-notify/nebula-notify-core -am test` → `BUILD SUCCESS`。

#### B3 服务间 HMAC 签名基础设施

- **输入**：`nebula-base/nebula-base-cloud` 现有 `UserContextInterceptor`、`NebulaCloudProperties`、`StorageSignedDownloadSupport`（签名实现参照）、`docs/spec/09-security.md`。
- **产出文件**：
  - 新增 `nebula-base/nebula-base-cloud/src/main/java/cn/cloudomni/nebula/cloud/internal/InternalRequestSigner.java`（客户端签名，纯函数 + Feign `RequestInterceptor`）
  - 新增 `.../internal/InternalSignatureVerifier.java`（服务端校验）
  - 新增 `.../internal/InternalSignatureProperties.java`（`nebula.internal-auth.secret`、`clock-skew-seconds`，默认 300；`secret` 在 yml 里只写占位 `${NEBULA_INTERNAL_AUTH_SECRET:}`，禁止落具体值）
  - 新增 `.../internal/InternalAuthAutoConfiguration.java`
  - 新增测试 `nebula-base/nebula-base-cloud/src/test/java/cn/cloudomni/nebula/cloud/internal/InternalRequestSignerTest.java`、`InternalSignatureVerifierTest.java`
- **完成判据**：
  - 签名串严格为 `METHOD\nPATH\nTIMESTAMP\nHEX(SHA256(body))`，两侧共用同一构造方法（测试断言字符串字面量）。
  - 固定测试向量：给定 secret / method / path / timestamp / body，断言输出签名 Base64 与手工计算的常量一致。
  - 密钥未配置 → `verifier` 一律拒绝；`signer` 抛 `BusinessException` 或拒绝发送（fail-closed，测试断言「未配置时 verify 返回 false」）。
  - 密钥来源校验：`grep -rn "NEBULA_INTERNAL_AUTH_SECRET" --include=*.yml .` 只出现在 `${...}` 占位里，无具体密钥字面量（`grep -rn "nebula.internal-auth.secret: [0-9A-Za-z]"` 无匹配）。
  - 防重放边界：同一签名 + 同一时间戳在窗口内重复提交两次均通过校验（这是有意为之，靠下游幂等吸收；测试固定该行为，避免后续误加 nonce 破坏幂等契约）。
  - 时间戳超出 `clock-skew-seconds` → 拒绝；body 被改动 → 拒绝；签名 base64 篡改 → 拒绝。
  - `mvn -pl nebula-base/nebula-base-cloud -am test` → `BUILD SUCCESS`。

#### B4 auth 内部用户批量查询端点

- **输入**：`AuthProperties`、`SecurityConfig`、`AuditInternalRecordController`（条件注册先例）、`IUserService`。
- **产出文件**：
  - 新增 `nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/model/req/InternalUserQueryReq.java`、`.../model/dto/InternalUserBriefDto.java`（均带 `@Schema`）
  - 新增 `nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/controller/InternalUserController.java`
  - 修改 `nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/config/AuthProperties.java`（新增可配置内部路径白名单属性）
  - 修改 `nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/config/SecurityConfig.java`（让白名单生效于 `publicSecurityFilterChain`）
  - 新增 `nebula-auth/nebula-auth-local/src/test/java/cn/cloudomni/nebula/auth/controller/InternalUserControllerTest.java`
- **完成判据**：
  - `@ConditionalOnProperty(prefix="nebula.architecture", name="mode", havingValue="remote")`：`local` 模式下上下文里不存在该 Bean（用 `ApplicationContextRunner` 断言）。
  - `remote` 模式下 `POST /api/auth/internal/users/batch` 在**不带任何用户令牌**、带合法签名时返回 200 与用户列表；不带签名返回 401。
  - `userIds` 含不存在 id 时不报错，仅在结果中缺失；`userIds.size() > 100` 时返回参数错误。
  - `AuthProperties` 的固定放行名单常量未改动（`git diff` 中该常量块无变化）。
  - `mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local -am test` → `BUILD SUCCESS`。

#### B5 notify 用户名称解析改走内部签名端点

- **输入**：`UserRemoteServiceImpl`、`StorageFeignClient`（内部客户端写法参照）、B3 的签名工具、B4 端点契约。
- **产出文件**：
  - 新增 `nebula-notify/nebula-notify-local/src/main/java/cn/cloudomni/nebula/notify/local/internal/InternalAuthFeignClient.java`（`@FeignClient`，路径 `/api/auth/internal/users/batch`，带签名拦截器）
  - 新增 `nebula-notify/nebula-notify-local/src/main/java/cn/cloudomni/nebula/notify/local/internal/NotifyReceiverNameRemoteResolver.java`（组装批量请求、去重与降级）
    - 装配条件：两者均按 `@ConditionalOnProperty(prefix = "nebula.architecture", name = "mode", havingValue = "remote")` 注册，即只在 remote 架构下存在同名 Bean；local 架构不注册，名称走既有逐用户路径。
    - 落点原因（实现必须随服务模块打包）：`nebula-notify-service` 已依赖 `nebula-notify-local`，而 `ModuleMarkerConflictChecker` 禁止同一应用同时出现 local 与 remote 模块标记，因此实现不能放 `nebula-notify-remote`；若放 remote，微服务部署（`nebula-notify-service`）下该 Bean 会缺席，名称解析退回逐用户调用，内部端点等于白做。
  - 修改 `nebula-notify/nebula-notify-core/src/main/java/cn/cloudomni/nebula/notify/service/impl/NotifyServiceImpl.java`（名称解析改为批量调用，失败仍按 B1 策略降级）
  - 修改/新增 `nebula-notify/nebula-notify-local/src/test/java/cn/cloudomni/nebula/notify/local/internal/InternalAuthFeignClientTest.java`
- **完成判据**：
  - `resolveReceiverUserNames` 对整页去重后的 id 集合**一次**调用批量端点（测试断言调用次数为 1，而非 id 数量）。
  - 单页 50 条记录、20 个不重复接收人时，日志中不再出现「接收用户名称解析失败」的 WARN。
  - 内部调用失败（mock 抛异常）时列表/详情仍返回，名称为 `null`，日志为 ERROR 带堆栈。
  - `grep -rn "getUserDetail" nebula-notify/nebula-notify-core/src/main` 仅剩与邮箱解析相关的调用（`resolveReceiverEmail`），且 remote 装配路径下不再逐用户查询（本地路径保留逐用户是既有行为，不算违约）。
  - `ApplicationContextRunner`：`nebula.architecture.mode=local` 时容器中**无**该 Bean；`nebula.architecture.mode=remote` 时**有**该 Bean。
  - `mvn -pl nebula-notify/nebula-notify-core,nebula-notify/nebula-notify-remote -am test` → `BUILD SUCCESS`。

#### B6 storage 内部批量绑定端点与签名校验

- **输入**：B3 签名工具、`StorageController`、`StorageApiCodes`、`StorageButtonPermissionCoverageTest`（该测试枚举了 Controller 全部方法，删端点后需同步）。
- **产出文件**：
  - 新增 `nebula-storage/nebula-storage-local/src/main/java/cn/cloudomni/nebula/storage/controller/StorageInternalController.java`（`/api/storage-internal/upload-tasks/bind`）
  - 新增 `nebula-storage/nebula-storage-local/src/main/java/cn/cloudomni/nebula/storage/support/InternalSignatureInterceptor.java`
  - 新增 `nebula-storage/nebula-storage-local/src/main/java/cn/cloudomni/nebula/storage/config/StorageInternalWebConfig.java`（`WebMvcConfigurer`，注册拦截器并限定 `/api/storage-internal/**`）
    > 现状核对：`nebula-storage-local` 目前既无 `WebMvcConfigurer` 也无 `SecurityFilterChain`（`grep -rn "WebMvcConfigurer\|SecurityFilterChain" nebula-storage/nebula-storage-local/src/main/java` 无输出），因此本任务只新增 MVC 配置，不需要改安全链白名单。
  - 新增 `nebula-storage/nebula-storage-local/src/test/java/cn/cloudomni/nebula/storage/controller/StorageInternalControllerTest.java`
- **完成判据**：
  - 无签名头 → 返回 `24028`；签名错误/过期/body 被改 → 同样 `24028` 且响应体不含密钥或期望值。
  - 合法签名 + `taskIds: ["t2","t1"]` → 返回结果 `[t2, t1]` 顺序与入参一致（用 MockMvc 断言 `$.data[0].taskId`、`$.data[1].taskId`）。
  - 请求体里出现 `sourceId` 字段时不生效（JSON 含未知字段被忽略，最终 `sourceId` 由 `sourceScope` 派生 —— 用「传 `sourceId=别人` 后查回的 file 仍归属操作人」断言）。
  - 该端点未登记进 `nebula-gateway/nebula-gateway-service/src/main/resources/application.yml`（`grep -c "storage-internal" 该文件` 结果为 0）。
  - `mvn -pl nebula-storage/nebula-storage-local -am test` → `BUILD SUCCESS`。

#### B7 storage 幂等 / 归属 / 语义修正

- **输入**：`StorageServiceImpl:264-353`、`StorageFileDao`、`StorageErrorInfo`、`docs/spec/07-exception.md`。
- **产出文件**：
  - 修改 `nebula-storage/nebula-storage-api/src/main/java/cn/cloudomni/nebula/storage/service/IStorageService.java`（新增 `bindUploadTasks`）
  - 新增 `nebula-storage/nebula-storage-api/src/main/java/cn/cloudomni/nebula/storage/model/command/BindUploadTasksCommand.java`、`.../model/dto/BindUploadTaskResultDto.java`
  - 修改 `nebula-storage/nebula-storage-api/src/main/java/cn/cloudomni/nebula/storage/constant/StorageErrorInfo.java`（`24028`、`24029`、`24030`）
  - 修改 `nebula-storage/nebula-storage-core/src/main/java/cn/cloudomni/nebula/storage/service/impl/StorageServiceImpl.java`
  - 修改 `nebula-storage/nebula-storage-core/src/main/java/cn/cloudomni/nebula/storage/dao/StorageFileDao.java` 与其 XML（`getBySource` 加 `id DESC` 次级排序）
  - 修改 `nebula-storage/nebula-storage-remote/src/main/java/cn/cloudomni/nebula/storage/impl/StorageRemoteServiceImpl.java`（`bindUploadTasks` 走内部 Feign）
  - 新增 `nebula-storage/nebula-storage-core/src/test/java/cn/cloudomni/nebula/storage/service/impl/StorageServiceImplBindTest.java`
- **完成判据**：
  - 幂等顺序：先 `getByUploadTaskId` 后 `requireUploadTask`。用例「task 行已删除但 file 行存在」时 `bindUploadTasks` 返回既有 fileId 且不抛 `24001`。
  - 同一 taskId 以相同三元组重复绑定 3 次 → 3 次返回同一 fileId，`storage_file` 只增 1 行。
  - 同一 taskId 换 `sourceType` 再绑定 → 抛 `24003`。
  - `task.uploadUserId` 与 `operatorUserId` 不一致 → 抛 `24029`，且 task 状态**仍为** `COMPLETED`（不是 `FAILED`）。
  - 批量路径中途某 taskId 非法时整批事务回滚，`storage_file` 无新增行；task 状态无变化。
  - `getStorageFileBySource` 在 2 条记录时返回最新一条（按 `create_time DESC, id DESC`），不再抛异常；`grep -c "IllegalStateException" 该文件` 结果比修改前少 1。
  - `taskIds.size() > 10` 时抛 `24030`（已定案新增该码）。
  - 码段复查：`grep -o '"[0-9]{5}"' nebula-storage/nebula-storage-api/src/main/java/cn/cloudomni/nebula/storage/constant/StorageErrorInfo.java | tr -d '"' | sort -n | tail -5` 输出的最大码 < 本次新增码（否则顺延并在回报中记录实际码值）。
  - `mvn -pl nebula-storage/nebula-storage-core,nebula-storage/nebula-storage-remote -am test` → `BUILD SUCCESS`。

#### B8 auth 头像后端绑定

- **输入**：`ProfileController.updateProfile`、`UpdateProfileReq`、`IUserService.updateUser`、B7 的 `bindUploadTasks` 契约、`IStorageService`。
- **产出文件**：
  - **新增依赖（模块接入前置）**：
    - 修改 `nebula-auth/nebula-auth-core/pom.xml`：增加 `nebula-storage-api`（跨模块只走契约层，符合 `docs/spec/02-layering.md`；`nebula-storage-core` 不依赖 auth，无模块环）
    - 修改 `nebula-auth/nebula-auth-service/pom.xml`：增加 `nebula-storage-remote`（remote 架构下注入 `IStorageService` 实现；local 架构由 `nebula-app/nebula-app-starter` 已有的 `nebula-storage-local`（`pom.xml:81`）提供，auth-local 无需声明）
  - 修改 `nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/model/req/UpdateProfileReq.java`（+`uploadTaskIds` 与 `@Schema`）
  - 修改 `nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/controller/ProfileController.java`（只做透传：把 `uploadTaskIds` 交给 `IUserService.updateUser`，不在 Controller 内绑定）
  - 修改 `nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/model/command/UpdateUserCommand.java`（新增 `uploadTaskIds`）
  - 修改 `nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/model/command/UpdateProfileCommand.java`（同步 `uploadTaskIds`）
  - 修改 `nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/UserServiceImpl.java`（绑定落点在 `updateUser`（`@Transactional`）内完成，与用户保存同事务）
  - 新增 `nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/ProfileAssetBinder.java`（资源位白名单、单值约束、绑定后回填 URL）
  - 修改 `nebula-auth/nebula-auth-local/src/test/java/cn/cloudomni/nebula/auth/controller/ProfileControllerTest.java`
- **完成判据**：
  - 依赖接入：`mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local,nebula-auth/nebula-auth-service -am -DskipTests install` 退出码 0；`mvn -pl nebula-auth/nebula-auth-core dependency:tree -Dincludes=cn.cloudomni:nebula-storage-api` 能解析到 `nebula-storage-api`（输出含该 artifact）；`mvn -pl nebula-auth/nebula-auth-service dependency:tree -Dincludes=cn.cloudomni:nebula-storage-remote` 能解析到 `nebula-storage-remote`。
  - 分层校验：`nebula-auth/nebula-auth-core/pom.xml` 中**不含** `nebula-storage-core` / `nebula-storage-local`（`grep -c "nebula-storage-core\|nebula-storage-local"` 为 0）。
  - 有 `uploadTaskIds.avatar` 且长度为 1 时：先绑定、再用返回 fileId 的下载地址写入 `user.avatar`；响应中 `avatar` 为新地址。
  - `uploadTaskIds.avatar` 长度 > 1 → 返回 `10033`，`user.avatar` 与 `storage_file` 均无变化。
  - 绑定与用户保存在同一事务：`updateUser` 内校验失败（`10033`）时，用户行与 `storage_file` 均无写入（断言事务回滚，无残留 file 行）。
  - 未知 key（如 `logo`）→ 返回 `10033`，不静默忽略。
  - 码段复查：`grep -o '"[0-9]{5}"' nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/constant/AuthErrorInfo.java | tr -d '"' | sort -n | tail -5` 确认 `10033` 未被占用（否则顺延到下一个空闲码并在回报中记录实际码值）。
  - 请求体里传 `sourceId` / `avatar` URL 时，绑定归属仍为当前登录用户（断言 `bindUploadTasks` 收到的命令 `sourceScope=USER`、`operatorUserId=当前用户`）。
  - 未传 `uploadTaskIds` 时行为与修改前完全一致（既有测试全绿）。
  - `mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local -am test` → `BUILD SUCCESS`。

#### B9 租户企业资料图后端绑定

- **输入**：`TenantProfileController`、`UpdateTenantProfileReq`、`TenantProfileServiceImpl.normalizeBranding:212-232`、B7 契约、B8 的 pom 变更。
- **产出文件**：
  - 依赖：复用 B8 已加的 `nebula-auth-core → nebula-storage-api` 与 `nebula-auth-service → nebula-storage-remote`（B8 已完成则本任务不重复修改 pom）
  - 修改 `nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/model/req/UpdateTenantProfileReq.java`（+`uploadTaskIds`）
  - 修改 `nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/controller/TenantProfileController.java`
  - 修改 `nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/TenantProfileServiceImpl.java`（4 个资源位绑定与 URL 回填）
  - 修改 `nebula-auth/nebula-auth-local/src/test/java/cn/cloudomni/nebula/auth/controller/TenantProfileControllerTest.java`
  - 新增（若需覆盖服务层分支）`nebula-auth/nebula-auth-core/src/test/java/cn/cloudomni/nebula/auth/service/impl/TenantProfileServiceImplTest.java`（该文件当前不存在，`nebula-auth-core` 的测试目录内无同名类）
- **完成判据**：
  - 依赖接入：若 B8 未执行，则本任务必须自行完成两处 pom 变更，且 `mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local,nebula-auth/nebula-auth-service -am -DskipTests install` 退出码 0、`dependency:tree` 能解析到 `nebula-storage-api` 与 `nebula-storage-remote`。
  - 4 个资源位（`logo`、`login-logo`、`favicon`、`login-background`）各自传 1 个 taskId 时全部绑定成功，回填到对应字段（tenant.logo / branding.loginLogo / branding.favicon / branding.loginBackground）。
  - 任一资源位传 > 1 个 taskId → `19024` 且带具体消息指明是哪个资源位。
  - 未知资源位 key → `19024`。
  - 绑定命令的 `sourceScope=TENANT`、`sourceId` 由服务端从 `TenantContext` 派生（断言命令里不存在客户端传入的 `sourceId`；JSON 里传 `sourceId=别的租户` 不改变归属）。
  - `mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local -am test` → `BUILD SUCCESS`。

#### B10 删除公共 bind 端点

- **输入**：`StorageController:151`、`StorageApiCodes`、`StorageButtonPermissionCoverageTest`、`StorageRemoteServiceImpl.bindUploadTask`、`StorageFeignClient:103`（`bindUploadTask` 声明）、`StorageFeignClient:130-131`（`POST /files/by-source` 声明）、`StorageRemoteServiceImpl:96-99`（`getStorageFileBySource` 的 Feign 委托）、`IStorageService:111`。
- **产出文件**：
  - 修改 `nebula-storage/nebula-storage-local/src/main/java/cn/cloudomni/nebula/storage/controller/StorageController.java`（删方法）
  - 修改 `nebula-storage/nebula-storage-local/src/test/java/cn/cloudomni/nebula/storage/controller/StorageControllerTest.java`、`.../audit/StorageButtonPermissionCoverageTest.java`
  - 修改 `nebula-storage/nebula-storage-remote/src/main/java/cn/cloudomni/nebula/storage/feign/StorageFeignClient.java`（删 `bindUploadTask` 声明）
  - 修改 `nebula-storage/nebula-storage-remote/src/main/java/cn/cloudomni/nebula/storage/feign/StorageFeignClient.java`（**删除 `POST /files/by-source` 的 `getStorageFileBySource` 声明**，连同仅由它使用的 `GetStorageFileBySourceQuery` import；按第 9 节第 2 条决策，不为该端点补实现）
  - 修改 `nebula-storage/nebula-storage-remote/src/main/java/cn/cloudomni/nebula/storage/impl/StorageRemoteServiceImpl.java`（`getStorageFileBySource` 不再调用被删除的 Feign 声明，改为组合既有端点 `POST /files/list-by-source` + `GET /files/{fileId}` 实现：结果为空返回 `null`，否则取首条并按其 `id` 取详情；`IStorageService.getStorageFileBySource` 契约不变，remote 实现必须编译通过且不复用 `bindUploadTask`）
  - 修改 `nebula-storage/nebula-storage-remote/src/test/java/cn/cloudomni/nebula/storage/impl/StorageRemoteServiceImplTest.java`（`getStorageFileBySource` 用例改为对 `listStorageFilesBySource` / `getStorageFile` 打桩；`bindUploadTask` 用例删除）
- **完成判据**：
  - `grep -rn "upload-tasks/{taskId}/bind\|\"/upload-tasks/{taskId}/bind\"" nebula-storage --include=*.java` 无匹配。
  - `StorageController` 对 `POST /api/storage/upload-tasks/t1/bind` 返回 404（MockMvc 断言 status 404）。
  - `StorageButtonPermissionCoverageTest` 通过（其期望清单已同步删除该条目）。
  - `grep -rn "files/by-source" nebula-storage --include=*.java` 无匹配 —— `StorageFeignClient` 中 `POST /files/by-source` 的声明已删除（按第 9 节第 2 条：删声明、不补实现）。
  - remote 实现编译通过且不再依赖被删声明：`grep -rn "storageFeignClient.getStorageFileBySource" nebula-storage --include=*.java` 无匹配；`mvn -pl nebula-storage/nebula-storage-remote -am test-compile` 退出码 0（`IStorageService` 的两个实现都不因删声明而编译失败）。
  - `StorageRemoteServiceImplTest` 中 `getStorageFileBySource` 用例改为对 `list-by-source` + `files/{fileId}` 打桩后仍 PASS，且仓库内不存在对 `getStorageFileBySource` 语义的回归（既有接口签名未变）。
  - `mvn -pl nebula-storage/nebula-storage-local,nebula-storage/nebula-storage-remote -am test` → `BUILD SUCCESS`。

#### B11 钉钉 channel_type 列宽与升级脚本

- **输入**：`docs/sql/README.md` 的 unreleased 条目、5 处 `VARCHAR(20)` 定义、`NotifyChannelTypes`。
- **产出文件**：
  - 修改 `docs/sql/init/mysql/01-init-structure.sql`、`docs/sql/init/postgresql/01-init-structure.sql`
  - 修改 `nebula-notify/nebula-notify-service/src/test/resources/db/test/notify-schema-h2.sql`、`.../notify-schema-postgres.sql`
  - 修改 `docs/projects/nebula/notify/ddl.md`
  - 新增 `docs/sql/unreleased/mysql/04-notify-record-channel-type-width.sql`、`docs/sql/unreleased/postgresql/04-notify-record-channel-type-width.sql`（编号 `04-`：`03-` 已被并行改动的 `03-notify-record-delete-button.sql` 占用）
- **完成判据**：
  - `grep -rn "channel_type VARCHAR(20)" docs/sql nebula-notify | grep -v target` 无匹配（全部为 32）。
  - 升级脚本连续执行 2 次均可成功（在本地 H2/PG 上用 `psql -f` 或 MySQL 客户端各跑一遍，第二次无报错）。
  - 新增集成用例或断言：插入一条 `channel_type='DINGTALK_GROUP_WEBHOOK'` 的 `sys_notify_record` 成功（现有 `NotifyControllerContractTest` 里已有该字符串用例，确认其落库断言生效）。
  - `mvn -pl nebula-notify/nebula-notify-service -am test` → `BUILD SUCCESS`。

#### B12 钉钉加签密钥列与加签发送

- **输入**：`NotifyServiceImpl.sendDingTalkGroupWebhook:1445-1460`、`NebulaCryptoService` / `CryptoScope`、`NotifyChannelTargetEntity`、B11 的 `sign_secret_cipher` 列。
- **产出文件**：
  - 修改 `nebula-notify/nebula-notify-core/pom.xml`：**增加 `nebula-base-crypto` 依赖**（当前该模块无此依赖，加密加签密钥会直接编译不过；`nebula-auth-core/pom.xml:43` 是同款依赖的既有先例）
  - 修改 `nebula-notify/nebula-notify-core/src/main/java/cn/cloudomni/nebula/notify/model/entity/NotifyChannelTargetEntity.java`
  - 修改 `nebula-notify/nebula-notify-core/src/main/java/cn/cloudomni/nebula/notify/service/impl/NotifyServiceImpl.java`（渠道目标保存时加密、加签发送）
  - 新增 `nebula-notify/nebula-notify-core/src/main/java/cn/cloudomni/nebula/notify/support/DingTalkSignSupport.java`（纯函数：`sign(secret, timestamp)`）
  - 修改 `nebula-notify/nebula-notify-local/src/main/java/cn/cloudomni/nebula/notify/model/req/CreateNotifyChannelTargetReq.java`、`.../req/UpdateNotifyChannelTargetReq.java`、`.../resp/NotifyChannelTargetResp.java`
  - 修改 `nebula-notify/nebula-notify-api/src/main/java/cn/cloudomni/nebula/notify/model/dto/NotifyChannelTargetDto.java`、`.../model/command/CreateNotifyChannelTargetCommand.java`、`.../model/command/UpdateNotifyChannelTargetCommand.java`
  - 新增 `nebula-notify/nebula-notify-core/src/test/java/cn/cloudomni/nebula/notify/support/DingTalkSignSupportTest.java`
  - 新增 `nebula-notify/nebula-notify-service/src/test/java/cn/cloudomni/nebula/notify/DingTalkSignIntegrationTest.java`
  - 新增 `docs/sql/unreleased/mysql/05-notify-channel-target-sign-secret.sql`、`docs/sql/unreleased/postgresql/05-notify-channel-target-sign-secret.sql`（成对；编号取 `05-`，因 `03-` / `04-` 已被占用：`03` 为并行改动的记录删除按钮脚本、`04` 为 B11 的列宽脚本）
- **完成判据**：
  - 依赖接入：`mvn -pl nebula-notify/nebula-notify-core -am -DskipTests install` 退出码 0；`mvn -pl nebula-notify/nebula-notify-core dependency:tree -Dincludes=cn.cloudomni:nebula-base-crypto` 能解析到该 artifact。
  - `DingTalkSignSupportTest` 用固定测试向量断言签名（`HmacSHA256` → Base64 → `URLEncoder`），与手算常量一致。
  - 集成测试启动本地假 `HttpServer`，配好加签密钥的渠道目标发送后：服务端收到的请求 URL 含 `timestamp` 与 `sign`，用同一密钥自行验签通过；未配密钥的渠道目标发送时不带这两个参数。
  - 渠道目标创建/更新请求体只接受 `signSecret` / `clearSignSecret`：`grep -rn "signSecretCipher" nebula-notify/*/src/main/java | grep -v Entity | grep -v ServiceImpl` 无匹配（即 Resp 层不出现该字段）。
  - 密钥清除语义四条各有用例：有值覆盖、空值保留原值、`clearSignSecret=true` 清除（库中该列变空且 `hasSignSecret=false`）、两者同时为真返回 `22049` 且库值不变。
  - 渠道目标详情/分页响应 JSON 中无 `signSecret` 与 `signSecretCipher` 键，只有 `hasSignSecret`（MockMvc 断言 `jsonPath("$.data.hasSignSecret").exists()` 且 `jsonPath("$.data.signSecret").doesNotExist()`）。
  - 库中 `sign_secret_cipher` 值以 `enc:` 开头（用例断言加密服务被调用且落库值非明文）。
  - 解密失败或 `nebula.crypto.keys` 未配置导致加密失败时抛 `22049`（fail-closed），不把密文或密钥写进日志（用例断言日志内容不含密文前缀后的 base64）。
  - 码段复查：`grep -o '"[0-9]{5}"' nebula-notify/nebula-notify-api/src/main/java/cn/cloudomni/nebula/notify/constant/NotifyErrorInfo.java | tr -d '"' | sort -n | tail -5` 确认 `22047-22049` 未被占用（否则顺延并在回报中记录实际码值）。
  - 脚本编号与幂等：两个方言子目录下 `05-notify-channel-target-sign-secret.sql` 成对存在（`ls docs/sql/unreleased/{mysql,postgresql}/` 可核对），脚本头注释写明「`03-` / `04-` 已被占用」；脚本连续执行 2 次均成功（存在性判断保证幂等）；`grep -rn "04-notify-channel-target-sign-secret" docs/sql docs/projects` 无匹配（旧编号已全部替换）。
  - `mvn -pl nebula-notify/nebula-notify-core,nebula-notify/nebula-notify-service -am test` → `BUILD SUCCESS`。

#### B13 钉钉 / 飞书错误诊断

- **输入**：`NotifyErrorInfo`（最大码 `22046`）、`NotifyServiceImpl:1411-1460`（企业微信 / 飞书 / 钉钉三个发送方法）、`sys_notify_record.fail_reason`。
- **产出文件**：
  - 修改 `nebula-notify/nebula-notify-api/src/main/java/cn/cloudomni/nebula/notify/constant/NotifyErrorInfo.java`（`22047`、`22048`、`22049`）
  - 修改 `NotifyServiceImpl.java`（分渠道错误码；`fail_reason` 写入 `http=<status>, errcode=<code>, errmsg=<msg>`）
  - 修改 `nebula-notify/nebula-notify-core/src/test/java/cn/cloudomni/nebula/notify/service/impl/NotifyServiceImplTest.java`
- **完成判据**：
  - 钉钉返回 `errcode=310000` 时：错误码为 `22047`，`fail_reason` 含 `errcode=310000` 与 `http=`；飞书失败为 `22048`；企业微信失败仍为 `22023`（三条用例各一）。
  - `fail_reason` 与日志中不含 `access_token`、`sign`、`secret` 明文（用例断言字符串不包含原始 token 片段）。
  - `grep -n "22023" nebula-notify/nebula-notify-core/src/main/java/cn/cloudomni/nebula/notify/service/impl/NotifyServiceImpl.java` 仅命中企业微信分支。
  - 码段复查：同 B12 的 `grep -o '"[0-9]{5}"' … | sort -n | tail -5` 动作，确认新增码可用。
  - `mvn -pl nebula-notify/nebula-notify-core -am test` → `BUILD SUCCESS`。

#### B14 网关内部路径拦截与签名头剥离

- **输入**：`nebula-gateway/nebula-gateway-service/src/main/resources/application.yml`、现有 Gateway `GlobalFilter`。
- **产出文件**：
  - 新增 `nebula-gateway/nebula-gateway-service/src/main/java/cn/cloudomni/nebula/gateway/filter/InternalPathBlockFilter.java`
  - 修改 `nebula-gateway/nebula-gateway-service/src/main/resources/application.yml`（各路由 `filters` 增加 `RemoveRequestHeader=X-Nebula-Internal-*`）
  - 新增 `nebula-gateway/nebula-gateway-service/src/test/java/cn/cloudomni/nebula/gateway/filter/InternalPathBlockFilterTest.java`
- **完成判据**：
  - `POST /api/auth/internal/users/batch` 经网关返回 404，且未转发到 auth 服务（用例断言下游未收到请求）。
  - `/api/storage-internal/**` 不在任何 `Path=` 谓词中（`grep -c "storage-internal" application.yml` 为 0，且用例断言该路径经网关 404）。
  - 外部请求带 `X-Nebula-Internal-Signature` 头访问 `/api/notify/**` 时，下游收到的请求不含该头（用假上游断言头被剥离）。
  - `mvn -pl nebula-gateway/nebula-gateway-service -am test` → `BUILD SUCCESS`。

#### B15 内部调用认证配置占位

- **输入**：B3 的 `InternalSignatureProperties`（`nebula.internal-auth.secret` / `clock-skew-seconds`）、第 3.4 节「实现落定」、`docs/spec/09-security.md`（敏感信息只走环境变量）、`docker/docker-compose.yml` 现有环境变量段。
- **产出文件**：
  - 修改 `nebula-notify/nebula-notify-service/src/main/resources/application.yml`
  - 修改 `nebula-auth/nebula-auth-service/src/main/resources/application.yml`
  - 修改 `nebula-storage/nebula-storage-service/src/main/resources/application.yml`
  - 修改 `docker/docker-compose.yml`（notify / auth / storage 三个服务透传环境变量）
- **完成判据**：
  - 三个 `application.yml` 均含 `nebula.internal-auth.secret: ${NEBULA_INTERNAL_AUTH_SECRET:}` 与 `clock-skew-seconds: 300`；`grep -rn "NEBULA_INTERNAL_AUTH_SECRET" --include=*.yml .` 只命中 `${...}` 占位形式，`grep -rn "nebula.internal-auth.secret: [0-9A-Za-z]" --include=*.yml .` 无匹配（无密钥字面量）。
  - 禁止默认值：占位必须是 `${NEBULA_INTERNAL_AUTH_SECRET:}`（缺省为空），不得写成任何非空 fallback 默认值（缺省为空才等价于 fail-closed）。
  - `docker/docker-compose.yml` 中三个服务的 `environment` 段均含 `NEBULA_INTERNAL_AUTH_SECRET` 的变量引用透传，不写死具体值。
  - `mvn -pl nebula-auth/nebula-auth-service,nebula-notify/nebula-notify-service,nebula-storage/nebula-storage-service -am -DskipTests install` 退出码 0。

### 前端任务

#### F1 头像改为提交 uploadTaskId

- **输入**：`web/src/pages/profile/info/avatar-upload.ts:62-78`、`web/src/pages/profile/info/index.tsx`、B8 契约、`ne-upload` 的 taskId 语义。
- **产出文件**：
  - 修改 `web/src/pages/profile/info/avatar-upload.ts`（不再调用 `bindUploadTask`，改为返回 `taskId` + 本地预览 URL）
  - 修改 `web/src/pages/profile/info/index.tsx`、`web/src/pages/profile/info/profile-save.ts`（提交体新增 `uploadTaskIds: { avatar: [taskId] }`，保存成功后刷新资料）
  - 修改 `web/src/pages/profile/info/avatar-upload.test.ts`、`web/src/pages/profile/info/avatar-preview.test.tsx`
- **完成判据**：
  - `grep -rn "bindUploadTask" web/src/pages/profile` 无匹配。
  - 上传图片后**保存失败**时资料未变更（用例断言未调用保存、未产生已绑定状态），本地预览仍可见。
  - 保存成功时提交体恰为 `{ avatar: [<taskId>] }`，不含 `avatar` URL 字段（用例断言 request payload）。
  - `cd web && npx vitest run src/pages/profile/info` 全部 PASS。

#### F2 企业资料图改为提交 uploadTaskId

- **输入**：`web/src/pages/tenant/settings/enterprise/tenant-asset-upload.ts:20-24`、`asset-upload.tsx`、`enterprise/index.tsx`、B9 契约。
- **产出文件**：
  - 修改 `web/src/pages/tenant/settings/enterprise/tenant-asset-upload.ts`（不再绑定、不再传 `sourceId`，返回 `taskId` 与本地预览）
  - 修改 `web/src/pages/tenant/settings/enterprise/asset-upload.tsx`（`value` 语义改为 taskId + 预览，移除对 `TenantAssetStorageService.bindUploadTask` 的依赖）
  - 修改 `web/src/pages/tenant/settings/enterprise/index.tsx`（保存时聚合 `uploadTaskIds`）
  - 新增/修改 `web/src/pages/tenant/settings/enterprise/*.test.tsx`
- **完成判据**：
  - `grep -rn "bindUploadTask" web/src/pages/tenant` 无匹配。
  - 4 个资源位分别上传后，保存请求体为 `uploadTaskIds: { logo: ['t1'], 'login-logo': ['t2'], favicon: ['t3'], 'login-background': ['t4'] }`。
  - 保存失败时页面保留所选图片的本地预览与未保存提示，不出现「上传成功」误导文案。
  - `cd web && npx vitest run src/pages/tenant/settings/enterprise` 全部 PASS。

#### F3 删除 bind 能力与类型

- **输入**：`web/src/api/storage.ts:70,173-179`、`web/src/types/storage.ts:31-35`、`mobile/src/storage/upload-service.ts:49,184`、`packages/client-sdk/endpoints.ts:53`、`packages/client-sdk/types/storage.ts:79`、`web/src/components/ne-upload/README.md:13`。
- **产出文件**：
  - 修改 `web/src/api/storage.ts`（删 `bindUploadTask` 声明与实现）
  - 修改 `web/src/types/storage.ts`（删 `BindUploadTaskReq`）
  - 修改 `mobile/src/storage/upload-service.ts`（删 `StorageService.bind` 与实现）
  - 修改 `packages/client-sdk/endpoints.ts`、`packages/client-sdk/types/storage.ts`
  - 修改 `web/src/components/ne-upload/README.md`（写入「绑定由后端业务保存接口完成，前端只提交 taskId」）
- **完成判据**：
  - `grep -rn "bindUploadTask\|BindUploadTaskReq" web/src mobile/src packages --include=*.ts --include=*.tsx` 无匹配（`docs/` 与计划文档除外）。
  - `cd web && npm run typecheck` 退出码 0。
  - `cd web && npm run build` 退出码 0。
  - `cd web && npx vitest run` 全部 PASS（既有引用已随 F1/F2 改造消除）。

#### F4 ne-upload 主题样式与交互优化

- **输入**：`web/src/components/ne-upload/index.tsx`（inline style 现状）、`web/src/components/ne-upload/README.md`、Ant Design 6 token 用法。
- **产出文件**：
  - 修改 `web/src/components/ne-upload/index.tsx`（inline style 改为样式类/token；图片列表补进度与错误态；本地未绑定图片可预览）
    - 新增 `NeUploadFile.originFileObj?: File`：仅保留在内存中，供本地预览与失败重试使用，**不上行、不入请求契约**（请求体仍只带 `taskId` 等既有字段）
    - 新增失败重试入口（失败项可原地重试上传，复用 `originFileObj`）
    - 消息提示统一走 `App.useApp()` 返回的 `message`，禁止再引入静态 `message.*` 调用
    - `deleteFile` 仅对已绑定的正式文件（存在 `fileId`）调用；未绑定（只有 `taskId`）的项只从本地列表移除，不发起删除请求
  - 新增 `web/src/components/ne-upload/index.test.tsx`
- **完成判据**：
  - `grep -c "style={{" web/src/components/ne-upload/index.tsx` 结果为 0；若个别必须保留，须在本条判据下逐条记录保留处的文件行号与保留原因。
  - 用例覆盖：上传中显示进度、上传失败显示错误态与重试入口、未绑定（有 `taskId` 无 `fileId`）的图片可预览。
  - 用例覆盖：失败项点击重试能用 `originFileObj` 重新发起上传；`originFileObj` 不出现在任何请求体中（`not.toHaveProperty` / 请求体断言），且未绑定项删除时不发起 `deleteFile` 请求，已绑定项（有 `fileId`）才调用 `deleteFile`。
  - 功能边界不变：组件仍不自动绑定（用例断言组件不发起任何 bind 请求）。
  - `cd web && npx vitest run src/components/ne-upload` 全部 PASS。

#### F5 通知记录页接收人展示与详情错误态

- **输入**：`web/src/pages/system/notify/record/record-presentation.tsx:39-52`、`record-detail-modal.tsx:37-60`、B1/B2 契约。
- **产出文件**：
  - 修改 `web/src/pages/system/notify/record/record-presentation.tsx`（群机器人渠道不再回退 `receiver`；缺失显示渠道名或 `-`）
  - 修改 `web/src/pages/system/notify/record/record-detail-modal.tsx`（错误态文案改为「详情加载失败，可重试」并保留重试；成功态展示 `receiverUserName` / `targetName`）
  - 修改 `web/src/pages/system/notify/record/record-presentation.test.ts`、`record-detail-modal` 相关测试
- **完成判据**：
  - 用例：群机器人记录 `targetName` 为空、`receiver` 为脱敏 URL 时，展示结果为渠道名或 `-`，**不包含** `http`（断言 `not.toContain('http')`）。
  - 用例：用户型记录 `receiverUserName` 为空时展示 `-` 或用户 ID，不回退到 `receiver`。
  - `cd web && npx vitest run src/pages/system/notify/record` 全部 PASS。
  - `cd web && npm run typecheck` 退出码 0。

### 文档任务

#### D1 SQL 文档与 unreleased 条目登记

- **输入**：B11、B12 产出的两个成对脚本，以及并行改动已占用的 `03-notify-record-delete-button.sql`（成对，未跟踪）。
- **产出文件**：
  - 修改 `docs/sql/README.md`（在 `unreleased/` 条目下补 `03-notify-record-delete-button.sql`、`04-notify-record-channel-type-width.sql`、`05-notify-channel-target-sign-secret.sql` 三条说明，写清方言差异、幂等策略、回滚前置条件；`03` 注明属并行改动的记录删除按钮脚本）
  - 修改 `docs/projects/nebula/notify/ddl.md`（`channel_type` 宽度改为 32；`sign_secret_cipher` 列与「只写 `signSecret`、只读 `hasSignSecret`」说明）
- **完成判据**：
  - `grep -n "03-notify-record-delete-button\|04-notify-record-channel-type-width\|05-notify-channel-target-sign-secret" docs/sql/README.md` 三条均有命中。
  - `grep -n "channel_type VARCHAR(20)" docs/projects/nebula/notify/ddl.md` 无匹配。
  - 目录内两个方言子目录脚本同名成对（`ls` 输出可核对）。

#### D2 通知渠道文档与变更记录

- **输入**：B11-B13 最终实现。
- **产出文件**：
  - 修改 `docs/projects/nebula/notify/configuration.md`（新增 `nebula.internal-auth.*` 与加签密钥配置说明，密钥不回显；**写明 `nebula.internal-auth.secret` 只能通过环境变量 `NEBULA_INTERNAL_AUTH_SECRET` 注入，yml 仅留占位**）
  - 修改 `docs/projects/nebula/notify/configuration.md` 的部署必配项段（**独立部署的 `nebula-notify-service` 必须配置 `nebula.crypto.keys`**，否则保存加签密钥因加密不可用而失败；这是 fail-closed 而非缺陷）
  - 修改 `docs/projects/nebula/notify/business-capabilities.md`（钉钉支持加签；失败原因含平台 `errcode`）
  - 修改 `docs/projects/nebula/notify/usage-guide.md`（创建带加签的钉钉机器人的步骤）
  - 修改 `docs/projects/nebula/release/changelog.md` 的 `[Unreleased]`（含「删除公共 bind 端点」破坏性变更声明）
  - 修改 `nebula-notify/README.md`（第 87、103 行的渠道能力说明补 `signSecret` / `hasSignSecret` 口径，与 `docs/projects/nebula/notify/business-capabilities.md` 保持一致）
- **完成判据**：
  - `nebula-notify/README.md` 第 87、103 行描述的钉钉渠道支持范围与发送行为与新实现一致（当前该文件已列出钉钉但未提加签，需补 `signSecret` / `hasSignSecret` 说明）。
  - changelog 的 `[Unreleased]` 段落含三组条目：通知记录修复、存储绑定重构（标注 breaking）、钉钉渠道修复。
  - `grep -rn "bindUploadTask" docs/projects` 仅出现在明确的「已删除能力」说明里。
  - `grep -n "NEBULA_INTERNAL_AUTH_SECRET" docs/projects/nebula/notify/configuration.md` 有命中，且同文件含 `nebula.crypto.keys` 必配说明。

#### D3 存储 / 认证文档与组件说明

- **输入**：B6-B10、B14、F3 最终实现。
- **产出文件**：
  - 修改 `docs/projects/nebula/storage/business-capabilities.md`、`.../upload-policy-design.md`（绑定只在后端完成、批量绑定语义、幂等与归属派生规则）
  - 修改 `docs/projects/nebula/auth/` 下与个人资料 / 租户资料相关的使用说明（`uploadTaskIds` 契约）
  - 修改 `web/src/components/ne-upload/README.md`（与 F3 同一文件，最终口径以 F3 为准）
  - 新增 `docs/projects/nebula/design/internal-service-auth.md`（服务间 HMAC 签名契约：签名串、头部、时钟窗口、fail-closed、内部前缀约定），并在 `docs/publish/cludix-doc/sidebars/projects/nebula.ts` 登记侧边栏条目
- **完成判据**：
  - `docs/publish/cludix-doc/sidebars/projects/nebula.ts` 含 `projects/nebula/design/internal-service-auth` 条目，且 `docs/projects/nebula/design/internal-service-auth.md` 存在。
  - 文档中的路径前缀与实际代码一致（`grep -rn "api/auth/internal\|api/storage-internal" docs/` 命中且无第 3 种写法）。
  - `docs/sql/README.md` 未被本次改动破坏（D1 已完成）。

### 测试任务

#### T1 后端定向测试补齐

- **输入**：B1-B14 全部实现。
- **产出文件**：各模块测试文件（随 B 任务产出），无额外生产文件。
- **完成判据**：第 7.1 节第 1)-6) 条 `mvn` 定向命令与同节补充的 `mvn -pl nebula-notify/nebula-notify-remote,nebula-storage/nebula-storage-remote -am test` 全部 `BUILD SUCCESS`，且新增测试文件的用例数在输出中可见。

#### T2 全量编译与前端回归

- **输入**：T1 通过。
- **产出文件**：无（仅执行与记录）。
- **完成判据**：`mvn -q -T1C -DskipTests install` 退出码 0；`cd web && npx vitest run src/pages/system/notify/record`、`cd web && npm run typecheck`、`cd web && npm run build` 三条命令退出码均为 0。

#### T3 可观察验收

- **输入**：T2 通过 + 可运行环境（local 与 remote 各一套）。
- **产出文件**：验收记录写入实施回报，不新增文件。
- **完成判据**：第 7.2 节 8 条可观察验收全部通过并记录观察到的现象。

## 6. 执行顺序与依赖、里程碑

### 6.1 必须先定的契约

以下契约在任何并行开工前固定，写入第 4 节后不得单方变更：

1. `bindUploadTasks` 命令/结果字段与顺序语义（B7）。
2. 服务间签名串格式与头部名称（B3）。
3. 内部端点路径前缀（`/api/auth/internal/**`、`/api/storage-internal/**`）。
4. `uploadTaskIds` 的 key 白名单与单值约束（B8/B9/F1/F2 共同依赖）。
5. 错误码分配（B7 的 `24028`/`24029`/`24030`、B12/B13 的 `22047`/`22048`/`22049`、B8 的 `10033`，`19024` 沿用不新增）。

### 6.2 里程碑

| 里程碑 | 内容 | 依赖 | 可并行 |
|---|---|---|---|
| M1 契约冻结 | 第 4 节全部条目评审通过 | 无 | — |
| M2 通知可读性 | B1、B2、F5 | M1 | B1 与 B2 可并行；F5 依赖 B1/B2 契约（字段不变，可提前开工） |
| M3 服务间认证底座 | B3、B14 | M1 | B3 与 B14 可并行 |
| M3.1 内部认证配置占位 | B15 | M3（`InternalSignatureProperties` 已存在） | 与 M4/M5/M8 并行；不阻塞 B4/B5/B6 单测（单测直接构造属性对象，不经 yml） |
| M4 名称回填闭环 | B4、B5 | B3 | B4 与 B5 需串行（B5 依赖 B4 端点） |
| M5 存储绑定底座 | B7、B6、B10 | B3 | B7 先于 B6（B6 调 B7 方法）；B10 可在 B7 后独立进行 |
| M6 业务绑定接入 | B8、B9、F1、F2 | B6、B7、M1 | B8 与 B9 可并行；F1/F2 在 B8/B9 契约冻结后可并行 |
| M7 前端清理与打磨 | F3、F4 | M6（F1/F2 已去 bind） | F3 依赖 F1/F2；F4 可与 F3 并行 |
| M8 钉钉渠道 | B11、B12、B13 | M1 | B11 必须先于 B12；B13 与 B11 可并行 |
| M9 文档与验收 | D1、D2、D3、T1、T2、T3 | 全部 B/F | D1 依赖 B11/B12；D2 依赖 B12/B13；D3 依赖 B3/B6 与 F3 |

### 6.3 串行红线

- B11（列宽）不完成，B12 的钉钉集成测试无法写记录，必须先做 B11。
- B3（签名底座）不完成，B4/B5/B6 都无法自测，必须先做 B3。
- B7（`bindUploadTasks`）不完成，B8/B9 无法接入。
- F1/F2 不完成，F3 删类型后前端编译不过。

## 7. 测试与验收标准

### 7.1 自动测试命令与期望

```bash
# 1) 通知 core：BUILD SUCCESS，NotifyServiceImplTest 用例数 > 68
mvn -pl nebula-notify/nebula-notify-core -am test

# 2) 通知 service（含 H2 集成与 schema）：BUILD SUCCESS
mvn -pl nebula-notify/nebula-notify-service -am test

# 3) 存储 core 与 local：BUILD SUCCESS
mvn -pl nebula-storage/nebula-storage-core,nebula-storage/nebula-storage-local -am test

# 4) auth core 与 local：BUILD SUCCESS
mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local -am test

# 5) base-cloud 签名：BUILD SUCCESS
mvn -pl nebula-base/nebula-base-cloud -am test

# 6) 网关拦截：BUILD SUCCESS
mvn -pl nebula-gateway/nebula-gateway-service -am test

# 7) 全量编译：退出码 0，无 ERROR
mvn -q -T1C -DskipTests install

# 8) 前端通知记录页：全部 PASS
cd web && npx vitest run src/pages/system/notify/record

# 9) 前端类型检查：退出码 0
cd web && npm run typecheck

# 10) 前端生产构建：退出码 0
cd web && npm run build
```

补充：本次新增的 `nebula-notify-remote`、`nebula-storage-remote`、`nebula-auth-local` 测试文件不在上述 6 条定向命令覆盖范围内，需额外执行：

```bash
mvn -pl nebula-notify/nebula-notify-remote,nebula-storage/nebula-storage-remote -am test
```

依赖接入校验（B8/B12 的新增依赖必须真正可见，不能只是「编译能过」）：

```bash
# auth 侧：storage-api / storage-remote 能被解析（输出含对应 artifactId）
mvn -pl nebula-auth/nebula-auth-core dependency:tree -Dincludes=cn.cloudomni:nebula-storage-api
mvn -pl nebula-auth/nebula-auth-service dependency:tree -Dincludes=cn.cloudomni:nebula-storage-remote
# notify 侧：crypto 能被解析
mvn -pl nebula-notify/nebula-notify-core dependency:tree -Dincludes=cn.cloudomni:nebula-base-crypto
# 三模块编译（不跑测试）
mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local,nebula-auth/nebula-auth-service -am -DskipTests install
mvn -pl nebula-notify/nebula-notify-core -am -DskipTests install
# B15：内部认证配置占位（三个 service 的 application.yml + docker-compose 透传）后编译，验证 yml 不阻塞三模块装配
mvn -pl nebula-auth/nebula-auth-service,nebula-notify/nebula-notify-service,nebula-storage/nebula-storage-service -am -DskipTests install
```

### 7.2 可观察验收（必须逐条记录实际现象）

1. **详情接口不再 500**：对一条用户型记录与一条群机器人记录分别调用 `GET /api/notify/records/{id}`，均返回 200；响应中 `receiverUserName`（用户型，local 与 remote 各验一次）与 `targetName`（群机器人型）非空；前端详情弹窗不再出现「发送记录详情加载失败」。
2. **普通用户保存头像成功**：以无任何 `STORAGE_*` 权限码的普通用户登录，`/profile` 上传头像并保存，接口返回 200，刷新后头像为新图；`storage_file` 中该头像的 `source_id` 等于该用户 id。
3. **一次绑定多文件顺序一致**：直接调用内部端点 `POST /api/storage-internal/upload-tasks/bind`（带合法签名），`taskIds` 传 `["t3","t1","t2"]`，响应 `data` 的三个 `taskId` 顺序与之相同。
4. **伪造 sourceId 无法改变归属**：在同一请求体里额外传 `"sourceId":"someone-else"`，绑定后查 `storage_file.source_id` 仍为操作人/当前租户，不出现 `someone-else`。
5. **钉钉渠道记录能落库并发出请求**：配置一个钉钉群机器人渠道目标，发送一条通知；`sys_notify_record` 新增一行且 `channel_type='DINGTALK_GROUP_WEBHOOK'`；本地假 `HttpServer` 或抓包可见收到 POST。
6. **加签机器人在本地假 HttpServer 上验签通过**：给渠道目标配置 `signSecret` 后发送，服务端收到的 URL 带 `timestamp` 与 `sign`，用同一密钥独立计算后一致；未配密钥的机器人发送时不带这两个参数。
7. **日志与接口不出现密钥/URL**：`grep -i "access_token\|sign_secret_cipher\|enc:" <应用日志>` 无命中（`enc:` 前缀在调试日志里也不应出现）；渠道目标详情/分页接口响应中无 `signSecret` / `signSecretCipher`；通知记录列表与详情页面无 `http` 开头的 webhook 地址。
8. **公共 bind 端点已下线**：直接 `POST /api/storage/upload-tasks/{任意 id}/bind`，网关与直连服务均返回 404。

## 8. 风险与回滚方案

| 风险 | 影响 | 缓解 / 回滚 |
|---|---|---|
| `channel_type` 加宽不可逆（缩窄可能丢数据） | 回滚列宽时若存量值 > 20 会失败或截断 | 回滚前先执行 `SELECT MAX(LENGTH(channel_type)) FROM sys_notify_record` 确认旧值均 ≤ 20；确认后再执行缩窄脚本。加宽本身对旧代码无影响（20 → 32 是兼容扩展），只需回滚代码即可 |
| 新增密文列 `sign_secret_cipher` | 回滚代码后该列残留，加签配置失效 | 回滚前先停用所有带加签的机器人（把 `signSecret` 置空并重新保存，或直接禁用渠道目标），再回滚代码；列可保留不删（回滚不要求删列，删列会丢密钥） |
| 删除公共 bind 端点属破坏性变更 | 任何外部调用方（自研前端、脚本、第三方集成）会 404 | 必须在 `docs/projects/nebula/release/changelog.md` 的 `[Unreleased]` 明确声明，并写明替代路径（改用业务保存接口的 `uploadTaskIds`）。仓库内调用方已在 F3 全部删除；`ne-upload` README 同步改写。如需紧急回滚，恢复端点需要同时恢复 `IStorageService.bindUploadTask` 与前端调用，代价较高 —— 因此该任务放在 M5 末位，避免与绑定改造同时回滚。**已确认仓库外无调用方**，因此按「直接删除、不做 deprecated 过渡」执行 |
| 批量绑定并发竞态（同一 taskId 双请求） | 无唯一约束时可能插入两条 `storage_file` | 本次仅做 DAO 幂等预查（非事务级互斥），**已确认不补 `(tenant_id, upload_task_id)` 唯一索引**（见第 9 节第 1 条）：不新增升级脚本、不处理存量重复数据。同一 taskId 的重复请求由绑定幂等语义（命中即返回既有 fileId）吸收；仅在极端双请求并发写入时可能落两条 `storage_file`，按已知残余风险接受 |
| remote 模式下「先绑定后写业务」的孤儿文件 | 绑定成功但业务保存失败 → `storage_file` 行存在却无人引用 | 孤儿文件由 `storage.upload.temp-retention-days` 之外的清理策略处理；本次不新增清理任务，需在 D3 文档中说明该残余风险的运维口径。若业务保存与绑定在同一事务内（local 模式），则无此风险 |
| 服务间密钥未配置导致 fail-closed | remote 模式下通知名称恒空、头像/企业图保存直接失败 | 属**有意设计**（宁可不可用也不裸奔）。必须在 D2/D3 文档中写明部署必配项 `nebula.internal-auth.secret`，并在启动日志打一条明确的「内部调用认证未配置，内部端点将拒绝所有请求」WARN |
| 历史记录里仍是完整 webhook URL | 老数据可能继续暴露 `access_token` | 本次不做数据迁移；靠前端不回退 `receiver` 消除页面暴露。若需清理历史数据，另开脚本（不在本次范围） |
| 网关 `RemoveRequestHeader` 影响既有链路 | 误删正常请求头 | 只剥离 `X-Nebula-Internal-*` 前缀，命名空间专属，无既有请求使用该前缀（`grep -rn "X-Nebula-Internal" --include=*.java` 在本次新增前无匹配） |
| 签名实现两侧不一致 | 内部调用全部 401/24028 | 签名串构造必须共用 B3 的同一个工具类，禁止两侧各写一份；用固定测试向量交叉验证 |
| `nebula-notify-service` 独立部署未配置 `nebula.crypto.keys` | 保存钉钉加签密钥时加密直接失败（`NebulaCryptoService` 无密钥不可用），表现为「配不进去」而不是「悄悄存明文」 | 属 **fail-closed**，是期望行为。必须在 D2 文档「通知服务部署必配项」中写明：独立部署的 `nebula-notify-service` 必须配置 `nebula.crypto.keys`（与 `nebula-auth-service`、`nebula-param` 同一套密钥管理），否则加签功能不可用；本地单体由 `nebula-app-starter` 统一配置。启动时检测到加密服务不可用应打 WARN 指明「加签密钥保存将失败」 |

## 9. 已确认决策（无待确认项）

> 原第 9 节的 4 条待确认项已由用户逐条确认，本节只登记结论与生效范围（变更台账见第 10 节 V7）；其余早前列出的取舍已在 V2 定案并写死进第 3/4 节。日期为占位 `—`，实施前按实际确认日期补记。

1. **不补 `(tenant_id, upload_task_id)` 唯一索引**（确认日期 `—`）：保持 DAO 幂等预查（先 `getByUploadTaskId` 后 `requireUploadTask` 的非事务级互斥），不新增索引、不新增升级脚本、不处理存量重复数据；并发竞态的残余风险按第 8 节对应风险行接受。
2. **N2 采用「删除 Feign 声明」，不补实现**（确认日期 `—`）：删除 `StorageFeignClient` 中 `POST /files/by-source` 的声明，不为该端点补实现；该动作纳入 B10（产出文件与完成判据已写入），`StorageRemoteServiceImpl.getStorageFileBySource` 按 `IStorageService` 契约用既有端点组合实现，不得让 remote 实现编译不过。
3. **`templateVariantName`（N1）不在本次范围，也不再另开单**（确认日期 `—`）：本次不补后端字段、前端不做承接，本计划不再跟踪该项。
4. **公共 `POST /api/storage/upload-tasks/{taskId}/bind` 直接删除，不做 deprecated 过渡**（确认日期 `—`）：已确认仓库外无调用方，破坏性变更只需在 changelog 声明，不保留「先标 deprecated、下个版本再删」的两步策略。

如实施中出现与上述决策冲突的新事实，须先回报再改。

## 10. 变更点记录

| 版本 | 日期 | 变更内容 | 变更原因 | 影响任务 |
|---|---|---|---|---|
| V1 | — | 初始版本：10 节结构、25 条任务（B1-B14 / F1-F5 / D1-D3 / T1-T3）、10 条测试命令、8 条可观察验收 | 首版计划 | — |
| V2 | — | **A. 依赖接入补齐**：B8 产出文件新增 `nebula-auth/nebula-auth-core/pom.xml`（+`nebula-storage-api`）与 `nebula-auth/nebula-auth-service/pom.xml`（+`nebula-storage-remote`），完成判据新增 `mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local,nebula-auth/nebula-auth-service -am -DskipTests install` 退出码 0 + `dependency:tree` 能解析 storage-api/storage-remote；B9 声明复用同一 pom 变更并保留同等判据 | 核实发现 `grep nebula-storage nebula-auth/**/pom.xml` 无匹配，auth 当前不依赖 storage，不补依赖 B8/B9 无法编译；`nebula-storage-core` 不依赖 auth，故无模块环 | B8、B9 |
| V2 | — | **B. 加密依赖补齐**：B12 产出文件新增 `nebula-notify/nebula-notify-core/pom.xml`（+`nebula-base-crypto`），完成判据新增 `mvn -pl nebula-notify/nebula-notify-core -am -DskipTests install` 退出码 0 与 `dependency:tree` 断言；第 8 节新增风险「notify-service 未配 `nebula.crypto.keys` 时保存密钥 fail-closed」，并要求 D2 写入部署必配项 | 核实发现 `nebula-auth-core/pom.xml:43` 已有 crypto，而 `nebula-notify-core/pom.xml` 没有，加签加密实现会编译不过 | B12、D2 |
| V2 | — | **C1. 加签密钥清除语义定案**：`signSecret` 为 null/空白 = 保留原值，显式清除用新增布尔 `clearSignSecret`，两者同时为真视为参数冲突（复用 `22049`）。写入 3.5 语义表、4.1 DTO 表、4.4 变更清单、B12 完成判据 | 原计划把该决策留给待确认，导致 Req 契约无法冻结 | B12（F 类本轮不提供清除入口，仅契约支持） |
| V2 | — | **C2. `24030 BIND_TASK_LIMIT_EXCEEDED` 写死新增**：4.3 去掉「建议/待确认」，B7 完成判据改为必须抛 `24030` | 单次 10 个 taskIds 上限必须有码承载，不新增会丢失语义 | B7 |
| V2 | — | **C3. `10033` 写死新增 + 码段复查动作**：4.3 定名为 `PROFILE_ASSET_TASK_INVALID`，并要求实现前用 `grep -o '"\[0-9\]\{5\}"' <枚举文件>` 取出全部码值后，再用 `sort -n` 与 `tail -5` 复查是否已被占用，若被占用则顺延并在回报中记录实际码值；B7/B12/B13/B8 完成判据各补一条复查动作 | 脱离「是否允许占用 10033」的悬置，同时防止码值冲突 | B7、B8、B12、B13 |
| V2 | — | **C4. 防重放定案：不做 nonce**：3.4 新增「防重放（定案）」段说明理由（内部调用只有只读查询与 `taskId` 幂等绑定，重放不产生额外副作用）；B3 判据新增「同一签名窗口内重复提交两次均通过」以固化该行为 | 避免用有状态组件解决不存在的风险，同时防止后续误加 nonce 破坏幂等契约 | B3 |
| V2 | — | **C5. 内部签名密钥来源定案：环境变量**：3.4 写明必须走 `NEBULA_INTERNAL_AUTH_SECRET`，yml 只留 `${NEBULA_INTERNAL_AUTH_SECRET:}` 占位且缺省 fail-closed；B3 的 `InternalSignatureProperties` 说明与判据同步（yml 中不得出现密钥字面量） | 依据 `docs/spec/09-security.md` 关于敏感信息必须环境变量注入的既有口径（同文件第 315-318 行微信 app-secret 写法） | B3、D2、D3 |
| V2 | — | **C6. 第 9 节从 8 条收敛为 4 条**：保留唯一索引、N2、N1、破坏性删除 bind 端点；其余 4 条（列名与清除能力、`24030`、`10033`、nonce、密钥来源）按上述决策写死 | 待确认项过多会阻塞契约冻结 | 第 9 节 |
| V2 | — | **D. 第 10 节改为实际表格**：登记 V1 与 V2 的 8 项变更，逐项写明变更内容、原因与影响任务编号 | 计划自身需要一个可追溯的变更台账 | — |
| V4 | — | **撤回 V3**：V3 记录的「按上游要求改名」不成立（规划侧未提出该要求，文件也未改名），文件名保持 `docs/plan/notify-record-storage-dingtalk.md` | 记录错误更正，避免计划文档出现无来源结论 | 无（仅变更记录本身） |
| V5 | — | **交付前完整性收尾（不改动任何既定决策与结论）**：① 修正全文 `NotifyServiceImpl` 行号引用（该文件在计划撰写后已下移，涉及详情入口 `782-793`、名称解析 `856-879`/`872-876`、脱敏 `1689-1701`、落库与渠道分发 `560`+`613-620`、`resolveNotifyDeliveries 1462-1484`、三个 webhook 发送方法 `1428-1443`/`1445-1460`、`distinctTextIds 881-890`、`fillRecordDisplayNames 824-834`，共 11 处）；② 2.2 第（5）条证据标注由「已实测」改为「静态链路证据：列宽比对」，2.2 第（2）条补注为人工观察并指向 7.2 复验；③ 3.4 内部端点前缀统一为 `/api/auth/internal/**` 与 `/api/storage-internal/**` 两种写法；④ 4.3 `10033` 的依据由「码段已用满」改为「用户模块码段当前最大码 `10032`」；⑤ D2 产出文件补 `nebula-notify/README.md`、T1 判据补 remote 模块测试命令、F4 判据去「显著下降」改为 `0` 命中、6.1 第 5 条补 auth 侧 `10033`、B9 输入行号 `212-232`、B13 输入行号 `1411-1460` | 交付前完整性核对：行号漂移导致证据不可核对、判据存在不可验证表述、任务产出与判据引用文件不对齐 | B1、B2、B9、B12、B13、D2、F4、T1、第 3.4/4.3/6.1 节 |
| V6 | — | 新增 2.4 节：登记工作区中并行进行中的通知记录批量删除改动及其对本计划实施的影响 | 避免实施时覆盖他人未提交改动、并在合并后重跑相关测试 | B1、B2、B13、F5、T1 |
| V7 | — | **用户确认的 4 项决策落地**：① 不补 `(tenant_id, upload_task_id)` 唯一索引，保持 DAO 幂等预查，第 8 节竞态风险行删除「若确认补则需新增升级脚本」的待定表述并改为确定结论；② N2 采用「删声明」方案：1.3 的 N2 行改为「已确认：删除 Feign 声明，不补实现，纳入 B10」，B10 产出文件与完成判据新增 `POST /files/by-source` 声明删除、`getStorageFileBySource` 相关 Feign 清理，`StorageRemoteServiceImpl` 对应方法按 `IStorageService` 契约用既有端点组合实现以保证 remote 实现编译通过；③ `templateVariantName`（N1）不另开单，1.3 的 N1 行改为「已确认不在本次范围，也不再另开单」；④ 公共 `POST /api/storage/upload-tasks/{taskId}/bind` 直接删除、不做 deprecated 过渡，第 8 节破坏性变更风险行补「已确认仓库外无调用方」；第 9 节改写为「已确认决策（无待确认项）」，全文清除悬置表述 | 用户确认 | B10、第 8 节、第 9 节 |
| V8 | — | **第一批实施暴露的 3 个事实同步（不改既定结论）**：① 脚本编号冲突裁定 —— `docs/sql/unreleased/` 下 `03-` 已被他人未提交的 `03-notify-record-delete-button.sql` 占用，B11 列宽脚本实际落地为 `04-notify-record-channel-type-width.sql`，故 B12 的密钥列脚本改为 `05-notify-channel-target-sign-secret.sql`；4.5 表两条脚本行、索引登记条、B11/B12 产出文件与判据、D1 登记与判据同步改为 `03` / `04` / `05` 三条。② 配置占位归属缺口 —— `nebula.internal-auth.secret` 的 yml 占位此前无任务承载，新增任务 B15「内部调用认证配置占位」（`nebula-notify-service`、`nebula-auth-service`、`nebula-storage-service` 三个 `application.yml` 增 `nebula.internal-auth.secret: ${NEBULA_INTERNAL_AUTH_SECRET:}` 与 `clock-skew-seconds: 300`，禁止字面量与默认值，并在 `docker/docker-compose.yml` 透传），写入 6.2 里程碑 M3.1（置于 M3 之后）与 7.1 命令列表。③ B3 实现细节定案登记进 3.4「实现落定」——头部固定 `X-Nebula-Internal-Signature` / `X-Nebula-Internal-Timestamp`；签名串中 `HEX(SHA256(body))` 取小写、空 body 按 `SHA256("")`；仅对 `/api/auth/internal`、`/api/storage-internal` 两个前缀加签；类名与 Bean 名固定为 `InternalSignatureProperties` / `InternalRequestSigner` / `InternalSignatureVerifier` 且始终装配，缺密钥时校验一律拒绝并打 WARN（而非「缺密钥不注册 Bean」） | 第一批实施暴露的编号冲突与配置归属缺口 | B12、B15、D1、第 4.5 节 |
| V9 | — | **第二批实施暴露的 3 个事实同步（不改既定结论）**：① B5 实现位置调整 —— `InternalAuthFeignClient` 与 `NotifyReceiverNameRemoteResolver` 最终落在 `nebula-notify-local`（包 `cn.cloudomni.nebula.notify.local.internal`），并按 `@ConditionalOnProperty(prefix="nebula.architecture", name="mode", havingValue="remote")` 装配；产出文件路径改为 `nebula-notify/nebula-notify-local/src/main/java/cn/cloudomni/nebula/notify/local/internal/`，并说明落点原因（`nebula-notify-service` 已依赖 `notify-local`，`ModuleMarkerConflictChecker` 禁止 local+remote 标记并存，放 `notify-remote` 会导致微服务部署下 Bean 缺席、名称仍走逐用户 401，故实现必须随服务模块打包）；完成判据「不再逐个查用户」改为「remote 装配路径下不再逐用户查询（本地路径保留逐用户是既有行为，不算违约）」，并新增 `ApplicationContextRunner` 判据（`mode=local` 无该 Bean、`mode=remote` 有该 Bean）。② B8 绑定落点 —— 头像绑定最终在 `UserServiceImpl.updateUser`（`@Transactional`）内完成，`UpdateUserCommand` 新增 `uploadTaskIds`（`UpdateProfileCommand` 同步），`ProfileController` 只做透传；产出文件补这三个文件，完成判据补「绑定与用户保存在同一事务：校验失败（`10033`）时用户行与 `storage_file` 均无写入」。③ F4 额外产出 —— `ne-upload` 新增 `NeUploadFile.originFileObj?: File`（仅内存，用于本地预览与失败重试，不上行、不入请求契约），新增失败重试入口与 `App.useApp()` 消息提示，`deleteFile` 仅对已绑定正式文件（有 `fileId`）调用；产出文件与完成判据同步补这三点 | 实施阶段暴露的装配约束与落点调整 | B5、B8、F4 |
