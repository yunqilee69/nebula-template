# 计划：`download-location` 的 PROXY 地址改为同源相对路径（最小缺陷修复）

> 范围已由用户确认：「PROXY 的这个就修复一下」。本计划**只做这一件事**——`GET /api/storage/download-location`
> 返回的 `mode=PROXY` 项，把 `url` 从「按当前请求上下文拼出的绝对地址」改成**同源相对路径**
> `/api/storage/download?...`。`DIRECT` 的签名直链、`POST /api/storage/generate-signed-url` 的分享地址
> **一律保持绝对地址不变**，不做任何顺带重构。本文档只有计划，不含业务实现代码。

## 1. 背景与目标

### 1.1 缺陷现象

`download-location` 在代理模式下返回的 `url` 形如 `http://localhost/api/storage/download?fileId=file-1`
（见今天 `StorageControllerTest#shouldReturnProxyDownloadLocationWithContextUrl` 的断言）。这类地址只在
「浏览器 / 客户端与后端同主机同端口同协议」时偶然可用；一旦部署在网关或反向代理之后，客户端拿到的是一个
**它访问不到的 host 或 http 协议地址**，预览与下载直接失败（图片变占位图、文件下载报网络错误）。

### 1.2 已确认根因（代码证据）

| 证据 | 位置 | 说明 |
| --- | --- | --- |
| 绝对地址由请求上下文推导 | `StorageController#resolveDownloadLocation` 内 `ServletUriComponentsBuilder.fromCurrentContextPath().path("/api/storage/download")` | scheme / host / port 全部取自当前 Servlet 请求，不是业务事实 |
| 未启用 forwarded headers | 全仓库 `grep` 无 `server.forward-headers-strategy`、无 `ForwardedHeaderFilter`（`X-Forwarded-For` 只被 `RequestContextFilter` 用于取客户端 IP） | TLS 终结与端口映射发生在网关/nginx 侧，下游服务看到的是内部 host + `http` |
| remote 模式会泄漏内网服务地址 | `StorageRemoteServiceImpl#resolveDownloadLocation` → `StorageFeignClient` 调存储服务的 `StorageController` | 该 Controller 的「当前请求」是 Feign 发来的服务间请求，`fromCurrentContextPath()` 得到的是存储服务的内部地址（如 `http://storage:9905`），浏览器永远不可达 |
| 单元测试把缺陷固化成了契约 | `StorageControllerTest` 第 365、411 行断言 `http://localhost/api/storage/download?...` | MockMvc 的默认上下文恰好是 `http://localhost`，所以「测试绿」与「线上坏」并存 |

根因一句话：**服务端把一个与自身部署位置强耦合的绝对地址当成契约返回，而它并不知道客户端看到的
origin 是什么。**

### 1.3 目标

1. `mode=PROXY` 的 `url` 恒为**同源相对路径**，固定形如
   `/api/storage/download?fileId=<fileId>[&filename=<enc>][&variant=<enc>]`，**不含 scheme、host、port、context-path**。
2. 契约由**测试先行锁定**（TDD）：先把现有断言改成正确的相对契约并观察失败，再改实现，再观察通过。
3. 生产代码改动收敛到 `StorageController` 的一个 URL 构造点，外加响应字段的 OpenAPI 文案。
4. 消费方零改动即可工作（web / mobile / 仓库外第三方见 §2.2、§4.3）。

### 1.4 非目标（含硬性禁止）

- **禁止**更改 `POST /api/storage/generate-signed-url` 的行为与断言。分享地址必须保持绝对地址：它是复制给
  第三方、在其浏览器地址栏直接打开的链接，相对路径对外部使用者无意义。**尤其禁止为了让实现通过而修改
  `StorageControllerTest#shouldReturnSignedDownloadUrl`（第 175 行的绝对地址断言）——那是迁就实现改测试。**
- **禁止**修改 `mode=DIRECT` 的 `url` 语义与断言（`shouldPassThroughDirectDownloadLocation`）：对象存储预签名
  直链本来就是跨域绝对地址，改成相对即彻底失效。
