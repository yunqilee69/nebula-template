# 腾讯云 COS 自定义 endpoint 计划（与阿里云 OSS 对齐的单 client 方案）

> **本文整体替换此前 `direct-download-domain` + 双 client 版本计划。** 旧方案（新增 `direct-download-domain` 字段、
> 建第二个「只签名」的 `COSClient`、给 store/仓库加 `AutoCloseable`）已被用户否决，**不得按旧方案任何条目实施**，
> 仓库中也不存在旧方案的代码改动（开工前已确认工作区无相关改动）。

## 1. 背景与目标

### 1.1 背景

生产环境要让腾讯云 COS 的对象访问走用户自有域名 `cos.omnimart.cloudomni.cn`，而不是官方
`<bucket>.cos.<region>.myqcloud.com`。该域名的 DNS 与 HTTPS 证书已确认可用，剩下的问题全在应用侧的寻址与签名。

当前实现（`nebula-storage-provider-tencent-cos`）只按 `region` 构造 `ClientConfig`，SDK 用
`RegionEndpointBuilder` 拼出 `<bucket>.cos.<region>.myqcloud.com`，配置面没有任何自定义地址入口。

### 1.2 本次决策（用户已明确选择）

**与阿里云 OSS 对齐：一个 `endpoint` 字段 + 一个 `COSClient`。** 新增
`nebula.storage.content.tencent-cos.endpoint`（env `NEBULA_STORAGE_TENCENT_COS_ENDPOINT`），映射到**已存在**的通用
`StorageBackendSettings.endpoint` 与租户参数 `storage.backend.endpoint`；非空时对同一个 client 调用
`ClientConfig#setEndpointBuilder(new UserSpecifiedEndpointBuilder(endpoint, "service.cos.myqcloud.com"))`，
让正式区 I/O 与预签名直链全部走该地址。

### 1.3 旧方案被推翻的依据（重新核对代码与 SDK 源码后的结论）

1. **上传路径根本不经过 COS。** 旧方案以「单 client 会改变上传端点、把线上上传绑到只承诺下载能力的域名上」为由排除单 client，
   与代码事实不符：上传任务、单文件上传、分片上传、分片合并都只写本地临时区
   （`RoutingStorageContentRepository.storeTemp / storeTempPart / mergeTempParts` → `FileSystemStorageBinaryStore`），
   只有 `bindUploadTask` 的 `promoteToFormal` 与图片派生等**正式区**操作才第一次触达 provider（见 2.1）。
   因此单 client 的真实影响面是「正式区写/读/删/探测/签发」，不是上传。
2. **双 client 只是把同一个 endpoint 值分给两条路径，徒增生命周期复杂度。** 用户已接受「正式区的写、读、删、探测与直链共用同一个自定义地址」，
   这正好是 OSS / MinIO 两个后端今天的行为（它们的 `endpoint` 一直是单 client 通吃），没必要为 COS 单独发明第二套语义。
3. **不需要新键、不需要改 SPI record。** `StorageBackendSettings.endpoint`、`StorageBackendParamKeys.ENDPOINT`、
   `storage.backend.endpoint` 参数定义都已存在（MinIO / OSS 在用），COS 只是「没读它」。

### 1.4 目标

1. 新增启动配置 `nebula.storage.content.tencent-cos.endpoint` / env `NEBULA_STORAGE_TENCENT_COS_ENDPOINT`。
2. 新增该字段的租户级贯通：读取**既有**的 `storage.backend.endpoint`，沿用现有 `merge()` 逐字段回退口径
   （租户值优先，启动配置回退）。
3. **空值完全保持今天的行为**：仍按 `region` 推导官方域名，client 构造与请求 URL 逐字节一致。
4. **非空值只有一个 client**：正式区 `putObject` / `getObject` / `deleteObject` / `doesBucketExist` / `createBucket`
   以及 `generatePresignedUrl` 全部走该 endpoint；`region` 仍然必填。
5. **HTTPS 固定**：接受裸域名或 `https://` 前缀，归一化规则明确（4.3）；非法值在选中该后端时启动失败。
6. 补齐单元测试（含「SDK 真实生成的 URL host 与签名 Host 一致」的强断言）、可选真实探针、启动配置样板、配置规范、
   模块文档、探针注释、配置安全测试与 changelog。

### 1.5 非目标（含硬性禁止）

- **禁止**「先按官方域名签发、再把 URL 的 host 字符串替换成自定义域名」：COS 签名 `q-header-list` 含 `host`，
  签名哈希覆盖 Host 值，换 host 必然 `403 SignatureDoesNotMatch`。
- **禁止**关闭 Host 签名（`generatePresignedUrl(request, false)`）：那会把 Host 从签名头里移除，与 URL 实际 host 不一致，
  等于把可验证性丢掉。直链一律走默认的 `signHost=true` 路径。
- 不新增第二个 `COSClient`、不新增 client 工厂/缓存、不给 store 或仓库加 `AutoCloseable`。
- 不处理现有 `COSClient` 不回收的既有状况（与今天完全一致），也不改动 `ConfigurableStorageContentRepository` 的重建逻辑。
- 不改 `StorageBackendSettings`、`StorageBackendParamKeys`、`RoutingStorageContentRepository`、`AbstractObjectStorageBinaryStore`。
- 不改上传 / 分片 / 合并链路（它们本来就不进 COS），不改临时区后端（恒为本地文件系统）。
- 不改前端页面、路由、侧边栏；不新增页面；不新增数据库表、不做 DDL / SQL 脚本 / 数据迁移。
- 不把该能力扩展到 MinIO / 阿里云 OSS（它们已有 `endpoint`，语义不变）。
- 不为自定义域名做 DNS / CNAME / 证书 / 跨域规则的自动化校验或探测（运维前置条件）。
- 不支持明文 `http`：正式区请求与直链的协议都由 `ClientConfig#httpProtocol` 决定，本次固定使用默认的 `https`。
- 不改 `direct-download-enabled`、`direct-download-expire-seconds` 的既有语义与上限（3600 秒）。

## 2. 现状与约束

