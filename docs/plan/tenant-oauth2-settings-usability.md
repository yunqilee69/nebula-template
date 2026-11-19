# 企业 OAuth2 配置易用性与单租户生效改造计划

## 1. 背景与目标

截图对应 `web/src/pages/tenant/settings/oauth-providers.tsx`，目前存在以下已确认问题：

1. 只有 Provider、渠道有必填规则；Client ID、Client Secret、OAuth 回调地址等实际必需字段没有必填标识、错误提示或输入示例。
2. 字段用途没有解释；小程序说明与“扩展配置 JSON”分离，而且提示与真实映射不符：微信小程序的 `userinfoUrl` 对应 `jscode2session`，`tokenUrl` 对应 `access_token`，`configJson` 当前实际承载 `phoneNumberUrl`，不是 JSON 对象。
3. Provider 与渠道没有联动：GitHub 实际只支持 Web，却可选择小程序。
4. `TenantOAuth2ProviderConfigResolver` 在单租户模式直接返回 `null`，所以界面保存的配置不会生效，仍读取 YAML。
5. `frontendCallbackUri` / `frontendCallbackAllowlist` 虽被保存，但 GitHub、微信 Controller 在启动时固定读取 YAML 的前端承接页，企业配置并未真正接管回调跳转。

### 目标

- 表单按 Provider + 渠道展示有效字段、真实必填标识、用途说明、示例和明确校验信息。
- GitHub 仅允许 Web；微信允许 Web、小程序，前后端均拒绝非法组合。
- 单租户读取默认租户企业配置；没有记录时回退 YAML，保证已有部署行为不突变。
- 启用的企业配置完整参与凭据解析和登录后的前端承接页跳转；未配置仍沿用 YAML。
- 保留 Client Secret 加密、不回显及编辑留空保留原值规则。
- 补齐前后端测试、用户文档、规范和变更记录。

### 非目标

- 不新增 OAuth Provider，不引入 APP 渠道，不支持 GitHub 小程序。
- 不重设计整个企业设置页，不更换 React、Ant Design、Spring Boot 等现有技术栈，不新增依赖。
- 不改变系统参数中的 OAuth2 总开关和 Provider 开关语义。
- 不将 `configJson` 泛化成任意 JSON 配置协议；本次按现有实现明确其微信手机号接口用途。
- 不做数据库表结构变更，不迁移或回显 Client Secret。
- 不改造账号绑定专用承接页 `/profile/bind-callback` 的现有逻辑。

## 2. 现状与约束

### 技术栈与关键文件

- 前端：React 18、TypeScript、Ant Design 6、Vitest、Testing Library；页面私用弹窗可放在所属页面目录，样式沿用 Ant Design token 与现有 Tailwind 布局。
- 后端：Spring Boot、Spring MVC、MyBatis、JUnit 5、Mockito、AssertJ；接口为 `POST /api/auth/tenant/oauth2-providers`，请求字段见 `UpsertTenantOAuth2ProviderReq`。
- 配置解析：`TenantOAuth2ProviderConfigResolver` → `OAuth2ProviderSettings` → GitHub/微信 Provider Client。
- 回调 Controller：`GitHubOAuth2Controller`、`WechatOAuth2Controller`。
- 规范：`docs/spec/06-api-design.md` 要求 Req 字段有 `@Schema` 描述；`docs/spec/12-multitenancy.md` 要求启用前校验凭据完整性、Secret 永不回显。
- 文档：用户说明写入 `docs/projects/nebula/tenant/`，重要变更登记 `docs/projects/nebula/release/changelog.md` 的 `[Unreleased]`。

### 常用命令

```bash
cd web && npm test -- src/pages/tenant/settings/oauth-providers.test.tsx
cd web && npm run typecheck
mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-oauth2-provider-github,nebula-auth/nebula-auth-oauth2-provider-wechat -am test
```

## 3. 技术方案与关键决策

### 3.1 表单结构：采用“精简分组 + 条件字段”

候选方案：

- **推荐：单弹窗内按“基本信息 / 授权与回调 / 高级端点”分组**，按 Provider 和渠道显示有效字段，使用现有 `Divider`、`Form.Item`、`Input`、`Select`；无新增组件依赖。
- 三个页签：分隔清晰，但跨页签校验定位和保存流程更复杂。
- 保持全部字段平铺，仅补 tooltip：改动最小，但小程序仍展示大量无效字段，不解决根本问题。

具体表现：