- **禁止**用「把断言放宽成 `contains("/api/storage/download")`」的方式让红灯变绿；断言必须是完整字符串相等。
- 不引入 `server.forward-headers-strategy`、`ForwardedHeaderFilter`、`X-Forwarded-Prefix` 等代理头改造（见 §3.2）。
- 不改 `StorageDownloadLocationDto`、`IStorageService`、`StorageServiceImpl` 的方法体、`StorageFeignClient`、
  remote 实现；不改 `applyLocationCacheControl` 的缓存策略（仍 `private, max-age=60`）。
- 不改 web / mobile / `packages/client-sdk` 的任何生产代码（理由见 §5 F0）。
- 不改 `docs/spec/` 任何规范文件：本次没有新增/变更错误码、配置键、权限码、分页或禁止项，
  `09-security.md` §4.2 对 `download-location` 的白名单与凭证约束也不涉及 URL 形态。
- 不新增文档站页面，因此**不需要**登记 `docs/publish/cludix-doc/sidebars/projects/nebula.ts`（纯缺陷修复，
  只更新既有页面文案与 changelog）。
- 不做 URL 指纹、不做 `download-location` 响应结构演进、不顺带清理 `ServletUriComponentsBuilder` 的其他使用点。

## 2. 现状与约束

### 2.1 现状契约（改前）

| 模式 | `url` 现状 | 生成位置 |
| --- | --- | --- |
| `PROXY` | 绝对地址，host/scheme 来自当前请求（本地 `http://localhost/...`，网关后为内网地址或 `http`） | `StorageController#resolveDownloadLocation` 循环体 |
| `DIRECT` | 对象存储预签名直链（跨域绝对地址，凭据在查询串） | `StorageServiceImpl#resolveDownloadLocation` → `presignFormal` |
| 签名分享 | 绝对地址 `.../api/storage/download-signed?...` | `StorageController#createSignedDownload` |

服务层刻意不产出 PROXY 地址，注释写明「地址由控制层按当前请求上下文补全，服务层不感知 Web 上下文」
（`StorageServiceImpl#resolveDownloadLocation` 末尾）——**这条注释在修复后要一并改成「控制层补全同源相对路径」**，
否则注释会与实现相反。

### 2.2 消费方现状（决定「相对路径是否安全」的关键事实）

| 消费方 | 位置 | 对 `PROXY.url` 的用法 | 相对路径是否可用 |
| --- | --- | --- | --- |
| Web 下载 | `web/src/api/storage.ts#downloadFile` | 直接把 `location.url` 交给自家 axios `request({ url: ... })` | 可用（同源或经 `baseURL` 拼接） |
| Web 预览 | `web/src/hooks/use-storage-preview-url.ts` | 同样交给 `request`，`responseType: 'blob'` | 可用 |
| Web 解析 | `web/src/api/storage.ts#parseStorageDownloadUrl` | `new URL(downloadUrl, 'http://nebula.local')`，两种形态都能解析 | 可用（本来就按相对设计） |
| Web 单元测试 | `web/src/api/storage.test.ts`、`avatar-preview.test.tsx` | 已经 mock 成相对地址 `'/api/storage/download?fileId=file-1&filename=avatar.png'` | 前端早已假设相对，**是后端断言与前端假设不一致** |
| Mobile 预览 | `mobile/src/storage/authenticated-image.ts` | PROXY 分支**不使用** `location.url`，自己用 `STORAGE_ENDPOINTS.download` + `params` 重新发起 | 无关（两种形态都不影响） |
| 已存库头像 | 个人资料 `avatar` 字段 | 保存的是相对路径 `/api/storage/download?fileId=...&filename=...` | 说明相对路径是本仓库的既有惯例 |

### 2.3 部署与路由约束

- 网关保留前缀：`nebula-gateway-service/application.yml` 路由 `Path=/api/storage/**` 直转存储服务，不做
  `StripPrefix`；浏览器侧路径就是 `/api/storage/...`，因此相对路径不需要感知任何网关前缀。
- 本地开发：`web/vite.config.ts` 把 `/api` 代理到 `VITE_API_BASE_URL`，页面与 API 同源。
- 结论：**当前形态下「同源相对路径」在所有已知部署方式里都可解析**；唯一真实前提是「前端页面与 API 同源」，
  该前提今天成立（见 §7 R1 的风险与缓解）。

### 2.4 工具链与开工前基线（本机实测，命令均已跑通）

