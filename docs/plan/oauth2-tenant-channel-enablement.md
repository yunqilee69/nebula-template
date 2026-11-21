# 企业 OAuth2 渠道生效可见性修复计划

## 1. 背景与目标

用户反馈：企业设置中已填写微信小程序 AppID、AppSecret 并「启用微信登录」，但 `GET /api/frontend/init` 返回的 `loginConfig` 中 `wechatMiniEnabled=false`。

现场响应关键字段：`oauth2Enabled=true`、`wechatEnabled=true`、`wechatMiniEnabled=false`、`wechatWebEnabled=false`、`tenantEnabled=false`。

### 已确认的判定链事实

`wechatMiniEnabled` 只有一处计算点 `LoginServiceImpl#getAuthConfig`（`nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/LoginServiceImpl.java:826-838`），逻辑为四重门：

1. 门1 `login.oauth2.enabled`（系统参数）
2. 门2 `login.oauth2.provider.wechat.enabled`（系统参数，默认 `false`，见 `SystemParamDefinitions.java:55-56`）
3. 门3 `providerRegistrar.hasProvider("wechat")`：`wechatOAuth2ProviderClient` 在 `WechatOAuth2AutoConfiguration.java:68-76` 无条件注册，无 `@ConditionalOnProperty`
4. 门4 `isChannelAvailable("mini")`：`WechatOAuth2ProviderClient.java:99-107` → `resolveMini()`（同文件 `:373-391`）→ `TenantOAuth2ProviderConfigResolver.resolve(...)`（`TenantOAuth2ProviderConfigResolver.java:36-69`）

依据现场响应，门1、门2 已通过；门3 代码上无条件装配；因此问题必在门4。

### 门4 失败的机制（已确认）

单租户模式下 `TenantOAuth2ProviderConfigResolver.java:48-53` 只有两条路得到 null：

- `entity == null` → 返回 `null` → 回退 YAML；而 YAML `NEBULA_AUTH_WECHAT_MINI_APP_ID` / `NEBULA_AUTH_WECHAT_WEB_APP_ID` 默认为空串（`nebula-app/nebula-app-runner/src/main/resources/application.yml:132-142`），`miniFrom()`/`webFrom()` 判空后返回 null；
- `entity.enabled != TRUE` → 返回 `disabled()` → `OAuth2ProviderSettings.isComplete()`（`OAuth2ProviderSettings.java:22-25`）为 false → 返回 null。

记录读取链无任何缓存（`TenantOAuth2ProviderDao` 无 `@Cacheable`、MyBatis-Plus 二级缓存未开启、`getAuthConfig` 无缓存注解），故可排除「保存后读到旧值」。

### 已确认的 8 项缺陷

1. **生效状态不可观测**：`wechatWebEnabled` 与 `wechatMiniEnabled` 共用 `wechatUsable` 短路合并（`LoginServiceImpl.java:830-838`），响应无法区分「记录不存在 / 记录未启用 / 凭据不完整 / 全局开关未开」，排障只能翻代码。
2. **全局前提无提示**：企业设置页 Alert 只讲「按租户隔离、密钥加密」（`web/src/pages/tenant/settings/oauth-providers.tsx:96-102`），未提「系统参数两个开关必须同时为 true」。
3. **渠道默认值与语义不清**：新增时渠道默认 `web`（`web/src/pages/tenant/settings/oauth-provider-form-helpers.ts:62`），选「微信」不自动切小程序；且一条记录只对应一个渠道，用户易误以为配了 WEB 就覆盖了小程序。
4. **禁用记录静默锁死渠道**：`enabled=false` 时前端必填校验全部关闭（`oauth-provider-form-helpers.ts:194-195`），只填 AppID/AppSecret 即可保存；而单租户下「有记录即不回退 YAML」（`TenantOAuth2ProviderConfigResolver.java:48-53`），该记录会让渠道彻底不可用，UI 无任何警告。
5. **列表页无法自证生效性**：表格只有 Provider/渠道/启用/Client ID/Client Secret/回调地址（`oauth-providers.tsx:61-70`），看不到 MINI 的 3 个端点，无「凭据是否完整」指示；「回调地址」列对 MINI 无意义却始终展示；`Client Secret=已配置` 仅判断密文存在（`TenantOAuth2ProviderServiceImpl.java:265`）。
6. **渠道取值大小写不一致（潜在缺陷）**：`WechatOAuth2Controller.java:61` 定义 `MINI_CHANNEL = "mini"` 并以小写直传 DAO `eq(channel, ...)`，而库中统一存大写 `MINI`（写链 `TenantOAuth2ProviderServiceImpl.java:162-167` 归一化为大写），`OAuth2MiniTenantResolverImpl.java:28-36` 无归一化。PostgreSQL 区分大小写，多租户下小程序 AppID 反查租户将匹配不到并返回 `15002`；MySQL `utf8mb4_unicode_ci` 会掩盖该问题。
7. **失败无日志**：`getAuthConfig` 对各门无任何诊断日志（不含密钥），线上无法自证。
8. **文档描述与代码不符**：`docs/projects/nebula/auth/configuration.md:270` 表述为「静态 `enabled` 只管『装配不装配』」，但 `wechatOAuth2ProviderClient` 在 `WechatOAuth2AutoConfiguration.java:68-76` 为无条件注册（无 `@ConditionalOnProperty`），该字段实际连「装配」都不控制，仅被启动期 `WechatOAuth2Properties.validate()` 读取且 `enabled=false` 时直接返回。按此文档排查会得出「必须开启 YAML `enabled`」的错误结论。