- Provider、渠道并排但保留正常间距，不使用截图中紧贴输入框的 `Space.Compact`。
- GitHub 的渠道选项只有 Web，值固定为 `web`；从微信 `mini` 切到 GitHub 时自动改为 `web`，切回微信默认 Web，不残留隐藏渠道值。
- 微信 Web 显示：AppID、AppSecret、OAuth 回调地址、Scope、授权地址、Token 地址、前端承接页、前端回调白名单。
- 微信小程序显示：AppID、AppSecret、授权码换会话地址（`userinfoUrl`）、接口调用凭证地址（`tokenUrl`）、手机号接口地址（`configJson`）；隐藏 Web 专用的回调、Scope、授权页和前端承接字段。
- GitHub Web 显示：Client ID、Client Secret、OAuth 回调地址、Scope、授权地址、Token 地址、用户信息地址、前端承接页、前端回调白名单。
- 每个字段有对应中文说明；保留必要的英文协议名。短说明放 label tooltip，示例放 placeholder，安全/保留 Secret 等重要说明放字段 `extra`，避免所有说明都挤在 label。
- 高级端点按默认值填写占位示例，不以 placeholder 冒充实际值；保存空值时继续使用 YAML 默认端点。
- 微信小程序字段 label 直接说明真实用途，删除“额外地址放在 configJson”的错误描述。
- 弹窗保存时显示 `confirmLoading`，失败保留弹窗和用户输入；校验失败不调用 API。

### 3.2 必填规则：启用时严格，禁用时允许草稿

| 场景 | 必填字段 |
|---|---|
| 所有新增/编辑 | Provider、渠道 |
| 任意启用配置 | Client ID / AppID；新增或尚未配置 Secret 时 Client Secret / AppSecret |
| 编辑且已有 Secret | Secret 可留空并保留原值；填入新值则替换 |
| GitHub Web 且启用 | OAuth 回调地址 |
| 微信 Web 且启用 | OAuth 回调地址、Scope |
| 微信小程序且启用 | 授权码换会话地址、接口调用凭证地址、手机号接口地址 |

其他端点：GitHub 的授权/Token/用户信息地址及微信 Web 的授权/Token 地址可留空使用 YAML 默认值；前端承接页可留空使用对应 YAML 默认值。禁用状态允许不完整草稿，但启用后必须满足上述条件，前后端一致。

URL 输入统一去首尾空格，前端对填写的绝对 URL 校验 `http/https`；前端承接页**仅允许站内相对路径**（以 `/` 开头且非 `//`），与服务端解析规则保持一致。不再有白名单概念（见 V2 变更点）。

### 3.3 单租户配置解析

采用“默认租户记录优先、无记录回退 YAML”：

- 多租户：沿用当前租户上下文；无上下文返回 `null`。
- 单租户：使用 `TenantContext` 中的默认租户；若匿名/早期流程没有上下文，使用 `TenantProperties.defaultTenantId`。
- 单租户查到记录：返回该记录，包括 `enabled=false`，使界面停用能真正覆盖 YAML。
- 单租户未查到记录：返回 `null`，由现有 Provider Client 回退 YAML。
- 多租户未查到记录：维持当前“禁用设置”语义，不继承系统租户或其他租户凭据。
- 查询与解密使用当前租户 ID 和现有 CryptoScope；不跨租户读取，不打印 Secret。

### 3.4 前端承接页真正接入运行时配置

GitHub 与微信 Controller 不再只持有启动期 YAML 字符串，而是在登录 GET 回调需要 302 时按固定 Provider/渠道调用 `OAuth2ProviderConfigResolver`：

- 有企业设置且配置了承接页：使用企业值。
- 企业承接页为空：回退各自 YAML 默认值。
- 没有企业配置（解析结果为 `null`）：保持 YAML 行为。
- 绑定流程返回的 `frontendRedirect` 继续优先，不覆盖 `/profile/bind-callback`。
- 绝对承接页需通过白名单来源校验；非法或不匹配配置返回可读配置错误，不执行开放跳转，不泄露 Secret。

白名单机制**已整体移除**（见下方变更点 V2）。

**实施变更点 V1（B3 联调，已被 V2 取代）**：微信 `web` 曾增加可选 `frontend-callback-allowlist` YAML List，Controller 回退 YAML 时同时读取它；保持绝对承接页必须命中白名单，同时避免已有微信绝对承接页部署因无白名单入口而回归。B1 保存时调用共享策略校验白名单条目及绝对承接页归属，避免“保存成功、运行时才失败”。