| 项 | 命令 | 基线结果 |
| --- | --- | --- |
| JDK / Maven | `mvn -v` | Maven 3.9.12 / Java 21.0.9 |
| 后端目标测试 | `mvn -o -pl nebula-storage/nebula-storage-local test -Dtest=StorageControllerTest -DfailIfNoTests=false` | 通过（exit 0），依赖已在本地仓库，可离线跑 |
| 前端目标测试 | `cd web && pnpm vitest run src/api/storage.test.ts` | 25 passed |
| 移动端目标测试 | `cd mobile && node --test "test/authenticated-image.test.ts"` | 3 passed |

### 2.5 编码行为（已用本仓库 Spring 7.0.8 实测，供断言直接照抄）

```text
UriComponentsBuilder.fromPath("/api/storage/download").queryParam("fileId","file-1").encode().toUriString()
  -> /api/storage/download?fileId=file-1
UriComponentsBuilder.fromPath("/api/storage/download")
    .queryParam("fileId","file-1").queryParam("filename","合同.pdf").queryParam("variant","thumb").encode().toUriString()
  -> /api/storage/download?fileId=file-1&filename=%E5%90%88%E5%90%8C.pdf&variant=thumb
```

即：与今天 `ServletUriComponentsBuilder(...).encode().toUriString()` 的**查询串编码完全一致**，只少了 scheme+host+port。

## 3. 方案取舍

### 3.1 候选 A（推荐）：PROXY 返回同源相对路径

`url = /api/storage/download?fileId=...`，由客户端在发起请求时解析成最终地址。

- 优点：服务端不再声称自己知道客户端看到的 origin；跨部署（单机、网关、nginx、remote 模式、容器内网）
  行为恒一致；与前端现有假设、已存库数据一致；改动只有一个构造点加一处注释。
- 缺点：如果某个消费方把 `PROXY.url` 当「可粘贴到任意地方打开的绝对链接」，它必须自己补 origin。
  仓库内无此类消费方（§2.2）。

### 3.2 候选 B：保留绝对地址，补 forwarded headers

`server.forward-headers-strategy=framework`（或 `ForwardedHeaderFilter`），依赖网关/nginx 正确下发
`X-Forwarded-Proto/Host/Port`。

- 否决理由：
  1. **修不到 remote 模式**：Feign 的服务间请求没有外部 origin 可转发，仍然只能得到内网地址。
  2. 依赖运维配置正确性，配置缺失就静默回退到内网地址——缺陷从「代码必然错」变成「配置正确才对」。
  3. 把部署域名烧进 API 响应：多域名（企业自定义域名、内外网双入口）与移动端指向不同主机时必然错一个。
  4. `X-Forwarded-Host` 来自客户端，未加白名单时等于把响应里的地址交给不可信输入，引入 cache poisoning
     面（响应体地址会被前端当作请求目标）。
  5. 需要改全局 Web 配置，影响面远超本缺陷（所有控制器、日志、审计），违反「最小修复」。

### 3.3 候选 C：后端不动，前端归一化

前端收到绝对地址后剥掉 origin 再按自身 origin 重拼。

- 否决理由：缺陷在服务端契约，前端只是受害方；web / mobile / 仓库外第三方各写一遍归一化，是 1→N 的重复补丁；
  `parseStorageDownloadUrl` 已经证明前端本来就按相对路径设计，再让它兜底等于默认服务端契约是错的。
  另外 mobile 的 PROXY 分支根本不读这个字段，改它没有任何收益。

### 3.4 结论

**选 A。** 只改 `StorageController` 的一处 URL 构造：把
`ServletUriComponentsBuilder.fromCurrentContextPath().path("/api/storage/download")` 换成
`UriComponentsBuilder.fromPath("/api/storage/download")`，查询参数顺序与 `.encode().toUriString()` 全部保留。
`ServletUriComponentsBuilder` 的导入必须保留——签名分享接口（`createSignedDownload`）仍在使用它，且**不改其行为**。

## 4. 接口契约

### 4.1 `GET /api/storage/download-location` — `mode=PROXY`

```json
{
  "code": "0",
  "data": [
    {
      "fileId": "file-1",
      "fileName": "avatar.png",
      "mode": "PROXY",
      "url": "/api/storage/download?fileId=file-1"
    }
  ]
}
```

约束（逐条可断言）：