### 目标

- 企业设置页可直接看出「这条配置当前是否真的生效」及「不生效的具体原因」，无需翻代码。
- 企业设置页显式说明生效前提（系统参数两个开关）与「一条记录只对应一个渠道」。
- 保存禁用记录时给出明确警告，告知该渠道将不可用且不回落系统默认配置。
- 渠道取值大小写归一化，多租户 + PostgreSQL 下小程序登录不再因大小写匹配失败返回 15002。
- `getAuthConfig` 增加不含敏感信息的诊断日志。
- 不改动 `init` 响应契约，不改变既有运行时判定语义。
- 修正 `configuration.md` 中与代码不符的静态 `enabled` 描述，消除「必须开启 YAML 开关才能启用微信登录」的误导。
- 补齐前后端测试、用户文档与变更记录。

### 非目标

- 不改变 `wechatMiniEnabled` / `wechatWebEnabled` 的运行时判定语义与四重门结构。
- 不改变「单租户有记录即不回退 YAML」这一既有设计（`docs/spec/12-multitenancy.md` 已固化）。
- 不允许禁用状态下保存半成品后自动回退 YAML（会削弱多租户凭据隔离）。
- 不新增 OAuth Provider，不引入 APP 渠道，不新增第三方依赖。
- 不做数据库表结构变更与数据迁移。
- 不在 `init` 响应中新增字段（避免前端、`packages/client-sdk`、`mobile` 三处契约同步扩散）。
- 不重构整个企业设置页。

## 2. 现状与约束

### 技术栈与关键文件

- **前端**：React 18、TypeScript、Ant Design 6、Vitest、Testing Library；页面目录 `web/src/pages/tenant/settings/`。
- **后端**：Spring Boot、Spring MVC、MyBatis-Plus、JUnit 5、Mockito、AssertJ；企业设置接口 `POST /api/auth/tenant/oauth2-providers`。
- **配置解析**：`TenantOAuth2ProviderConfigResolver` → `OAuth2ProviderSettings` → `WechatOAuth2ProviderClient`。
- **规范**：`docs/spec/06-api-design.md` 要求 Req/Resp 字段有 `@Schema` 描述；`docs/spec/12-multitenancy.md` 要求启用前校验凭据完整性、Secret 永不回显；`docs/spec/08-logging.md` 禁止日志输出密钥。
- **文档**：`docs/projects/nebula/auth/configuration.md`、`docs/projects/nebula/tenant/usage-guide.md`、`docs/projects/nebula/release/changelog.md`。

### 常用命令

```bash
mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local,nebula-auth/nebula-auth-oauth2-provider-wechat -am test
cd web && npm test -- src/pages/tenant/settings/
cd web && npm run typecheck
```

## 3. 技术方案与关键决策

### 3.1 生效状态的可观测性：在设置接口给出「凭据完整性」，不改 init

候选方案：

| 方案 | 做法 | 取舍 |
|---|---|---|
| A | `init.loginConfig` 增加 `wechatMiniReady` 等诊断字段 | 需同步 `web`、`packages/client-sdk`、`mobile` 三处契约与兜底逻辑，扩散面大，且诊断信息对终端用户无意义 |
| **B（推荐）** | `TenantOAuth2ProviderDto` 增加记录级完整性字段，供企业设置页展示 | 只影响设置页与其 types；不触碰 init 契约；不需要跨模块调用 provider client |
| C | 仅加后端日志 | 成本最低但用户仍无法自助定位，不解决本次核心困惑 |

**决策：采用 B + C 组合。**

B 的 `credentialComplete` 由 `TenantOAuth2ProviderServiceImpl#toDto` 本地计算，判定规则与保存期校验（`TenantOAuth2ProviderServiceImpl.java:118-144`）保持一致：

- 公共：`enabled==true` 且 `clientId` 非空 且 `clientSecretCipher` 非空；
- `wechat+MINI` 额外要求 `userinfoUrl`、`tokenUrl`、`configJson` 均非空；
- `wechat+WEB` 额外要求 `redirectUri`、`scope` 均非空；
- `github+WEB` 额外要求 `redirectUri` 非空。

同时返回 `missingFields`（不可用原因的中文标签数组，一般是缺失项；记录未启用时返回 `["未启用"]`），供前端直接渲染。

**关键取舍**：`credentialComplete` 表达的是「这条记录自身是否完整」，**不**代表「运行时是否可用」。后者还叠加系统参数两个开关，属于全局前提。二者在 UI 上分区展示，避免把全局问题误报为记录问题。

C 的做法：在 `LoginServiceImpl#getAuthConfig` 中对四个门各打一条 `debug` 日志（`oauth2Enabled`、`wechatEnabled`、`hasProvider`、`web/mini channelAvailable`），键名固定便于 grep，禁止输出任何密钥或密文。

### 3.2 全局前提提示：静态说明 + 实时状态

企业设置页 Alert 增加生效前提说明，并通过既有接口读取全局开关状态后实时呈现。