### 2.1 上传链路与正式区链路的分界（本次改动的作用面，已核对代码）

| 动作 | 入口 | 落到哪个 store | 是否触达 COS provider |
|---|---|---|---|
| 建上传任务 | `POST /api/storage/upload-tasks` → `createUploadTask` | 只写 `storage_upload_task` 行 | 否 |
| 单文件临时上传 | `uploadSimpleFile` → `storeTemp` | 本地 `FileSystemStorageBinaryStore`（`nebula.storage.temp-dir`） | 否 |
| 分片上传 | `PUT /api/storage/upload-tasks/{id}/parts/{no}` → `storeTempPart` | 本地临时区 | 否 |
| 分片合并 | `POST /api/storage/upload-tasks/{id}/complete` → `mergeTempParts` | 本地临时区（`SequenceInputStream` 合并后再写本地） | 否 |
| 绑定转正 | `POST /api/storage/upload-tasks/{id}/bind` → `promoteToFormal` | 临时区读 → **正式区写**（`formalStore.store`） | **是（首次）** |
| 图片派生 | `openFormal` 读原图 → `storeFormal` 写缩略图 | 正式区 | **是** |
| 登录态下载 / 签名下载 / 删除 | `openFormal` / `presignFormal` / `deleteFormal` | 正式区 | **是** |

证据：`NebulaStorageAutoConfiguration#storageContentRepository` 用
`new FileSystemStorageBinaryStore(properties.getTempDir())` 做 `tempStore`；`RoutingStorageContentRepository` 的
`storeTemp / storeTempPart / mergeTempParts` 只碰 `tempStore`，仅 `promoteToFormal / storeFormal / openFormal /
presignFormal / deleteFormal / formalProvider / formalBucket` 碰 `formalStore`。

**含义**：把 endpoint 挂在唯一 client 上，影响面被结构性地限制在「正式区」；上传接口、分片接口、合并接口与本次改动无关。

### 2.2 COS SDK 5.6.281 的事实（逐条核对 `cos_api-5.6.281-sources.jar`）

1. **endpoint 是 client 级字段**：`ClientConfig#endpointBuilder`（默认 `new RegionEndpointBuilder(region)`），
   `setEndpointBuilder` 可替换，`COSClient` 构造时接收该 `ClientConfig`。
2. **替换 builder 后 host 完全由它决定**：`COSClient#buildUrlAndHost` 用
   `clientConfig.getEndpointBuilder().buildGeneralApiEndpoint(formatBucket(bucket, appId))` 拼出 endpoint，
   `request.setResourcePath(key)`，Host 头取同一个 endpoint（`isDistinguishHost` 默认 false）。
3. **`UserSpecifiedEndpointBuilder(generalApiEndpoint, getServiceApiEndpoint)` 忽略 bucket**：
   `buildGeneralApiEndpoint(bucketName)` 直接返回固定值。因此替换后请求 URL 形如
   `https://<endpoint>/<对象键>`，**host 与路径里都不含桶名**（见 3.3 的绑定语义）。
4. **预签名 URL 用同一个 builder**：`generatePresignedUrl(request)` 内部 `signHost=true`，
   URL = `httpProtocol + "://" + builder 结果 + 编码后的 key + "?sign=..."`，Host 头取同一个值；两者天然一致。
5. **`region` 仍然必填**：`createRequest` / `generatePresignedUrl` / `createBucket` / `headBucket` 都 `rejectNull(clientConfig.getRegion())`。
   签名本身不含 region，但 SDK 校验与官方域名推导都要它，所以 endpoint 非空时 region 不能省。
6. **协议由 `httpProtocol` 决定，默认 `https`**：endpoint 字符串里带 `https://` 会被拼成 `https://https://...`（URL 非法），
   因此归一化阶段必须剥离 scheme（4.3）。
7. **bucket 探测与建桶也走 endpoint builder**：`headBucket`（`doesBucketExist` 的底层）请求 `https://<endpoint>/`；
   `createBucket` 请求 `PUT https://<endpoint>/`。真机上「在自定义域名上建桶」是否被 COS 接受无法从源码断言，
   运维上必须按「桶预先建好」对待（见第 8 节风险表）。
8. **签名可用假密钥本地复算**：`COSSigner#buildAuthorizationStr(method, resourcePath, headerMap, paramMap, cred,
   startTime, expiredTime, signHost)` 是 public 且接受显式 `startTime/expiredTime`；把 URL 里解出的
   `q-sign-time=start;end` 喂回去即可逐字符比对签名，从而在**不联网**的单测里证明「URL host 就是签名 Host」。
   注意带 `Content-Disposition` 时它会变成参与签名的 `response-content-disposition` 查询参数，比对样例不要带它。
9. **`generatePresignedUrl` 是纯本地计算**，不发网络请求。

### 2.3 本次改动面（只读核对结论）

| 文件 | 现状 | 本次是否改 |
|---|---|---|
| `nebula-storage/nebula-storage-provider-tencent-cos/.../TencentCosStorageProperties.java` | 只有 `region` + `validate()` | 改：新增 `endpoint` 字段与归一化校验 |
| `.../TencentCosStorageContentProvider.java` | `merge(settings)` → `validate()` → `new ClientConfig(new Region(region))` → `new COSClient(...)` | 改：merge 带上 endpoint；按 endpoint 设置 `EndpointBuilder` |
| `.../TencentCosStorageBinaryStore.java` | 一个 `COS` 字段，`presignGetObject` 调 `generatePresignedUrl` | **仅类 Javadoc**（补自定义 endpoint 下的 URL 形态）；代码零改动 |
| `nebula-storage/nebula-storage-provider-spi/.../StorageBackendSettings.java` | 已有 `endpoint` 分量 | 不改 |
| `nebula-storage/nebula-storage-core/.../config/StorageBackendParamKeys.java` | 已有 `ENDPOINT` | 不改 |
| `nebula-storage/nebula-storage-core/.../support/ConfigurableStorageContentRepository.java` | 已读 `storage.backend.endpoint` 并传入 record | 不改 |
| `nebula-storage/nebula-storage-core/.../support/RoutingStorageContentRepository.java` | 临时/正式分区 | 不改 |
| `nebula-param/nebula-param-core/.../support/SystemParamDefinitions.java` | `storage.backend.endpoint` 说明写「MinIO / 阿里云 OSS 的服务地址」 | 改：只改说明文案 |
| `nebula-app/nebula-app-runner/src/main/resources/application.yml`、`backend/src/main/resources/application.yml`、`.env.example`、`docker-compose.yml` | COS 段无 endpoint | 改：新增键与 env |
| `docs/spec/10-config.md`、`nebula-storage/README.md` | 配置规范 / 模块说明 | 改 |
| `scripts/test-tencent-cos.sh`、`TencentCosStorageLiveIT.java` | 头注释/类 Javadoc 明示「只访问官方域名」 | 改注释；LiveIT 增加可选 endpoint 用例 |
| `docs/projects/nebula/release/changelog.md` | `[Unreleased]` | 改（仓库约定的功能交付项） |
| `nebula-app/nebula-app-runner/.../AppStarterConfigSecretPolicyTest.java` | yml 键占位默认值的守护测试 | 改：追加新键断言 |