1. `url` 恒以 `/api/storage/download?` 开头；
2. `url` 不含 `://`、不以 `//` 开头、不含 host/port/context-path；
3. 查询参数顺序固定：`fileId` → `filename`（仅按 `fileId` 单文件解析且调用方显式传了 `filename` 时）→ `variant`（有值时）；
4. 参数值按 UTF-8 百分号编码，`合同.pdf` ⇒ `%E5%90%88%E5%90%8C.pdf`；
5. 按业务归属批量解析时仍按预览语义处理：不带 `filename`（保持今天的既有语义，不放宽）；
6. `Cache-Control` 仍为 `private, max-age=<storage.download.location-max-age-seconds>`（默认 60）。

示例：

| 场景 | `url` |
| --- | --- |
| 单文件预览 | `/api/storage/download?fileId=file-1` |
| 单文件预览 + 缩略图 | `/api/storage/download?fileId=file-1&variant=thumb` |
| 单文件下载（带中文名） | `/api/storage/download?fileId=file-1&filename=%E5%90%88%E5%90%8C.pdf` |
| 按业务归属（`variant=thumb`） | `/api/storage/download?fileId=file-1&variant=thumb` |

### 4.2 `mode=DIRECT` 与 `POST /api/storage/generate-signed-url`（均不变）

- `DIRECT.url`：对象存储预签名直链，绝对地址，带签名与有效期，客户端**不附加** `Authorization`。
- 签名分享 `url`：绝对地址
  `http://<当前请求上下文>/api/storage/download-signed?fileId=...&filename=...&expireAt=...&maxDownloadCount=...&signature=...`，
  **本次一个字符都不改**（`StorageControllerTest#shouldReturnSignedDownloadUrl` 第 175 行原样保留）。

### 4.3 不变量清单（验收逐条核对）

1. `mode` 取值集合仍为 `DIRECT` / `PROXY`，`expiresAtEpochSecond` 仍仅 DIRECT 有值。
2. 响应恒为数组；定位方式（`fileId` 或 `sourceEntity`+`sourceId`）与 `24027` 错误码不变。
3. 权限码 `STORAGE_FILE_QUERY` 不变（`shouldDeclarePermissionOnDownloadLocation` 必须继续绿）。
4. `/api/storage/download` 端点本身、鉴权、ETag / 条件请求 / `Content-Disposition` 全部不变。
5. `download-location` 的缓存头不变。

## 5. 任务拆分

按测试 T、后端 B、前端 F、文档 D 四类给出；每条都有输入、产出文件、可验证完成判据。

### T1（RED）后端契约断言改为相对路径，并观察失败

- **输入**：§4.1 契约；`nebula-storage/nebula-storage-local/src/test/java/cn/cloudomni/nebula/storage/controller/StorageControllerTest.java`。
- **产出文件**：同上（只改这一个测试文件）。
- **具体改动**：
  1. `shouldReturnProxyDownloadLocationWithContextUrl`（第 354-366 行）**改名**为
     `shouldReturnProxyDownloadLocationAsSameOriginPath`，断言改为
     `jsonPath("$.data[0].url").value("/api/storage/download?fileId=file-1")`（完整字符串相等，不得用 `contains`）。
  2. `shouldResolveDownloadLocationsByBusinessSource`（第 387-420 行）第 411 行断言改为
     `jsonPath("$.data[0].url").value("/api/storage/download?fileId=file-1&variant=thumb")`；
     第 413 行 `DIRECT` 的绝对直链断言**保持不动**。
  3. **新增** `shouldReturnProxyLocationWithoutHostEvenBehindProxyHeaders`：请求头带
     `Host: api.example.com`、`X-Forwarded-Proto: https`、`X-Forwarded-Host: api.example.com`，
     断言 `url` 仍是 `/api/storage/download?fileId=file-1`（证明实现不再读请求上下文，也不会被伪造头带偏）。
  4. **新增** `shouldEncodeFilenameAndVariantInProxyLocation`：`fileId=file-1&filename=合同.pdf&variant=thumb`，
     断言 `url` 为 `/api/storage/download?fileId=file-1&filename=%E5%90%88%E5%90%8C.pdf&variant=thumb`（§2.5 实测值）。
- **禁止**（硬性）：不改 `shouldReturnSignedDownloadUrl`（第 158-176 行）、不改
  `shouldPassThroughDirectDownloadLocation`（第 368-385 行）、不改 `shouldCacheDownloadLocationPrivately`。
  它们分别是「分享链接仍绝对」「DIRECT 仍绝对」「缓存头不变」的守门用例。