- 前提文案固定为：微信登录需同时满足「系统设置 → 高级配置 → 通用配置 → 第三方登录（OAuth2）」中 OAuth2 总开关与微信登录开关为开启，且企业配置记录的「启用」为开启、必填项完整。
- 全局开关状态来源：复用 `GET /api/auth/get-auth-config`（`LoginController.java:141`），读取 `oauth2Enabled` 与 `wechatEnabled`。该接口需登录态，企业设置页满足条件。
- 若全局前提未满足，Alert 转为 `warning` 并列出未满足项；不影响页面其余功能。

### 3.3 「一条记录只对应一个渠道」的显式化

不改默认渠道值（`web` 仍是更常见入口），改为在渠道下拉下方常驻说明，并在选择 `wechat` 时于表单内提示：

> 一个渠道一条配置。「微信 Web」与「微信小程序」需要分别新增配置，互不覆盖。

同时在列表页按 `providerId + channel` 分组呈现（不加新列，只加强渠道列的标识），使「只配了 WEB」这一状态在页面上肉眼可辨。

### 3.4 禁用记录的警告：保留语义，提升可见性

候选方案：

| 方案 | 做法 | 取舍 |
|---|---|---|
| A | 禁用时同样强制校验必填 | 破坏草稿能力，用户无法分段录入 |
| B | 禁用记录不参与解析、回退 YAML | 改变已固化语义，多租户下削弱凭据隔离，有安全风险 |
| **C（推荐）** | 语义不变，保存 `enabled=false` 时二次确认并在列表标记「已停用（该渠道将不可用）」 | 零运行时风险，直击本次用户困惑 |

**决策：采用 C。** 二次确认文案需明确「停用后该渠道立即不可用，且不会回落到系统默认配置」。

### 3.5 渠道取值大小写归一化

候选方案：

| 方案 | 做法 | 取舍 |
|---|---|---|
| A | 在 `WechatOAuth2Controller` 把字面量改成大写 | 只修一处调用方，DAO 仍可被其他调用方以小写误用 |
| B | 在 `TenantOAuth2ProviderDao` 查询条件内统一转大写 | 集中但侵入 DAO 通用逻辑，且大小写不敏感会让 MySQL 的历史脏数据继续被掩盖 |
| **C（推荐）** | 在 `OAuth2MiniTenantResolverImpl` 入口归一化，并让 `WechatOAuth2Controller` 的渠道常量统一引用 `OAuth2LoginParamKeys.CHANNEL_MINI` | 与写链归一化点对称，改动可控，且消除重复字面量 |

**决策：采用 C。** `WechatOAuth2Controller` 的 `WEB_CHANNEL = "WEB"` 同时改为引用 `OAuth2LoginParamKeys.CHANNEL_WEB`，避免同一渠道出现大写/小写两套常量。归一化规则与写链一致：`trim().toUpperCase(Locale.ROOT)`。

## 4. 数据模型与接口契约

### 数据模型

无表结构变更。复用 `auth_tenant_oauth2_provider`（`docs/sql/init/postgresql/01-init-structure.sql:105-125`）。

### 接口契约

`GET /api/auth/tenant/oauth2-providers` 响应项 `TenantOAuth2ProviderDto` 新增两个字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `credentialComplete` | `boolean` | 该条记录凭据是否完整（`enabled` 且该渠道必填项齐全）。`false` 表示该渠道当前不可用 |
| `missingFields` | `string[]` | 不可用原因的中文标签：一般是缺失项的中文标签，如 `["AppSecret","jscode2session 地址"]`；`credentialComplete=true` 时为空数组 |

> 注意：记录 `enabled=false` 时返回固定值 `["未启用"]`，表示该渠道因未启用而不可用；其余情况返回缺失字段的中文标签。

- 两个字段均需 `@Schema(description = ...)`。
- 响应向后兼容：仅新增字段，不修改既有字段语义。
- `POST` 请求契约不变。
- `init` 响应契约不变。
- 前端类型同步位置：`web/src/api/tenant-oauth.ts` 中对应响应类型。

## 5. 任务拆分

### 后端任务 B1：DTO 与完整性计算

- 输入：第 3.1 节的判定规则表。
- 产出：`TenantOAuth2ProviderDto` 增加 `credentialComplete`、`missingFields`（含 `@Schema`）；`TenantOAuth2ProviderServiceImpl#toDto` 实现计算；新增私有方法 `computeMissingFields`，复用与保存期一致的标签常量（避免两处文案漂移）。
- 完成判据：`mvn -pl nebula-auth/nebula-auth-core -am test -Dtest=TenantOAuth2ProviderServiceImplTest` 通过；测试覆盖 `wechat+MINI` 完整/缺 `userinfoUrl`/缺 `tokenUrl`/缺 `configJson`/`enabled=false` 五种情形，断言 `credentialComplete` 与 `missingFields` 内容。

### 后端任务 B2：保存期校验文案复用

- 输入：B1 的标签常量。
- 产出：`TenantOAuth2ProviderServiceImpl#validateEnabledCompleteness` 改用同一组标签常量，保证「保存报错文案」与「列表缺失项文案」一致。
- 完成判据：B1 的测试仍通过，且新增一条断言：缺 `configJson` 时抛出的 `BusinessException` 消息包含与 `missingFields` 相同的标签文本。

### 后端任务 B3：渠道取值归一化