### 2.4 工具链与开工前基线（实测，2026-11-19）

```bash
# provider 模块（3 个测试类）：BUILD SUCCESS，共 15 个用例，0 failures
mvn -o -q -pl nebula-storage/nebula-storage-provider-tencent-cos -am test
# 实测用例分布：TencentCosProbeUrlSupportTest 7 + TencentCosStorageAutoConfigurationTest 3 + TencentCosStorageBinaryStoreTest 5

# Javadoc 审计（仓库已有 summary.tsv）：nebula-storage 111 个 public 类型，missing_class_javadoc = 0
grep '^nebula-storage' target/javadoc-audit/summary.tsv   # → nebula-storage	111	0
```

- Maven 3.9.12、JDK 21，`mvn -o` 可离线运行。
- `nebula-storage` 是 Javadoc 零缺口模块：**本次不新增 public 类型**即可保持基线（只在既有类上加字段与方法）。
- 真实探针脚本 `scripts/test-tencent-cos.sh` 依赖固定步骤清单
  `STEPS="upload download presign-get delete read-after-delete cleanup"`，每步须打印 `COS-PROBE <step>=PASS|FAIL`；
  脚本汇总循环只遍历 `STEPS`，因此**新增的可选步骤 marker 会被忽略**，无需改 `STEPS`。

### 2.5 文档与配置约定

- `docs/README.md`：模块 `README.md` 只回答「怎么编译、怎么本地跑」，能力/配置/设计写在 `docs/spec/`；
  本次对 `nebula-storage/README.md` 只做与既有章节同构的最小补充。
- `docs/spec/10-config.md` §5.4 是对象存储配置的唯一规范落点。
- 直链 URL 视为凭据（`docs/spec/08-logging.md`）：不得写入日志、审计快照、错误信息；测试与探针只打印 host / path / 步骤名。
- 前端参数页是定义驱动的通用页面（`web/src/pages/system/config/param/*` 渲染后端返回的参数名 / 说明 / 值），
  **改后端说明文案不需要动前端**。

## 3. 方案

### 3.1 选定方案：单 client + `UserSpecifiedEndpointBuilder`

```text
nebula.storage.content.tencent-cos.endpoint ─┐
sys_param storage.backend.endpoint           ─┴─> merge() → TencentCosStorageProperties.endpoint
                                                        │
                                      endpoint 为空 ────┴──── endpoint 非空
                                            │                       │
                        new ClientConfig(new Region(region))   new ClientConfig(new Region(region))
                        （与今天逐字节一致）                     + setEndpointBuilder(new UserSpecifiedEndpointBuilder(
                                                                   normalizedEndpoint, "service.cos.myqcloud.com"))
                                            │                       │
                                            └────── 同一个 COSClient ┘
                                                        │
                    正式区 putObject / getObject / deleteObject / doesBucketExist / createBucket
                    与 generatePresignedUrl 全部走同一个 endpoint
```

- 第二个参数固定 `"service.cos.myqcloud.com"`：`UserSpecifiedEndpointBuilder` 两个参数都必须非 null；
  该值只用于 ListBuckets 类服务级请求，本模块不调用，仅为满足构造约束。
- 不显式设置 `httpProtocol`，沿用默认 `HttpProtocol.https`。
- `TencentCosStorageBinaryStore#presignGetObject` 一行不改：`generatePresignedUrl` 自动使用 client 的 endpoint builder，
  URL host 与签名 Host 天然一致。

### 3.2 明确排除的做法

| 做法 | 为什么不做 |
|---|---|
| 双 client（`apiClient` + `presignClient`） | 用户已否决；且用户接受正式区 I/O 也走自定义地址，双 client 只剩生命周期成本 |
| 签发后替换 URL host | 签名覆盖 Host，必然 403 |
| `generatePresignedUrl(request, false)` 关 Host 签名 | 与 URL 实际 host 不一致，等于把校验丢掉 |
| 在 store 里按请求就地改 `ClientConfig` 的 endpoint | endpoint 是 client 级字段，就地改写会污染并发请求 |
| 让 endpoint 成为必填 | 存量部署与本地开发不该被迫填一个能由 region 推导的值 |
| 支持 `http://` / 端口 / 路径前缀 | 本次固定 https；端口与路径不在范围内（4.3） |

### 3.3 自定义 endpoint 与桶的绑定语义（必须写进文档与风险）

因为 `UserSpecifiedEndpointBuilder` 忽略 bucket，配置 endpoint 后请求形态是 `https://<endpoint>/<对象键>`。
所以 **endpoint 必须与该桶一一绑定**（`cos.omnimart.cloudomni.cn` CNAME 到 `<bucket>.cos.<region>.myqcloud.com`，
或等价反代）。换桶时必须同步改 endpoint 或清空 endpoint，否则正式区读写会落到错误的源站。
`doesBucketExist` 在同一 host 上 HEAD 根路径判断桶是否存在：域名解析失败会直接抛连接异常，解析成功但指向别的源站/别的桶时
通常得到 404 / 403 —— 两种都表现为 `bindUploadTask` 转正时报错。