- **可验证完成判据**：运行
  `mvn -o -pl nebula-storage/nebula-storage-local test -Dtest=StorageControllerTest -DfailIfNoTests=false`
  后**失败 4 条**（2 条改名后的旧断言 + 2 条新增），失败原因全部是「期望相对路径、实际 `http://localhost/...`」，
  且 `shouldReturnSignedDownloadUrl`、`shouldPassThroughDirectDownloadLocation` **仍然通过**。
  把该次失败的 surefire 摘要作为 TDD 红灯证据留在提交说明或 PR 描述里。

### B1（GREEN）控制层改为同源相对路径

- **输入**：T1 的红灯；§3.4 结论。
- **产出文件**：`nebula-storage/nebula-storage-local/src/main/java/cn/cloudomni/nebula/storage/controller/StorageController.java`。
- **具体改动**：
  1. `resolveDownloadLocation` 循环体内的构造改成
     `UriComponentsBuilder.fromPath("/api/storage/download").queryParam("fileId", dto.getFileId())`，
     其余（`singleFile && hasText(filename)`、`variant` 两个 `queryParam` 与 `.encode().toUriString()`）原样保留。
  2. 新增 import `org.springframework.web.util.UriComponentsBuilder`；
     **保留** `ServletUriComponentsBuilder` import（签名分享仍用），按 `docs/spec/11-development.md` §1.2 分组排序。
  3. 把「代理地址按当前请求上下文补全，让客户端无需感知网关前缀」的注释改为
     「代理地址返回同源相对路径：客户端按自身 origin / baseURL 解析，服务端不猜客户端看到的 host 与协议」。
  4. `@Operation` 描述里的「否则返回服务端代理地址」补明「（同源相对路径，需带 `Authorization` 以 blob 方式获取）」。
  5. 一并修正 `StorageServiceImpl#resolveDownloadLocation` 的注释：
     「地址由控制层按当前请求上下文补全，服务层不感知 Web 上下文」→「地址由控制层补全为同源相对路径」。
     **只改注释，不改任何语句**（`StorageServiceImpl` 方法体零改动）。
- **可验证完成判据**：T1 的 4 条用例转绿；`shouldReturnSignedDownloadUrl`、`shouldPassThroughDirectDownloadLocation`
  仍然绿且**其断言未被修改**（`git diff` 中这两段不出现）。

### B2（同批）响应字段 OpenAPI 文案与示例对齐契约

- **输入**：§4.1 / §4.2。
- **产出文件**：`nebula-storage/nebula-storage-local/src/main/java/cn/cloudomni/nebula/storage/model/resp/StorageDownloadLocationResp.java`。
- **具体改动**：`url` 字段的 `@Schema` 描述改为「DIRECT 为对象存储临时直链（绝对地址）；PROXY 为同源相对路径
  `/api/storage/download?...`」，并补 `example = "/api/storage/download?fileId=file-abc123"`；类注释同步一句。
  符合 `docs/spec/06-api-design.md` §2.3「Resp 字段必须有 description + example」。
- **可验证完成判据**：`StorageControllerTest` 全绿（`@Schema` 不参与序列化，断言不受影响）；
  用 `grep` 确认该类不再残留「PROXY 为服务端下载地址」而不提相对路径的旧文案。

### F0 前端（无实现任务，明确说明原因）

- **结论：web / mobile / `packages/client-sdk` 生产代码零改动。**
- 原因（逐条，已在 §2.2 核对）：
  1. `web/src/api/storage.ts#downloadFile` 与 `use-storage-preview-url.ts` 都是把 `location.url` 原样交给自家
     axios `request`，相对路径经 `baseURL`（默认同源）解析；`parseStorageDownloadUrl` 用
     `new URL(downloadUrl, 'http://nebula.local')` 兜底解析，两种形态都工作。
  2. `web/src/api/storage.test.ts` 与 `avatar-preview.test.tsx` 早已把 PROXY 响应 mock 成
     `'/api/storage/download?fileId=...'` —— 前端假设本来就是相对路径，本次是让后端追上该假设。
  3. `mobile/src/storage/authenticated-image.ts` 的 PROXY 分支**不读** `location.url`（自建
     `STORAGE_ENDPOINTS.download` + `params`），相对/绝对都不影响。
  4. `packages/client-sdk` 只有路径常量，不解析 url。