- 输入：第 3.5 节决策。
- 产出：`OAuth2MiniTenantResolverImpl` 入口对 `channel` 做 `trim().toUpperCase(Locale.ROOT)`；`WechatOAuth2Controller` 的 `MINI_CHANNEL`/`WEB_CHANNEL` 改为引用 `OAuth2LoginParamKeys.CHANNEL_MINI`/`CHANNEL_WEB`。
- 完成判据：`OAuth2MiniTenantResolverImplTest` 新增用例——传入 `"mini"` 与 `"MINI"` 时 DAO 收到的 `channel` 参数均为 `"MINI"`；`WechatOAuth2ControllerTest` 现有断言更新为新常量且通过。

### 后端任务 B4：诊断日志

- 输入：第 3.1 节 C 项。
- 产出：`LoginServiceImpl#getAuthConfig` 增加一条聚合 `debug` 日志，包含 `oauth2Enabled`、`wechatEnabled`、`hasWechatProvider`、`wechatWebAvailable`、`wechatMiniAvailable` 五个布尔值。
- 完成判据：`LoginServiceImplTest` 通过；用 `grep` 确认该日志调用不含 `secret`、`cipher`、`clientSecret` 字样。

### 前端任务 F1：类型与数据映射

- 输入：第 4 节契约。
- 产出：`web/src/api/tenant-oauth.ts` 响应类型增加 `credentialComplete: boolean`、`missingFields: string[]`。
- 完成判据：`cd web && npm run typecheck` 通过。

### 前端任务 F2：Alert 前提说明与全局状态

- 输入：第 3.2 节。
- 产出：`web/src/pages/tenant/settings/oauth-providers.tsx` Alert 改造，新增前提文案与全局开关状态展示；新增数据获取逻辑调用 `GET /api/auth/get-auth-config`。
- 完成判据：新增 `oauth-providers.test.tsx` 用例——mock 全局开关为 `false` 时渲染出 warning 与未满足项文案；为 `true` 时不出现 warning。

### 前端任务 F3：列表「凭据状态」列与渠道标识

- 输入：第 3.3、3.4 节与第 4 节字段。
- 产出：`oauth-providers.tsx` 表格新增「凭据状态」列，`credentialComplete=true` 显示启用色 Tag「完整」，`false` 显示错误色 Tag「不可用」并在 Tooltip 中列出 `missingFields`；「回调地址」列在 `channel=MINI` 时显示 `-`；「渠道」列文案明确为「微信 - 小程序」/「微信 - Web」。
- 完成判据：`oauth-providers.test.tsx` 覆盖——`MINI` 记录渲染「小程序」且回调列显示 `-`；`credentialComplete=false` 渲染「不可用」且 Tooltip 含缺失项。

### 前端任务 F4：表单渠道说明与停用二次确认

- 输入：第 3.3、3.4 节。
- 产出：`web/src/pages/tenant/settings/oauth-provider-form.tsx` 渠道字段下方常驻说明；新增提交前拦截——当 `enabled===false` 且该记录原为启用时，弹出二次确认，文案明确「停用后该渠道立即不可用且不回落系统默认配置」。
- 完成判据：`oauth-provider-form` 相关测试新增两条用例——`enabled=false` 提交需确认后才调用接口；取消确认时不调用接口。`npm run typecheck` 通过。

### 文档任务 D1：配置文档

- 输入：第 3.1、3.2、3.5 节，以及第 10.3 节实测结论。
- 产出：`docs/projects/nebula/auth/configuration.md` 的 §3.4（运行时开关，268-278 行）与 §3.5（YAML 兜底矩阵，279-306 行）补充：企业记录「启用」与全局开关的双重前提、禁用记录会导致该渠道不可用且不回落 YAML、`credentialComplete` 的字段含义；并修正 §3.4 中「静态 `enabled` 只管『装配不装配』」的错误表述——该 provider 为无条件注册（`WechatOAuth2AutoConfiguration.java:68-76`），`WechatOAuth2Properties.enabled` 仅被启动期 `validate()` 读取且 `enabled=false` 时直接返回，对运行时可用性无影响，实际生效前提是企业记录可读且凭据完整。
- 完成判据：文档内「生效条件」可被完整复述为四重门，且与 `LoginServiceImpl.java:826-838` 一致；§3.4 不再出现「静态 enabled 决定装配」的表述，结论与第 10.3 节实测一致。

### 文档任务 D2：租户使用指南

- 输入：第 3.3、3.4 节。
- 产出：`docs/projects/nebula/tenant/usage-guide.md` §5.3（222 行起）补充「一个渠道一条配置」「启用开关与必填项」「停用后果」三条说明。
- 完成判据：按文档步骤可在设置页走通小程序渠道配置且在列表中看到「完整」。

### 文档任务 D3：变更记录

- 输入：全部改动。
- 产出：`docs/projects/nebula/release/changelog.md` 的 `[Unreleased]` → `### Fixed`（37 行起）新增一条，格式沿用现有 `- \`模块\` / \`模块\`：**结论**。此前…本次…`。
- 完成判据：条目存在且描述了大小写归一化修复与新字段。

### 测试任务 T1：后端回归