## 4. 字段契约与示例

### 4.1 启动配置键

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `nebula.storage.content.tencent-cos.endpoint` | string | 空 | 自定义服务地址；空 = 按 `region` 推导官方域名 |
| env `NEBULA_STORAGE_TENCENT_COS_ENDPOINT` | string | 空 | 同上，唯一推荐注入方式（与既有 COS 键同构） |

### 4.2 租户参数键（既有键，本次只接线 + 改文案）

| 键 | 类型 | 默认 | 模块 | 本次动作 |
|---|---|---|---|---|
| `storage.backend.endpoint` | STRING（非加密） | 空 | `storage` | 已存在；COS provider 开始读取；说明文案改为「MinIO / 阿里云 OSS / 腾讯云 COS 的服务地址或自定义域名地址（含协议或裸域名）」 |

回退口径与现有 `storage.backend.*` 完全一致：租户值非空优先，否则回退
`nebula.storage.content.tencent-cos.endpoint`。**已知副作用（与现有字段同构，接受）**：租户无法用空值清除启动配置里已设置的 endpoint。

**文案生效范围**：`materializeTenantDefaults()` 只在租户缺少该行时按定义建行，因此说明文案更新对「新建租户 / 尚未物化该键的租户」生效；
存量租户已物化的行保留旧说明，本次**不做**回填 SQL（见第 9 节）。

### 4.3 值规范与归一化（服务端强校验，选中该后端时执行）

| 输入 | 结果 |
|---|---|
| 未配置 / `""` / `"   "` | 视为未配置：按 `region` 推导官方域名，不报错 |
| `cos.omnimart.cloudomni.cn` | 采用（裸域名形态，输出 `https://cos.omnimart.cloudomni.cn/<key>`） |
| `https://cos.omnimart.cloudomni.cn` | **推荐接受**：剥离 `https://` 后采用，与阿里云 OSS 的书写习惯一致 |
| `HTTPS://COS.Omnimart.Cloudomni.CN/` | 归一化为 `cos.omnimart.cloudomni.cn`（trim + 剥离大小写不敏感的 `https://` + 去尾随 `/` 与 `.` + 小写） |
| `http://cos.omnimart.cloudomni.cn` | **拒绝**：本次固定 https（支持明文需同时改 `httpProtocol`，不在范围） |
| `cos.omnimart.cloudomni.cn:443` | **拒绝**（含端口） |
| `cos.omnimart.cloudomni.cn/path`、含 `?` / `#` / `@` / 空白 | **拒绝** |
| `-cos.example.com`、`cos..example.com`、单段 `localhost`、总长 > 253、单 label > 63 | **拒绝** |

- 校验只在 `nebula.storage.content.type=tencent-cos`（或租户 `storage.backend.type=tencent-cos`）被选中时执行，
  沿用 `StorageProviderConfigs` 的既有约定：未选中的后端配置不完整不应让应用起不来。
- 拒绝时抛 `IllegalStateException`，消息指明字段与规范，格式与现有配置校验一致：
  `腾讯云 COS 存储后端配置非法：endpoint 只接受域名或 https:// 域名（不含端口 / 路径 / 查询参数），拒绝值: <原值>`
  （域名不是凭据，允许回显；access-key / secret-key 永不出现在任何消息里）。
- 归一化结果写回 `TencentCosStorageProperties` 的**副本**（`merge()` 新建的实例），不就地改写 Spring 绑定的单例 Bean。

### 4.4 生效矩阵

| `endpoint` | `direct-download-enabled` | 正式区 I/O 的 host | 直链 host |
|---|---|---|---|
| 空 | false | 官方 `<bucket>.cos.<region>.myqcloud.com` | 不签发（返回 empty） |
| 空 | true | 官方 | 官方（**与今天逐字节一致**） |
| 非空 | false | 自定义 endpoint | 不签发（配置合法，不强制同时开启） |
| 非空 | true | 自定义 endpoint | 自定义 endpoint（`https`） |

### 4.5 示例

```yaml
nebula:
  storage:
    content:
      type: tencent-cos
      tencent-cos:
        region: ${NEBULA_STORAGE_TENCENT_COS_REGION:}          # endpoint 非空时 region 仍必填
        access-key: ${NEBULA_STORAGE_TENCENT_COS_ACCESS_KEY:}
        secret-key: ${NEBULA_STORAGE_TENCENT_COS_SECRET_KEY:}
        bucket: ${NEBULA_STORAGE_TENCENT_COS_BUCKET:}          # 必须是 <桶名>-<APPID>
        # 自定义服务地址：留空按 region 推导官方域名；非空时正式区读写与直链都走它（固定 https）。
        # 可写裸域名或 https:// 域名；该域名必须与该桶一一绑定，生产建议把 create-bucket-if-missing 设为 false 并预建桶。
        endpoint: ${NEBULA_STORAGE_TENCENT_COS_ENDPOINT:}
        create-bucket-if-missing: ${NEBULA_STORAGE_TENCENT_COS_CREATE_BUCKET_IF_MISSING:true}
        direct-download-enabled: ${NEBULA_STORAGE_TENCENT_COS_DIRECT_DOWNLOAD_ENABLED:false}
        direct-download-expire-seconds: ${NEBULA_STORAGE_TENCENT_COS_DIRECT_DOWNLOAD_EXPIRE_SECONDS:300}
```

租户级覆盖（沿用既有 `storage.backend.endpoint` 行，仅把值改成自定义地址）：

```text
param_key   = storage.backend.endpoint
param_value = https://cos.omnimart.cloudomni.cn
data_type   = STRING
module_code = storage
encrypted   = false
```

签发结果形态（`q-ak` / `q-signature` 一律脱敏）：

```text
https://cos.omnimart.cloudomni.cn/t/<tenantId>/<对象键>
  ?sign=q-sign-algorithm%3Dsha1%26q-ak%3D%3C已脱敏%3E%26q-sign-time%3D...%26q-key-time%3D...
        %26q-header-list%3Dhost%26q-url-param-list%3D%26q-signature%3D%3C已脱敏%3E
```