**实施变更点 V2（用户决策：去掉全部白名单，承接页统一站内相对路径）**：
- 删除共享工具 `OAuth2FrontendCallbackPolicy` / `OAuth2FrontendCallbackException` 及其测试，白名单不再是任何一层的概念。
- 删除 `WechatOAuth2Properties.WebChannel.frontendCallbackAllowlist`（V1 新增）、`GitHubOAuth2Properties.frontendCallbackAllowlist` 及其启动校验（含 `validate()` 中的白名单调用）。
- 删除 `TenantOAuth2ProviderServiceImpl` 的白名单保存校验；`frontendCallbackUri` 仅允许以 `/` 开头且非 `//` 的站内相对路径，绝对地址一律拒绝（保存期 + 运行时一致）。
- 两个 Controller 运行时解析简化为：企业承接页非空且为合法相对路径则用企业值，否则回退 YAML 相对路径默认值；绑定 `frontendRedirect` 优先不变。
- 前端：删除 `frontendCallbackAllowlist` 字段、其规则/校验/归一化；`frontendCallbackUri` 校验改为只接受站内相对路径；API 类型删除该字段；隐藏字段清理逻辑相应简化。
- 后端 `UpsertTenantOAuth2ProviderReq` 删除 `frontendCallbackAllowlist` 字段及 `@Schema`；`TenantOAuth2ProviderDto`、`UpsertTenantOAuth2ProviderCommand` 中该字段一并删除（接口不再暴露、不再读写）；Entity 字段与数据库列保留不删（避免 DDL 变更），代码不再读写该列。
- `redirectUri`（微信/GitHub 侧 OAuth 回调）仍必须是 http/https 绝对 URL，不在本次变更范围。
- 文档：spec 12、business-capabilities、usage-guide、configuration、changelog 全部去除白名单描述，改为「承接页仅支持站内相对路径」。
- 配置清理：删除三处 `application.yml`（nebula-auth-service / nebula-app-runner / backend）中的 `frontend-callback-allowlist` 键、`docker-compose.yml` / `docker/docker-compose.yml` / `nebula-app/README.md` 中 `NEBULA_AUTH_GITHUB_FRONTEND_CALLBACK_ORIGIN` 引用；这些键已不被代码读取，残留属误导。
- 运行时错误码：保存期非法承接页用 19005；运行时 GitHub/微信 Controller 沿用各自 Provider 配置码（19107 / 19213），不新增错误码，保持现状。
- YAML 默认承接页不做相对路径强校验（仓库默认值为 `http://localhost:5173/...` 绝对地址，强制校验会破坏本地联调）；仅企业配置值强制相对路径。
- 测试：删除/改写所有白名单相关用例为「绝对承接页被拒绝、相对路径可用、非法前缀（//host、javascript:）被拒绝」。

### 3.5 Provider/渠道服务端契约

- `providerId` 归一化为小写；`channel` 归一化为大写存储，与现有 DAO/Client 读取一致。
- 允许组合仅：`github + WEB`、`wechat + WEB`、`wechat + MINI`。
- `github + MINI` 及未知 Provider/渠道返回现有 `19005`，message 明确指出不支持的 Provider/渠道组合，不新增错误码。
- 启用校验在查询已有记录之后执行，以便判断 Secret 是否已存在；禁用草稿不要求 Secret。
- 保留 upsert 唯一键 `(tenant_id, provider_id, channel)` 语义和现有 API 路径。

## 4. 数据模型与接口契约

### 数据模型

继续使用 `auth_tenant_oauth2_provider`，无 DDL 变更：

| 接口字段 | 存储/读取语义 |
|---|---|
| `providerId` | `github` / `wechat` |
| `channel` | 请求接受 `web` / `mini`，存储及响应保持 `WEB` / `MINI` |
| `enabled` | 企业配置开关；单租户存在禁用记录时覆盖 YAML |
| `clientId` | GitHub Client ID 或微信 AppID |
| `clientSecret` | 仅请求写入；响应只返回 `hasClientSecret` |
| `redirectUri` | Web OAuth 回调地址；小程序不使用 |
| `frontendCallbackUri` | Web 登录完成后的前端承接页，支持相对路径或白名单内绝对 URL |
| `frontendCallbackAllowlist` | 逗号分隔的允许来源，不带路径 |
| `authorizeUrl` | Web 授权页地址，空值回退 YAML |
| `tokenUrl` | GitHub/微信 Web Token 地址；微信小程序 access_token 地址 |
| `userinfoUrl` | GitHub 用户信息地址；微信小程序 jscode2session 地址 |
| `scope` | GitHub/微信 Web Scope |
| `configJson` | 微信小程序手机号接口 URL；其他组合不使用；字段名暂不改变以保持兼容 |

### 请求/响应兼容