- 输入：B1–B4。
- 产出：`TenantOAuth2ProviderServiceImplTest`、`TenantOAuth2ProviderConfigResolverTest`、`OAuth2MiniTenantResolverImplTest`、`WechatOAuth2ControllerTest`、`LoginServiceImplTest` 的增补用例。另含 `WechatOAuth2YamlConfigIndependenceTest`（由早期探针转正的回归测试，锁定 YAML 静态配置与渠道可用性无关）。
- 完成判据：`mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local,nebula-auth/nebula-auth-oauth2-provider-wechat -am test` 全绿。

### 测试任务 T2：前端回归

- 输入：F1–F4。
- 产出：`web/src/pages/tenant/settings/` 下测试文件增补用例。
- 完成判据：`cd web && npm test -- src/pages/tenant/settings/` 全绿；`npm run typecheck` 通过。

### 测试任务 T3：手工验收脚本

- 输入：全部。
- 产出：不新增文件；在计划文档第 7.2 节固化可复现步骤（已包含）。
- 完成判据：按第 7.2 节步骤操作，各步骤现象与预期一致。

## 6. 执行顺序与依赖

1. B1 → B2（B2 依赖 B1 的标签常量）
2. B3、B4 独立，可与 B1 并行
3. F1 依赖 B1 的字段定义
4. F2 独立；F3 依赖 F1；F4 独立
5. D1、D2 依赖 B1、B3 定稿；D3 依赖全部
6. T1 依赖 B1–B4；T2 依赖 F1–F4

里程碑：

- M1 后端契约就绪：B1、B2、B3、B4 完成，后端测试全绿
- M2 前端可见性就绪：F1、F2、F3、F4 完成，前端测试与 typecheck 全绿
- M3 交付：D1、D2、D3 完成，手工验收通过

## 7. 测试与验收标准

### 7.1 自动测试命令

```bash
mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-local,nebula-auth/nebula-auth-oauth2-provider-wechat -am test
cd web && npm test -- src/pages/tenant/settings/
cd web && npm run typecheck
```

期望：三条命令退出码均为 0，且无新增 warning 级编译告警。

### 7.2 手工验收步骤

前置：单租户模式（`NEBULA_TENANT_ENABLED=false`），已登录管理员。

1. **全局开关未开时报错可见**
   - 操作：关闭系统参数 `login.oauth2.provider.wechat.enabled`，进入企业设置 → 登录与安全。
   - 预期：Alert 为 warning，文案含「微信登录开关未开启」；列表仍可正常展示。
2. **禁用记录显式标记不可用**
   - 操作：新增 `wechat + MINI` 记录，只填 AppID/AppSecret，关闭「启用」后保存（确认二次弹窗）。
   - 预期：列表该行「凭据状态」显示红色「不可用」，Tooltip 列出缺失的 3 个端点；「渠道」显示「微信 - 小程序」；「回调地址」显示 `-`。
3. **完整性随填写变化**
   - 操作：编辑该记录，打开「启用」并填全 3 个端点后保存。
   - 预期：列表「凭据状态」变为绿色「完整」，缺失项 Tooltip 消失。
4. **init 随之变化**
   - 操作：打开系统参数两个开关后请求 `GET /api/frontend/init`。
   - 预期：`loginConfig.wechatMiniEnabled=true`；`wechatWebEnabled` 仍为 `false`（未配 WEB 渠道）。
5. **大小写归一化**
   - 操作：多租户 + PostgreSQL 环境，配置 `wechat + MINI` 后调用 `POST /api/auth/wechat/mini-login`。
   - 预期：不再返回 `15002`；日志中 DAO 查询的 channel 参数为 `MINI`。

### 7.3 不可验证表述禁止项

本计划的验收判据均为可执行命令或可观察现象。禁止以「代码质量良好」「提示更友好」作为完成依据。

## 8. 风险与回滚

| 风险 | 影响 | 缓解 | 回滚 |
|---|---|---|---|
| 新增 DTO 字段导致前端旧版本类型不匹配 | 低：仅新增字段，旧前端忽略未知字段 | 字段全部可选缺省为 `false`/`[]` | 前端回滚对应提交 |
| `credentialComplete` 与保存期校验规则漂移 | 中：用户看到「完整」但保存被拒 | B2 强制复用同一组标签常量，测试断言两处一致 | 回滚 B2 |
| 停用二次确认打断既有自动化脚本 | 低：仅 UI 层 | 确认弹窗仅在「由启用改为停用」时出现 | 回滚 F4 |
| 渠道归一化改变 DAO 入参 | 中：若存在小写历史脏数据，归一化后反而查不到 | 归一化为大写与写链一致，历史小写数据本就无法被写链产生；升级说明在 D3 中注明 | 回滚 B3 |
| 设置页新增一次全局配置请求 | 低：多一次请求 | 复用既有接口，无新端点 | 回滚 F2 |
| 诊断日志泄漏敏感信息 | 高 | 仅输出 5 个布尔值，测试用 `grep` 校验无 secret 字样 | 回滚 B4 |

整体回滚方式：按任务粒度回退对应提交，B1 的 DTO 字段为纯新增，回退不影响数据。

## 9. 引用核对记录

核对基准：仓库当前代码（`master`，HEAD `30cc34d9`），逐条读取被引用文件的指定行区间并与正文描述比对。

### 9.1 修正项