### 4.6 不变量（验收时逐条核对）

1. endpoint 为空时，client 构造、正式区请求 URL、直链 URL 与今天**完全一致**。
2. endpoint 非空时形如 `https://<endpoint>/<key>`：host 恒为归一化后的 endpoint，路径不含桶名（3.3 绑定语义）。
3. 直链 URL 的 host 与签名覆盖的 Host 相同，且 `q-header-list` 含 `host`；不得出现「签完改 host」或 `signHost=false`。
4. `region` 在所有分支必填；缺失时报错文案含 `region`。
5. 上传 / 分片 / 合并链路零改动，仍只写本地临时区；COS provider 仍只在正式区操作时被触达。
6. `StorageDirectUrl`（url + expireAt）、`/api/storage/download-location` 等对外契约不变。
7. 直链 URL 仍属凭据：不写日志 / 审计 / 错误信息；测试与探针只输出 host、path、步骤名。
8. 无 DDL、无 API 变更、无前端页面变更、无新增侧边栏条目。
9. 不新增 public 类型（`nebula-storage` Javadoc 基线 111 / 0 保持）。

## 5. 任务拆分

### B1 `TencentCosStorageProperties`：endpoint 字段与归一化

- **产出文件**：改 `nebula-storage/nebula-storage-provider-tencent-cos/src/main/java/cn/cloudomni/nebula/storage/provider/tencent/cos/TencentCosStorageProperties.java`
  - 新增 `private String endpoint` + getter/setter；
  - 新增包内静态 `String normalizeEndpoint(String raw)`：`trim` → 空白则返回 `null` → 剥离大小写不敏感的 `https://` 前缀 →
    去尾随 `/` 与 `.` → 小写 → 按 4.3 做主机名与长度校验；非法抛 `IllegalStateException`（消息含 `endpoint` 与「域名」）；
  - `validate()`：保留既有 `requireText(region)` / `requireCredentials(...)` 顺序，最后 `this.endpoint = normalizeEndpoint(this.endpoint)`；
  - 新增 `boolean hasEndpoint()`；
  - 类 Javadoc 补：endpoint 语义（空 = region 推导）、与桶一一绑定、固定 https、`https://` 前缀会被剥离。
- **完成判据**：4.3 表格逐行有测试；空值不抛且 `hasEndpoint()` 为 false；拒绝消息含 `endpoint`；拒绝路径永不回显 AK/SK。

### B2 `TencentCosStorageContentProvider`：单 client 应用 endpoint

- **产出文件**：改 `.../TencentCosStorageContentProvider.java`
  - `merge(settings)` 增加 `resolved.setEndpoint(firstText(settings == null ? null : settings.endpoint(), properties.getEndpoint()))`；
    **归一化只发生在 `validate()` 一处**，merge 不提前处理；
  - 把 client 配置构造抽成包内可见静态方法便于单测：
    `static ClientConfig buildClientConfig(TencentCosStorageProperties resolved)`：
    `new ClientConfig(new Region(resolved.getRegion()))`；`resolved.hasEndpoint()` 为真时
    `setEndpointBuilder(new UserSpecifiedEndpointBuilder(resolved.getEndpoint(), SERVICE_ENDPOINT))`；
  - 新增常量 `private static final String SERVICE_ENDPOINT = "service.cos.myqcloud.com";`；
  - `create(settings)` 改为 `new COSClient(credentials, buildClientConfig(resolved))`，**仍然只有一个 client**；
  - 类 Javadoc 补：endpoint 空/非空两条分支，以及「正式区 I/O 与直链共用同一个 client」。
- **完成判据**：
  - `buildClientConfig` 在 endpoint 为空时 `getEndpointBuilder()` 是 `RegionEndpointBuilder`；
  - endpoint 非空时是 `UserSpecifiedEndpointBuilder`，其 `buildGeneralApiEndpoint("any-bucket-1250000000")`
    返回归一化后的 endpoint（证明忽略 bucket）；
  - `create()` 返回的 store 仍只持有单个 client（无第二字段、无工厂、无缓存）。

### B3 `TencentCosStorageBinaryStore`：仅更新 Javadoc

- **产出文件**：改 `.../TencentCosStorageBinaryStore.java` 类 Javadoc：补「endpoint 为空时形如
  `https://<bucket>.cos.<region>.myqcloud.com/<key>?...`；配置自定义 endpoint 时形如 `https://<endpoint>/<key>?...`，
  签名 Host 与 URL host 相同；直链与正式区读写共用同一个 client」。
- **完成判据**：`git diff` 中该文件只有注释行变化；既有 `TencentCosStorageBinaryStoreTest` 5 个用例不改也全绿。

### B4 租户参数说明文案

- **产出文件**：改 `nebula-param/nebula-param-core/src/main/java/cn/cloudomni/nebula/param/support/SystemParamDefinitions.java`
  中 `storage.backend.endpoint` 说明为：
  `"MinIO / 阿里云 OSS / 腾讯云 COS 的服务地址或自定义域名地址（含协议或裸域名）；腾讯云 COS 留空时按 region 推导官方域名"`。
- **完成判据**：`mvn -o -pl nebula-param/nebula-param-core -am test` 全绿（`SystemParamServiceImplTest` 对定义数量的断言用
  `SystemParamDefinitions.all().size()`，非硬编码；本次不新增定义，数量不变）；默认值仍为 `""`、`moduleCode=storage`、`encrypted=false`。
- **不做**：不改前端参数页、不改 `web/`、不为存量行做文案回填 SQL。

### B5 provider 模块单元测试