- **仍要做的事（回归，不是改代码）**：跑 §6 步 6、7 的前端与移动端目标测试，证明「接口形态变化不破坏现有消费方」。
- **可验证完成判据**：`git diff --stat` 中 `web/`、`mobile/`、`packages/` 无改动；对应测试全绿。

### D1 文档与变更记录

- **输入**：§4 契约。
- **产出文件与逐条要求**：

| 文件 | 改动点 | 完成判据 |
| --- | --- | --- |
| `docs/projects/nebula/storage/usage-guide.md` | §5.4「`mode=PROXY`：`GET /api/storage/download?fileId=...`，带 `Authorization`」补明「返回的 `url` 是同源相对路径，调用方按自身 origin 请求」 | 该节出现「同源相对路径」表述，示例只用相对地址 |
| `docs/projects/nebula/storage/business-capabilities.md` | §7.4「`mode=PROXY`：`url` 指回 `/api/storage/download`」补明相对路径语义 | 同上 |
| `docs/projects/nebula/storage/design-and-implementation.md` | §7.4 第 4 步「由控制层按当前请求上下文补全 `/api/storage/download` 地址」改为「补全为同源相对路径 `/api/storage/download?...`」，并写一句理由（服务端不知道客户端 origin；remote 模式下请求上下文是内网地址） | 该书内不再出现「按当前请求上下文补全」的旧表述 |
| `docs/projects/nebula/storage/content-enhancements.md` | §4.2 字段表 `mode` / `url` 两行补明 PROXY 为同源相对路径 | 字段表可看出两种模式地址形态不同 |
| `docs/projects/nebula/release/changelog.md` | `## [Unreleased]` → `### Fixed` 下新增一条：`nebula-storage`：`download-location` 的 PROXY `url` 改为同源相对路径，修复网关/反向代理/remote 模式下返回内网或 `http` 绝对地址导致预览与下载失败；DIRECT 直链与签名分享地址仍为绝对地址 | `[Unreleased]` 的 `### Fixed` 段首条即为该条，含「DIRECT / 签名地址不变」的明确表述 |

- **文档站登记**：**不需要**。本修复没有新增页面、没有新增/改名的规范条目、没有配置键或错误码变化，
  故不修改 `docs/publish/cludix-doc/sidebars/projects/nebula.ts`，也不改各模块 `index.md` 的文档清单。
  `docs/projects/nebula/` 下上述 4 篇既有页面的文案更新会由 `.github/workflows/sync-docs.yml` 自动同步。
- **规范文件**：`docs/spec/` 零改动（理由见 §1.4）。

### T2（回归）全量验证

- **输入**：B1 / B2 / D1 完成。
- **产出文件**：无（只跑命令）；如有必要，仅允许在 `StorageControllerTest` 内新增用例，不得删改守门用例。
- **可验证完成判据**：§6 所有命令通过；`git diff` 复核：`StorageControllerTest` 中
  `shouldReturnSignedDownloadUrl` 与 `shouldPassThroughDirectDownloadLocation` 两段**零改动**，
  `web/` `mobile/` `packages/` 零改动，`docs/spec/` 零改动。

## 6. 执行顺序与验收命令

严格按 TDD 顺序推进，每步跑命令、贴结果，不跳步。