| 引用位置 | 正文原行号 | 代码事实 | 处理 |
|---|---|---|---|
| `web/src/pages/tenant/settings/oauth-provider-form-helpers.ts`（缺陷 4「`enabled=false` 时前端必填校验全部关闭」） | `195-196` | 196 行为空行；实际逻辑是 194 行 `if (key === 'clientSecret') return context.enabled && !context.hasStoredSecret;` 与 195 行 `if (!context.enabled) return false;` | 改为 **`194-195`** |

除上表一处外，其余「文件路径:行号」引用与当前代码一致，未作改动。

### 9.2 核对通过（未改动）的引用

| 引用 | 区间首行内容 | 结论 |
|---|---|---|
| `LoginServiceImpl.java:826-838` | `dto.setOauth2Enabled(...)` … `.isChannelAvailable(CHANNEL_MINI));` | `getAuthConfig` 内 OAuth2 计算区间；`setWechatMiniEnabled` 全仓唯一计算点 |
| `LoginServiceImpl.java:830-838` | `boolean wechatUsable = ...` | 共用 `wechatUsable` 短路合并 |
| `SystemParamDefinitions.java:55-56` | `define("login.oauth2.provider.wechat.enabled", ...` | 微信登录开关默认 `false` |
| `WechatOAuth2AutoConfiguration.java:68-76` | `@Bean public OAuth2ProviderClient wechatOAuth2ProviderClient(...)` | 无条件装配，无 `@ConditionalOnProperty` |
| `WechatOAuth2ProviderClient.java:99-107` | `public boolean isChannelAvailable(String channel)` | 门4 入口 |
| `WechatOAuth2ProviderClient.java:373-391` | `private MiniConfig resolveMini()` | 完整方法体 |
| `TenantOAuth2ProviderConfigResolver.java:36-69` | `@Override public OAuth2ProviderSettings resolve(...)` | 完整方法体 |
| `TenantOAuth2ProviderConfigResolver.java:48-53` | `if (entity == null) {` | `entity==null` 与 `enabled!=TRUE` 两条空/禁用路径 |
| `application.yml:132-142` | `wechat:` … `frontend-callback-uri: .../login/wechat-callback}` | 该区块内 136/139 行即 MINI/WEB AppID 的空串默认值 |
| `OAuth2ProviderSettings.java:22-25` | `public boolean isComplete()` | `enabled && clientId && clientSecret` |
| `oauth-providers.tsx:96-102` | `<Alert` … `/>` | 仅讲租户隔离与加密的 Alert |
| `oauth-providers.tsx:61-70` | `{ title: 'Provider', ... }` … `{ title: '回调地址', ... }` | 6 列表格定义，无「凭据状态」列 |
| `oauth-provider-form-helpers.ts:62` | `export const DEFAULT_CHANNEL: TenantOAuth2Channel = 'web';` | 默认渠道为 `web` |
| `TenantOAuth2ProviderServiceImpl.java:265` | `dto.setHasClientSecret(StringUtils.hasText(entity.getClientSecretCipher()));` | 仅判断密文存在 |
| `TenantOAuth2ProviderServiceImpl.java:162-167` | `private String normalizeChannel(String channel)` | 写链归一化为大写 |
| `TenantOAuth2ProviderServiceImpl.java:118-144` | `private void validateEnabledCompleteness(...)` | 保存期必填校验（含 MINI 三端点、WEB 回调与 Scope） |
| `WechatOAuth2Controller.java:61` | `private static final String MINI_CHANNEL = "mini";` | 小写字面量（`WEB_CHANNEL = "WEB"` 在 64 行） |
| `OAuth2MiniTenantResolverImpl.java:28-36` | `public String resolveTenantId(...)` … `listEnabledByClientId(providerId, channel, appId.trim())` | 入口到 DAO 调用，全程无归一化 |
| `LoginController.java:141` | `public ApiResult<AuthInitResp> getAuthConfig()` | 类级 `@RequestMapping("/api/auth")` + `@GetMapping("/get-auth-config")` |
| `01-init-structure.sql:105-125` | `CREATE TABLE IF NOT EXISTS auth_tenant_oauth2_provider (` … `idx_tenant_oauth2_tenant` | 表结构与索引，无字段变更需求 |
| `docs/projects/nebula/auth/configuration.md` 268-278 / 279-306 | `### 3.4 微信登录运行时开关（系统参数）` / `### 3.5 YAML 是「无企业记录时」的默认配置` | 章节起止行一致（307 行才是分隔符） |
| `docs/projects/nebula/tenant/usage-guide.md` §5.3 | 222 行为 `### 5.3 租户设置与 OAuth` | 一致 |
| `docs/projects/nebula/release/changelog.md` | 12 行 `## [Unreleased]`，37 行 `### Fixed` | 一致 |

### 9.3 同步核对但未涉及行号的代码事实