- **产出文件**：
  - 新增 `.../src/test/java/cn/cloudomni/nebula/storage/provider/tencent/cos/TencentCosEndpointTest.java`（纯本地、不联网）：
    - 归一化与非法值全覆盖（4.3 表格：裸域名、`https://` 剥离、大小写、尾随 `/`/`.`、端口、路径、`http://`、`@`、空白、空值）；
    - `validate()` 在 endpoint 非法时抛 `IllegalStateException`，消息含 `endpoint`，且消息不含 AK/SK 原文；
    - `buildClientConfig`：空 endpoint → `RegionEndpointBuilder`（**空 endpoint 回归**）；非空 → `UserSpecifiedEndpointBuilder`
      且 `buildGeneralApiEndpoint(<bucket>)` 等于归一化值；
    - 真实 `COSClient` + **假密钥**（`new BasicCOSCredentials("AKIDFAKE", "fakeSecret")`）+ endpoint builder：
      `generatePresignedUrl` 结果 `scheme=https`、`host=cos.omnimart.cloudomni.cn`、path 不含桶名；解码 `sign` 参数后
      `q-header-list=host`、`q-url-param-list=` 为空；
    - **URL host 与签名 Host 一致性（强断言）**：从解码后的 `q-sign-time=start;end` 取显式时间，
      用 `new COSSigner().buildAuthorizationStr(HttpMethodName.GET, "/" + key, Map.of("Host", endpoint), Map.of(),
      new BasicCOSCredentials(fakeAk, fakeSk), new Date(start * 1000), new Date(end * 1000), true)`
      逐字符复算，断言等于 URL 中解码出的签名串；再用官方域名 `<bucket>.cos.<region>.myqcloud.com` 复算，断言**不相等**
      （证明 Host 参与签名）。该用例不设 `Content-Disposition`，避免额外查询参数干扰。
  - 改 `.../TencentCosStorageBinaryStoreTest.java`：新增「自定义 endpoint 下 `presignGet` 返回 URL 的 host 为自定义域名」
    一条，用真实 `COSClient` + 假密钥（不 mock `generatePresignedUrl`，避免断言退化为「mock 什么就返回什么」）；既有 5 条不动。
  - 改 `.../TencentCosStorageAutoConfigurationTest.java`：`endpoint` 绑定（空值与非空各一），断言 `properties.getEndpoint()`
    的原始绑定值；此处不触发真实网络。
- **完成判据**：`mvn -o -pl nebula-storage/nebula-storage-provider-tencent-cos -am test` 全绿，用例数从 15 增至 **≥23**；
  不联网（无 DNS/HTTP 请求）；新代码不打印任何签名 URL。

### B6 配置安全测试

- **产出文件**：改 `nebula-app/nebula-app-runner/src/test/java/cn/cloudomni/nebula/app/AppStarterConfigSecretPolicyTest.java`
  - 在既有的 `shouldUseExplicitSafeStarterReplacementValues()`（已逐键断言 `minio.secret-key` / `aliyun-oss.secret-key` /
    `tencent-cos.secret-key` 等占位默认值为空串）中追加一条：
    `nebula.storage.content.tencent-cos.endpoint` 必须等于 `${NEBULA_STORAGE_TENCENT_COS_ENDPOINT:}`；
  - 如该文件新增禁止字面量，沿用 `shouldNotKeepScopedForbiddenLiteralsInStarterConfigOrMysqlSeed()` 的既有机制，
    不引入新依赖、不改动既有断言。
- **完成判据**：`mvn -o -pl nebula-app/nebula-app-runner -am test` 全绿；把默认值临时改成非空时该断言必须失败（本地验证后还原）。

### L1 LiveIT / 探针：可选 endpoint 真实全链路

- **产出文件**：改 `.../src/test/java/.../TencentCosStorageLiveIT.java`
  - 新增常量 `ENDPOINT_ENV = "NEBULA_STORAGE_TENCENT_COS_ENDPOINT"`；
  - 新增独立 `@Test` 方法 `shouldRoundTripThroughCustomEndpointWhenConfigured`，方法级
    `@EnabledIfEnvironmentVariable(named = ENDPOINT_ENV, matches = ".+")`（类上已有 AK/SK 门控）；
  - 方法内：用 env 的 endpoint 建一条**独立**的 `COSClient`（`UserSpecifiedEndpointBuilder`，复用现有超时设置）与 store
    （`properties.setEndpoint(...)`、`createBucketIfMissing=false`、`directDownloadEnabled=true`、调用 `validate()`），
    `finally` 里 `client.shutdown()`；步骤沿用现有 `step(...)`：
    `custom-endpoint-upload` → `custom-endpoint-download` → `custom-endpoint-presign-get`（断言 host == env endpoint、
    scheme=https、`q-header-list=host`，再真实 `httpGet` 断言 200 与字节一致）→ `custom-endpoint-delete`；
  - **现有官方域名用例（5 个 step 与其断言）一行不改**；不新增任何 URL / `q-ak` / `q-signature` 输出；
  - 类 Javadoc 与「只对官方域名做一次探针」的表述改为「默认只跑官方域名；设置 `NEBULA_STORAGE_TENCENT_COS_ENDPOINT`
    后额外跑一次自定义 endpoint 全链路」。
- **产出文件（脚本注释）**：改 `scripts/test-tencent-cos.sh` 头注释中「只访问 COS 官方域名 … 不碰自定义域名」一句为
  「默认只访问官方域名 `<bucket>.cos.<region>.myqcloud.com`；设置 `NEBULA_STORAGE_TENCENT_COS_ENDPOINT` 后额外跑一轮
  自定义 endpoint 全链路」。**`STEPS` 变量不动。**
- **完成判据**：
  - 不设 `NEBULA_STORAGE_TENCENT_COS_ENDPOINT` 时，`-Dtest=TencentCosStorageLiveIT` 行为与今天一致（官方 5 步全 PASS，新方法跳过）；
  - 设了 endpoint 且密钥可用时，额外出现 `COS-PROBE custom-endpoint-*=PASS`，输出中无 `sign=` / `q-ak=` / `q-signature=` 明文；
  - `scripts/test-tencent-cos.sh` 两轮（无 / 有 endpoint）都以汇总 PASS 结束（新增 marker 不在 `STEPS` 内被忽略）；
  - **该用例需要真实密钥与真实域名，只能由用户在本地用脚本执行**，CI 默认跳过。

### D1 启动配置样板（4 处，值与既有 COS 键同构，一律空默认）