- API 路径、方法、字段名及响应结构不变，只收紧非法组合和启用完整性校验。
- 前端表单类型单独建模，不把 `clientSecret` 错当成响应字段；`TenantOAuth2Provider` 响应类型继续保持无 Secret 明文。
- `UpsertTenantOAuth2ProviderReq` 每个字段补 `@Schema` 描述、示例与必填条件，和页面文案一致。

## 5. 任务拆分

### 后端任务 B1：保存校验与接口描述

- **输入**：`TenantOAuth2ProviderServiceImpl`、`UpsertTenantOAuth2ProviderReq`、GitHub/微信 Properties 的完整性规则。
- **产出文件**：
  - 修改 `nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/TenantOAuth2ProviderServiceImpl.java`
  - 修改 `nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/model/req/UpsertTenantOAuth2ProviderReq.java`
  - 新增 `nebula-auth/nebula-auth-core/src/test/java/cn/cloudomni/nebula/auth/service/impl/TenantOAuth2ProviderServiceImplTest.java`
- **完成判据**：测试覆盖三种合法组合、`github+MINI` 拒绝、未知 Provider 拒绝、启用缺 Client ID/Secret/Web 回调/微信 Scope/小程序端点拒绝、禁用草稿保存、编辑 Secret 留空保留、非法 URL 拒绝；`19005` 错误信息可读。

### 后端任务 B2：单租户解析

- **输入**：`TenantOAuth2ProviderConfigResolver`、`TenantProperties.defaultTenantId`、现有 DAO 和 CryptoScope。
- **产出文件**：
  - 修改 `TenantOAuth2ProviderConfigResolver.java`
  - 新增 `nebula-auth/nebula-auth-core/src/test/java/cn/cloudomni/nebula/auth/service/impl/TenantOAuth2ProviderConfigResolverTest.java`
- **完成判据**：单租户有记录时返回并解密默认租户配置；禁用记录不回退 YAML；无记录返回 `null`；无上下文也能按默认租户查询；多租户原行为及无上下文回退保持不变；测试后清理 `TenantContext`。

### 后端任务 B3：运行时前端承接页与白名单

- **输入**：`OAuth2ProviderSettings.frontendCallbackUri/callbackAllowlist`、两个 OAuth Controller、GitHub 白名单校验。
- **产出文件**：
  - 新增共享白名单解析/校验工具及对应测试，放在现有认证核心适当包中，不新增 Maven 模块。
  - 修改 `GitHubOAuth2Controller.java`、`WechatOAuth2Controller.java` 及自动配置注入。
  - 修改 `GitHubOAuth2Properties.java` 复用共享校验。
  - 修改/新增 `GitHubOAuth2ControllerTest.java`、`WechatOAuth2ControllerTest.java` 和自动配置测试。
- **完成判据**：企业承接页用于登录 302；空值回退 YAML；相对路径可用；绝对地址命中逗号分隔白名单时可用，未命中/非法时被拒绝；绑定 `frontendRedirect` 优先；现有构造方式有兼容适配或全部调用点和测试同步更新。

### 前端任务 F1：字段模型、Provider/渠道联动与保存映射

- **输入**：现有 `oauth-providers.tsx`、`tenant-oauth.ts`、B1/B3 确定的契约。
- **产出文件**：
  - 新增 `web/src/pages/tenant/settings/oauth-provider-form.tsx`（页面私用弹窗）。
  - 新增 `web/src/pages/tenant/settings/oauth-provider-form-helpers.ts`，集中渠道选项、字段元数据、动态规则、请求归一化及回调校验。
  - 修改 `oauth-providers.tsx` 负责列表、加载和调用弹窗。
  - 必要时修改 `web/src/api/tenant-oauth.ts` 分离表单/响应类型。
- **完成判据**：按 3.1 显示字段和说明；GitHub 无小程序选项且切换自动纠正；动态必填与 Secret 保留规则生效；无效 URL/白名单不提交；禁用可保存草稿；输入去空格；隐藏字段不会以旧值污染另一种渠道的提交；保存中和失败状态符合 3.1。

### 前端任务 F2：交互测试

- **输入**：F1 组件和现有 Vitest/Testing Library 测试工具。
- **产出文件**：新增 `web/src/pages/tenant/settings/oauth-providers.test.tsx`，必要时增加 `oauth-provider-form-helpers.test.ts`。
- **完成判据**：覆盖 GitHub 仅 Web、微信 Web/MINI 切换、字段显隐、必填星号与错误消息、placeholder/说明、Secret 编辑留空、非法组合无法由 UI 产生、合法提交 payload、非法 URL/JSON 旧提示不再出现、保存失败不关闭弹窗。