- `WechatOAuth2Controller` 另有 `WEB_CHANNEL = "WEB"`（`WechatOAuth2Controller.java:64`），与 `OAuth2LoginParamKeys.CHANNEL_WEB = "web"`（`OAuth2LoginParamKeys.java:31`）大小写不同；`OAuth2LoginParamKeys.CHANNEL_MINI = "mini"`（同文件 28 行）。故第 3.5 节决策 C 中「常量统一引用 `OAuth2LoginParamKeys`」成立的前提是 B3 同时落地 `OAuth2MiniTenantResolverImpl` 入口归一化（WEB 侧另有 `TenantOAuth2ProviderConfigResolver#normalizeChannel` 兜底），实施时需两处一起改，不可只改常量。
- `OAuth2MiniTenantResolverImpl` 实际调用的 DAO 方法是 `listEnabledByClientId(providerId, channel, clientId)`（`TenantOAuth2ProviderDao.java:27-35`），其中 `eq(channel, ...)` 在 31 行；缺陷 6 所述「小写直传 DAO」成立。
- 小程序 AppID 反查失败抛 `AuthErrorInfo.OAUTH2_CLIENT_NOT_FOUND`，错误码 `15002`（`AuthErrorInfo.java:201`），与正文描述一致。
- `application.yml` 的 `mybatis-plus` 配置（213-223 行）无 `cache-enabled`，即二级缓存未开启，与「记录读取链无缓存」的推论一致。
- 计划涉及的 5 个后端测试文件（`TenantOAuth2ProviderServiceImplTest`、`TenantOAuth2ProviderConfigResolverTest`、`OAuth2MiniTenantResolverImplTest`、`WechatOAuth2ControllerTest`、`LoginServiceImplTest`）与 5 个前端文件（`oauth-providers.tsx`、`oauth-providers.test.tsx`、`oauth-provider-form.tsx`、`oauth-provider-form-helpers.ts`、`oauth-provider-form-helpers.test.ts`）均存在，`nebula-auth-local` 模块存在，第 7.1 节 Maven 模块坐标可用。

## 10. 实测验证记录：YAML 静态配置不是生效前提

### 10.1 验证动机

现场反馈一度假设「单租户未在 `application.yml` 配置 `providers.wechat.mini.*`，且未设置 `providers.wechat.enabled=true`」是 `wechatMiniEnabled=false` 的根因。该假设会导向错误的修复方向（去改 YAML），必须先以可执行测试证伪或证实。

### 10.2 回归测试与命令

回归测试：`nebula-auth/nebula-auth-oauth2-provider-wechat/src/test/java/cn/cloudomni/nebula/auth/oauth2/wechat/provider/WechatOAuth2YamlConfigIndependenceTest.java`

执行命令：

```bash
mvn -pl nebula-auth/nebula-auth-oauth2-provider-wechat -am test -Dtest=WechatOAuth2YamlConfigIndependenceTest -Dsurefire.failIfNoSpecifiedTests=false
```

> 注意：使用 `-am` 时必须追加 `-Dsurefire.failIfNoSpecifiedTests=false`，否则上游模块因无匹配测试而报 surefire 错误。此参数问题不是代码缺陷。

该测试已转正为正式回归测试，不再删除。实测结果：`Tests run: 3, Failures: 0, Errors: 0, Skipped: 0`，`BUILD SUCCESS`。

### 10.3 实测结论

测试前提：`nebula.auth.oauth2.providers.wechat.enabled=false`，`mini.app-id`/`mini.app-secret`/`web.app-id`/`web.app-secret` 均为 `null`。

| 场景 | `isChannelAvailable("mini")` | 结论 |
|---|---|---|
| YAML 全空 + 企业记录完整（`enabled=true` 且有 `clientId`/`clientSecret`） | `true` | YAML 不配也能用 |
| YAML 全空 + 无企业记录（resolver 返回 `null`，回退 YAML） | `false` | 与现场观察一致 |
| YAML 全空 + 企业记录完整，`enabled` 分别取 `false` 与 `true` | `true` / `true` | 该字段与可用性无关 |

由此确认两条事实：

1. **YAML `providers.wechat.mini.*` 不是必要条件**：`resolveMini()`（`WechatOAuth2ProviderClient.java:373-391`）在企业记录完整时走 `settings.isComplete()` 分支，AppID/AppSecret 全部取自企业记录，YAML 的小程序凭据不会被读取。
2. **YAML `providers.wechat.enabled` 与运行时可用性无关**：该字段仅被启动期 `WechatOAuth2Properties.validate()`（`WechatOAuth2Properties.java:56-70`）读取，且 `enabled=false` 时该函数直接返回；`isChannelAvailable`/`resolveMini`/`resolveWeb` 全链路均不读该字段。

### 10.4 对缺陷清单的补充：第 8 项

**8. 文档描述与代码不符，会误导排查方向**：`docs/projects/nebula/auth/configuration.md:270` 表述为「静态 `enabled` 只管『装配不装配』」，但 `wechatOAuth2ProviderClient` 在 `WechatOAuth2AutoConfiguration.java:68-76` 为无条件注册（无 `@ConditionalOnProperty`），该字段实际连「装配」都不控制。按此文档排查会得出「必须开启 YAML `enabled`」的错误结论。

### 10.5 残留判定边界

本节实测覆盖的边界止于「`OAuth2ProviderConfigResolver` 已返回 settings 或 null 之后」。**未**覆盖 resolver 自身为何返回 `null`。因此 `wechatMiniEnabled=false` 的真实落点仍是 `TenantOAuth2ProviderConfigResolver.java:48-54` 的两个 return，对应四种可能：

- 记录不存在；
- 记录 `tenant_id` 与 `nebula.tenant.default-tenant-id` 不一致（`TenantOAuth2ProviderConfigResolver.java:74-83`）；
- 记录 `enabled != true`；
- `client_id` 为空或 `client_secret_cipher` 为空/无法解密。