- `nebula-app/nebula-app-runner/src/main/resources/application.yml`：`tencent-cos` 段在 `region` 之后加
  `endpoint: ${NEBULA_STORAGE_TENCENT_COS_ENDPOINT:}` + 两行注释（留空按 region 推导官方域名；非空时正式区读写与直链都走它，
  固定 https，须与该桶一一绑定）。
- `backend/src/main/resources/application.yml`：`tencent-cos` 段同样追加（模板工程与主仓保持同构）。
- `.env.example`：`NEBULA_STORAGE_TENCENT_COS_REGION=` 之后加 `NEBULA_STORAGE_TENCENT_COS_ENDPOINT=` + 注释
  （裸域名或 `https://` 域名，例：`cos.omnimart.cloudomni.cn`；留空用官方域名）。
- `docker-compose.yml`：COS env 块加
  `NEBULA_STORAGE_TENCENT_COS_ENDPOINT: "${NEBULA_STORAGE_TENCENT_COS_ENDPOINT:-}"`。
- **完成判据**：四处键名/env 名逐字符一致（7.2 grep）；不引入任何真实域名或凭据作为默认值；B6 守护测试通过。

### D2 配置规范与模块文档

- 改 `docs/spec/10-config.md` §5.4：
  - `tencent-cos` 条目补「可选 `endpoint`（留空按 region 推导官方域名；非空时正式区读写与直链都走该地址，固定 https，
    须与该桶一一绑定）」；
  - 租户参数表 `storage.backend.endpoint` 一行改为「MinIO / 阿里云 OSS / 腾讯云 COS 的服务地址或自定义域名地址」；
  - 约束清单追加三条：「腾讯云 COS 配置 `endpoint` 后，正式区写入 / 读取 / 删除 / 桶探测与预签名直链共用同一个 client 与该地址；
    上传与分片只写本地临时区，不受影响」；「该地址是主机名或 `https://` 主机名，服务端拒绝 `http://`、端口、路径与查询参数，
    输出固定 https」；「自定义 endpoint 与桶一一绑定，换桶需同步改地址或清空」。
- 改 `nebula-storage/README.md`：
  - §7.4「直连下载」补 2 句（COS 支持自定义 endpoint，直链 host 即该地址；正式区读写同走该地址，上传/分片仍是本地临时区）；
  - §8.2 `content` 配置条目里 `tencent-cos` 一行补 `endpoint`，并说明留空语义。
  - **不写** SDK 实现细节（endpoint builder 类名等），按 `docs/README.md` 约定归 spec 与代码 Javadoc。
- **完成判据**：文档里的键名、默认值、语义与代码一致；示例域名只用 `cos.omnimart.cloudomni.cn`；无真实密钥；
  无新增页面 → 不需要改 `docs/publish/cludix-doc/sidebars/**`。

### D3 变更记录（仓库约定要求）

- 改 `docs/projects/nebula/release/changelog.md` 的 `[Unreleased]` → `### Added` 增加一条：
  `nebula-storage` / `docs`：腾讯云 COS 新增 `endpoint` 配置（env `NEBULA_STORAGE_TENCENT_COS_ENDPOINT`，租户级复用
  `storage.backend.endpoint`）；留空仍按 region 推导官方域名，非空时正式区读写与预签名直链统一走该自定义域名，`region` 仍必填；
  上传与分片只写本地临时区不受影响；无 DDL、无前端改动。
- **完成判据**：条目格式与既有条目一致，除 `cos.omnimart.cloudomni.cn` 外不含敏感信息。
- **不做**：`docs/projects/nebula/storage/configuration.md` 现状仍在描述已移除的 `s3` 后端，属独立文档修复，本次不改（见第 9 节）。

### T1 回归与验收

- **产出文件**：无生产文件；输出写进实施回报。
- **完成判据**：第 7 节必跑命令全绿；可选探针按 7.3 由用户执行并贴输出。

### F0 前端（无实现任务）

- **结论**：不存在需要改的前端代码。`endpoint` 是既有通用参数键（`storage.backend.endpoint`），参数页是定义驱动的通用表格，
  改后端说明文案后页面自动显示新文案；COS 启动配置不进前端。无新页面、无路由、无侧边栏、无 API 类型变更。
- **完成判据（验证方式）**：检索确认 `web/` 与 `control/` 无 `storage.backend` / `tencent-cos` 硬编码（已核实为空）；
  本次无前端改动，故**不跑**前端套件，实施回报里如实声明。

## 6. 执行顺序与里程碑

1. **M1 契约与配置面**：B1 → B2。先把「字段名 / 归一化规则 / client 构造两条分支」固定下来。
2. **M2 测试闭合**：B3 → B5 → B4，跑 provider 与 param 两套测试。
3. **M3 配置面与文档**：D1 → B6 → D2 → D3。
4. **M4 可选真实探针与验收**：L1（注释 + 可选用例）→ T1 → 交 reviewer 按本计划只读验收。

依赖：B2 依赖 B1；B5 依赖 B1+B2；B6/D1 依赖 B1（键名与归一化规则）；D2 依赖 M1–M3 的最终语义；L1 依赖 B2。

## 7. 测试与验收命令

### 7.1 必跑（离线可执行）

```bash
# 1) provider 模块（含新增单测）：BUILD SUCCESS，用例数 15 → ≥23，0 failures
mvn -o -pl nebula-storage/nebula-storage-provider-tencent-cos -am test

# 2) 参数定义（B4 文案）：BUILD SUCCESS
mvn -o -pl nebula-param/nebula-param-core -am test

# 3) 启动器配置守护（B6）：BUILD SUCCESS
mvn -o -pl nebula-app/nebula-app-runner -am test

# 4) 核心层旁证（本次零改动，确认 record / 仓库契约未受影响）：BUILD SUCCESS
mvn -o -pl nebula-storage/nebula-storage-core -am test

# 5) Javadoc 审计：nebula-storage 行 missing_class_javadoc 必须保持 0（基线 111 / 0）
bash scripts/javadoc-audit.sh .
grep '^nebula-storage' target/javadoc-audit/summary.tsv
```

> 注 5：脚本整体退出码会因其它模块既有 290 条历史缺口而非 0，**判据只看 `nebula-storage` 行第三列为 0**，
> 不得以「整体退出码 0」冒充通过。