| 步 | 动作 | 命令 | 期望 |
| --- | --- | --- | --- |
| 1 | 记录基线 | `mvn -o -pl nebula-storage/nebula-storage-local test -Dtest=StorageControllerTest -DfailIfNoTests=false` | 通过（改前全绿，已实测） |
| 2 | T1 改断言（RED） | 同上 | **失败 4 条**，全部为「绝对 vs 相对」；签名分享与 DIRECT 用例仍绿 |
| 3 | B1 + B2 实现（GREEN） | 同上 | 全绿 |
| 4 | 后端模块全量 | `mvn -o -pl nebula-storage/nebula-storage-local test` | 全绿（含 `StorageAuditCoverageTest`、`StorageButtonPermissionCoverageTest`、`StorageInternalControllerTest`） |
| 5 | 存储域全量（含 core 下载位置用例） | `mvn -o -pl nebula-storage/nebula-storage-core,nebula-storage/nebula-storage-remote,nebula-storage/nebula-storage-local test` | 全绿 |
| 6 | 前端回归 | `cd web && pnpm vitest run src/api/storage.test.ts src/hooks/use-storage-preview-url.test.tsx src/pages/profile/info/avatar-preview.test.tsx` | 全绿（三个文件均已确认存在且基线绿） |
| 7 | 移动端回归 | `cd mobile && node --test "test/authenticated-image.test.ts"` | 3 passed |
| 8 | 字面检查（防走回头路） | `grep -n "fromCurrentContextPath" nebula-storage/nebula-storage-local/src/main/java/cn/cloudomni/nebula/storage/controller/StorageController.java` | 只剩签名分享一处（`createSignedDownload`），`resolveDownloadLocation` 内不再出现 |
| 9 | 守门用例未被改 | `git diff -U0 -- nebula-storage/nebula-storage-local/src/test/java/cn/cloudomni/nebula/storage/controller/StorageControllerTest.java` | diff 不触及 `shouldReturnSignedDownloadUrl` / `shouldPassThroughDirectDownloadLocation` |
| 10 | 改动面检查 | `git status --porcelain` | 文件集合恰好 = `StorageController.java`、`StorageDownloadLocationResp.java`、`StorageServiceImpl.java`（仅注释）、`StorageControllerTest.java`、`docs/plan/storage-proxy-relative-download-url.md`，以及 §5 D1 的 5 个文档 |

命令说明：`-o` 离线、`-pl` 单模块、`-DfailIfNoTests=false` 避免依赖模块因无匹配用例而报错；
若本机离线仓库缺依赖，去掉 `-o` 并先执行
`mvn -q -pl nebula-storage/nebula-storage-local -am -DskipTests install`。

## 7. 风险与回滚

| 编号 | 风险 | 影响 | 缓解 / 处置 |
| --- | --- | --- | --- |
| R1 | 未来出现「前端与 API 不同源」部署（SPA 独立静态托管 + 独立 API 域名） | 相对路径会被解析到 SPA 域名，PROXY 预览/下载 404 | 当前所有已知部署同源（dev 走 vite `/api` 代理；网关同端口转发 `/api/storage/**` 且托管前端）；且 web 消费方把 url 交给 axios，`baseURL` 可在一处改；真出现跨域需求属于新的部署改造，不在本次范围。**已如实记录为已知前提** |
| R2 | 仓库外第三方把 PROXY `url` 直接粘到浏览器地址栏或发到别的域 | 该用法失效 | 分享场景应走 `generate-signed-url`（绝对地址，本次不变），文档已明确分工；changelog 标注该行为变化 |
| R3 | 编码差异导致中文文件名查询串变化 | 下载文件名错乱 | §2.5 已用本仓库 Spring 版本实测：编码结果与今天逐字一致；T1 用完整字符串断言锁定 |
| R4 | 客户端持有旧的绝对地址缓存 | 最长 60 秒内继续用旧值 | 缓存本来就是 `private, max-age=60`，过期自然收敛；不改缓存策略 |
| R5 | 有人顺手「统一改成相对」把签名分享也改了 | 分享链接对外不可用 | §1.4 硬性禁止 + §6 步 8/9 两条检查（`fromCurrentContextPath` 仍需存在于签名方法、守门用例零 diff） |
| R6 | 有人为让红灯变绿去改签名/直链断言 | 缺陷被掩盖、契约漂移 | 评审以 `git diff` 中这两段是否干净为准；判据写在 T2 |

**回滚**：改动集中在 3 个 Java 文件（其中 2 处仅注释/注解）+ 测试 + 文档，不含 DDL、配置键、数据迁移。
回滚方式为 `git revert <commit>`（或 `git checkout -- <上述文件>`），随后重跑 §6 步 1 命令确认回到基线绿；
无需数据修复，无外部状态残留。

## 8. 待确认

1. **仓库外调用方**：是否有第三方按「绝对地址」消费 `download-location` 的 PROXY `url`？仓库内无此类用法
   （§2.2 已核对）。按 `changelog` 既有做法先记为行为变更；若确认存在外部依赖，再评估是否补配置开关
   （默认关闭、不改变本次契约）。
2. **是否接受 R1 的前提**（前端与 API 同源）。本计划按「接受」执行；若后续规划独立 API 域名，应改由前端
   `baseURL` 统一承接，而不是把 host 塞回响应体。