### 10.6 已确认事项

- 探针测试已转正为正式回归测试 `WechatOAuth2YamlConfigIndependenceTest`，保留在仓库中，用于锁定「YAML 静态配置不是生效前提」这一事实。
- 第 8 项缺陷已纳入第 1 节缺陷清单，并由 D1 任务负责修正 `configuration.md` 中的错误描述。

---

## 11. 范围调整记录

本节记录计划执行中的一次范围收缩，便于后续接手者知道哪些任务做过、哪些已主动放弃，不需要再去读历史对话。

### 11.1 决策：C 类语义问题采纳 C0

第 3.4 节曾就「禁用记录静默锁死渠道」给出三案（A 禁用时强校验必填 / B 禁用记录不参与解析、回退 YAML / C 语义不变只在 UI 层加警告）。评审后又出现一个更彻底的候选：

- **C0（采纳）**：维持现状，**不改任何运行时判定语义**。`TenantOAuth2ProviderConfigResolver.java:48-54` 保持「有记录即不回退 YAML」「`enabled != true` 即该渠道不可用」两条规则不变，只通过文档与列表可见性把后果说明清楚。

采纳理由：这两条规则是多租户凭据隔离的基础。允许「禁用或凭据不全时回退 YAML」意味着任意租户的一条残缺记录就能让请求落到系统级 YAML 凭据上，跨租户复用同一 AppID/AppSecret，与 `docs/spec/12-multitenancy.md` 的隔离要求冲突。因此第 3.4 节的方案 C 也不再落地为二次确认弹窗，改为「语义不动 + 文档与列表把后果说清」。

### 11.2 配置方式变更：改用 YAML，不再使用页面在线配置

用户已决定微信小程序**改用 `application.yml` 的 `nebula.auth.oauth2.providers.wechat.*` 直接配置**，不再通过企业设置页在线维护微信凭据。这一变更直接决定了剩余前端任务的取舍：所有围绕「界面录入的提示与防错」的任务失去价值，而「让不生效的原因可观测」的后端任务仍然有价值（YAML 配置同样会被企业记录覆盖，`configuration.md` §3.6 的判定顺序对两种配置方式都成立）。

### 11.3 已实施

| 编号 | 内容 | 对应第 5 节原任务 |
|---|---|---|
| A1 | 渠道取值大小写归一化（`OAuth2MiniTenantResolverImpl` 入口按 `trim().toUpperCase(Locale.ROOT)` 归一化，`WechatOAuth2Controller` 常量改为引用 `OAuth2LoginParamKeys.CHANNEL_MINI` / `CHANNEL_WEB`） | B3 |
| A2 | `LoginServiceImpl#getAuthConfig` 增加不含敏感信息的聚合诊断日志（5 个判定布尔值） | B4 |
| A3 | 文档修正：`configuration.md` §3.4 改正 `providers.wechat.enabled` 的错误描述，新增 §3.6「三层配置的关系与判定顺序」、§3.7「企业配置记录接口的凭据完整性字段」 | D1（D2「租户使用指南」不在本次范围） |
| B1 | 凭据完整性可见性：`TenantOAuth2ProviderDto` 新增 `credentialComplete` / `missingFields`，与保存期校验同源；前端类型同步并在列表展示「凭据状态」列与渠道标识 | B1 / F1 / F3（列表侧） |

> 行号说明：D1 任务描述里引用的 `configuration.md` 行号（268-278 / 279-306）是改动前的快照。本次改动后 §3.4 与 §3.5 的章节编号与标题未变，只是内容变长、行号整体位移；后续引用一律以**章节编号**（§3.4–§3.7）为准，不再依赖行号。

### 11.4 已移出范围

以下任务全部属于「前端表单改造」，因不再使用页面在线配置而移出本次范围：

- **F2 全局前提提示**（第 3.2 节）：企业设置页 Alert 增加「系统参数两个开关必须同时为 true」文案，并实时读取 `GET /api/auth/get-auth-config` 的 `oauth2Enabled` / `wechatEnabled` 渲染 warning 与未满足项；
- **渠道联动与表单说明**（第 3.3 节）：渠道下拉下方常驻「一个渠道一条配置」说明、选择 Provider 后的渠道联动；
- **F4 停用二次确认**（第 3.4 节方案 C）：由「启用」改为「停用」时的二次确认弹窗与警告文案。

说明：这些任务的方案与文案在第 3.2–3.4 节已经定稿，**若日后恢复页面在线配置，可直接重新启用**，不需要重新设计。当前状态下它们不影响任何已交付能力：`credentialComplete` / `missingFields` 已经把「记录不完整或未启用」暴露在接口与列表上，足够支撑 YAML 配置方式下的排查。

### 11.5 保留产物

- **回归测试** `nebula-auth/nebula-auth-oauth2-provider-wechat/src/test/java/cn/cloudomni/nebula/auth/oauth2/wechat/provider/WechatOAuth2YamlConfigIndependenceTest.java` 保留，**不得删除或跳过**。它锁定第 10 节的核心结论：YAML 静态配置（`providers.wechat.enabled`、`mini.*` / `web.*` 凭据）不是渠道可用性的前提条件。这条结论在「改用 YAML 配置」之后依然是对照基线——它证明的是「YAML 不是必要条件」，与「YAML 可以作为配置来源」并不矛盾。