### 7.2 字面一致性检查

```bash
# 四处 env 名必须完全一致
grep -rn "TENCENT_COS_ENDPOINT" nebula-app/nebula-app-runner/src/main/resources/application.yml \
  backend/src/main/resources/application.yml .env.example docker-compose.yml

# 契约键名必须完全一致（启动键 / 租户键 / 文档）
grep -rn "tencent-cos.endpoint\|NEBULA_STORAGE_TENCENT_COS_ENDPOINT" \
  nebula-storage/nebula-storage-provider-tencent-cos/src docs/spec/10-config.md nebula-storage/README.md
grep -rn "storage.backend.endpoint" nebula-param/nebula-param-core/src docs/spec/10-config.md

# 旧方案残留必须为零（旧字段 / 双 client 方案不该出现在仓库里；只允许出现在 docs/plan 的计划文档中）
grep -rn "direct-download-domain\|DIRECT_DOWNLOAD_DOMAIN\|presignClient" \
  nebula-storage nebula-param nebula-app backend docs scripts web control \
  --include=*.java --include=*.yml --include=*.yaml --include=*.md --include=*.sh | grep -v "docs/plan/"
```

### 7.3 可选：真实云端探针（需密钥与真实域名，仅由用户执行）

```bash
# 官方域名（回归）：应与今天一致
scripts/test-tencent-cos.sh

# 自定义 endpoint（新能力）：应出现 COS-PROBE custom-endpoint-*=PASS，且输出无 q-signature/q-ak 明文
NEBULA_STORAGE_TENCENT_COS_ENDPOINT=cos.omnimart.cloudomni.cn scripts/test-tencent-cos.sh
```

### 7.4 不可自动化、如实声明的部分

- `backend/` 是独立 reactor 的模板工程（依赖 Maven Central 发布的 `nebula-app-starter`），本次只改其 yml 一个键；
  在没有该发布件的环境里不做编译验证，改为 7.2 的键名比对 + 人工核对缩进。
- 自定义域名的 DNS / CNAME / 证书 / 跨域规则由运维保证，应用不探测；真实可用性只由 7.3 覆盖。
- 「在自定义域名上 `createBucket` 是否被 COS 接受」无法离线验证，按风险表的运维建议处理。
- 前端无改动，故不跑前端套件。

## 8. 风险与回滚

| 风险 | 影响 | 缓解 |
|---|---|---|
| endpoint 未与该桶一一绑定（CNAME / 反代缺失） | 正式区写入、读取、删除、桶探测全部失败（bind 转正报错），直链 404/403；上传与分片不受影响 | 只有显式配置才生效；先用 7.3 探针小流量验证；清空配置即刻回官方域名（5 秒内热生效，无需重启） |
| 在自定义 endpoint 上 `createBucket` 被 COS 拒绝 | 桶不存在时转正失败 | 文档与 yml 注释写明：配 endpoint 时把 `create-bucket-if-missing` 设为 false，桶由运维预建 |
| 存量租户已保存 `storage.backend.endpoint`（此前只对 MinIO/OSS 有意义） | 该租户把 `storage.backend.type` 切成 `tencent-cos` 后，旧值立刻对 COS 生效 | 既有字段语义的自然延伸；在 changelog 与 spec 里写明切换 type 时需核对该值 |
| endpoint 写成 `http://`、带端口或路径 | 选中该后端时启动失败 | 归一化校验单点执行，错误消息给出字段名与规范；文档给正反例 |
| 有人「优化」成签后改 host / 关 Host 签名 | 直链必然 403 或校验被绕过 | 4.6 不变量第 3 条 + 3.2 排除表；reviewer 按 diff 核对 `generatePresignedUrl` 调用点 |
| 直链 URL 进入日志/报错 | 凭据泄露 | 复用现有脱敏约定；新增代码不打印任何签名 URL，探针只输出 host/path |
| 现有 `COSClient` 不在重建时回收（连接池随租户配置变更增长） | 与今天一致，本次不引入新问题 | 明确写入非目标；如需解决另立任务（会改变正式区客户端生命周期） |
| 参数说明文案对存量租户不生效 | 老租户看到旧说明 | 已知行为（2.5 / B4 判据）；需要统一文案时另做运维 SQL |

**回滚**

1. 行为回滚：清空 `NEBULA_STORAGE_TENCENT_COS_ENDPOINT` 与租户 `storage.backend.endpoint` → 立刻回到官方域名，代码可保留。
2. 代码回滚：`B1+B2+B3`（配置与 client）一组、`B4`（文案）单独、`B5/B6/L1`（测试与探针）单独、`D1/D2/D3`（配置与文档）一组，
   各组 revert 互不依赖；`nebula-storage-core` / `-spi` / 前端零改动，无需数据回滚。
3. 无 DDL、无数据迁移、无 API 契约变更，回滚不需要停机迁移。

## 9. 待确认

1. **`https://` 前缀是否接受**：本计划推荐**接受并剥离**（与阿里云 OSS 的书写习惯对齐，`http://` 一律拒绝）。
   若要求严格裸域名，把 4.3 该行改为「拒绝」，其余规则不变。
2. **`http://` 是否要支持**：本计划拒绝（固定 https）。若必须支持，需要按 scheme 设置 `httpProtocol`，
   会增加「协议与签名/直链一致性」的验证面，建议不做。
3. **存量租户参数说明文案是否回填**：本计划不做（`materializeTenantDefaults` 只补缺失行）。若要统一文案，
   需运维 SQL 或一次性迁移动作，与本改动解耦。
4. **`docs/projects/nebula/storage/configuration.md` 是否顺带修**：该文件仍在描述已移除的 `s3` 后端，属独立文档问题，
   本计划不含此项；若要一并处理请确认范围。
5. **changelog 是否写入 `[Unreleased]`**：本计划按仓库约定写入（D3）。若希望发版时统一写，可去掉该任务。
6. **LiveIT 是否允许新增可选用例与改脚本头注释**：本计划包含（L1），两者都不改变 CI 默认行为（无 env 时跳过、`STEPS` 不变）。