### 文档任务 D1：契约、使用说明和变更记录

- **输入**：最终实现与测试证据。
- **产出文件**：
  - 修改 `docs/spec/12-multitenancy.md`，补单租户默认租户配置/YAML 回退、合法组合和启用校验。
  - 修改 `docs/projects/nebula/tenant/business-capabilities.md`、`usage-guide.md`，增加字段映射和配置步骤。
  - 修改 `docs/projects/nebula/auth/configuration.md`，明确 YAML 作为无企业记录时的默认配置。
  - 修改 `docs/projects/nebula/release/changelog.md` 的 `[Unreleased]`。
- **完成判据**：文档不再宣称单租户企业 OAuth 配置无效；小程序 `configJson` 不再被描述为任意 JSON；Secret、回调白名单、Provider/渠道矩阵与代码一致；本次仅改既有页面，无需新增侧边栏条目。

### 测试任务 T1：回归与人工验收

- **输入**：B1-B3、F1-F2、D1 完成。
- **产出文件**：测试输出和验收记录写入计划实施回报，不新增生产文件。
- **完成判据**：第 7 节全部命令通过，并完成可观察的浏览器验收。

## 6. 执行顺序与依赖

1. **M1 契约与保存链路**：B1 → B2，先固定合法组合、必填和单租户读取语义。
2. **M2 回调闭环**：B3，依赖 B2 的运行时解析；与 F1 可并行，但双方使用第 4 节固定契约。
3. **M3 前端交付**：F1 → F2。
4. **M4 文档与验收**：D1 → T1；coder 完成后交 reviewer 按本计划逐项只读验收，问题分类后回报用户决定处理方式。

## 7. 测试与验收标准

### 自动测试命令

```bash
# 前端定向测试：全部 PASS，无未处理异常
cd web && npm test -- src/pages/tenant/settings/oauth-providers.test.tsx

# 前端类型检查：退出码 0
cd web && npm run typecheck

# 前端生产构建：退出码 0
cd web && npm run build

# 相关后端模块及依赖测试：BUILD SUCCESS
mvn -pl nebula-auth/nebula-auth-core,nebula-auth/nebula-auth-oauth2-provider-github,nebula-auth/nebula-auth-oauth2-provider-wechat -am test
```

如新增独立 helper/Controller 测试文件，再用对应 `npm test -- <files>` 或 Maven `-Dtest=...` 运行，不能以定向测试代替上述模块回归。

### 浏览器可观察验收

1. 单租户、无任何企业 OAuth 记录：已有 YAML GitHub/微信登录行为保持不变。
2. 新增 GitHub：渠道只有 Web；启用但未填 Client ID、Secret、回调地址时不能保存，字段旁显示必填与具体错误。
3. 微信 Web：显示 Web 字段；切换小程序后只显示 AppID/AppSecret、jscode2session、access_token、手机号接口等有效字段；切到 GitHub 后自动回 Web。
4. 填入合法默认租户配置并启用后，重新发起登录，Provider 使用企业凭据；停用后不再回落 YAML 启用。
5. 配置相对前端承接页可完成回调；配置白名单内绝对地址可 302 到该地址；白名单外地址被拒绝且不发生跳转。
6. 编辑已有 Secret 配置时输入框为空，保存后仍显示“已配置”，且原 Secret 未出现在任何响应中。

## 8. 风险与回滚

- **现有非法记录**：数据库可能已有 `github+MINI` 或不完整启用记录。保存校验只阻止新增/更新；读取时保持禁用/不可用语义，不自动删除或迁移。实施时只读检查并汇报现存非法记录，由用户决定是否另行清理。
- **升级行为变化**：单租户已有禁用记录将从“忽略记录、使用 YAML”变为“停用”，这是本需求的有意修复；无记录回退 YAML 降低升级风险，并在 changelog 明示。
- **配置不完整导致登录不可用**：启用前后端双重校验；运行时仍保留 Provider Client 的不可用保护。
- **开放重定向风险**：绝对前端承接页必须按来源白名单校验，绑定承接页优先；补充正反向测试。
- **Secret 泄露**：维持密文存储、响应不回显、日志不记录；测试只断言密文/解密调用，不断言接口返回明文。
- **回滚**：代码可按前端表单、Controller 回调、解析器、保存校验四组分别 revert，无 DDL、无数据迁移；若需紧急恢复原行为，优先回滚 B3 与 B2 即可恢复 YAML 回调和单租户 YAML 凭据，同时保留前端校验不受影响。
