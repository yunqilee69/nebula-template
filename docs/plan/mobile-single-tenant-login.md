# 移动端单租户登录页隐藏企业代码输入框计划

## 1. 背景与目标

移动端登录页当前**无条件**渲染「企业代码（可选）」输入框：单租户（`tenant.enabled=false`）部署下用户仍被要求填一个无意义的企业代码，且与 Web 端「单租户不出现企业代码门禁」的体验不一致。

### 目标

1. 后端**明确**下发 `loginConfig.tenantEnabled = false` 时，登录页不显示企业代码输入框；也即不再向 `LoginScreen` 传 `onTenantCodeChange`。
2. `tenantEnabled = true`、`null`、`undefined`、`loginConfig` 整个对象缺失时**显示**输入框（fail-open）。原因：多租户首启时若未带企业代码，`GET /api/frontend/init` 会被后端以 `19001`（未指定租户）拦截，`App.tsx` 的 `fetchLoginConfig()` 走 `catch` 返回 `loginConfig: null`；此时若按「不明确就隐藏」处理，用户既没有输入入口也无法登录，形成死路。
3. 输入框 placeholder 改为移动端语义：**「例如 acme；通过链接或二维码进入时可留空」**（措辞以最终实现为准，但必须保留「示例企业代码 + 已通过链接/二维码带入时可留空」这两层语义）。
4. 补齐 `@nebula/client-sdk` 中 `FrontendLoginConfigResp` 已存在但漏声明的 `tenantEnabled?: boolean` 字段，消除类型缺口。
5. 更新移动端租户使用文档，说明单租户隐藏、配置未知时保留。

### 非目标

- 不改后端 `tenant = null` 的处理、不改 `tenantEnabled` 的语义与来源（`LoginServiceImpl.getAuthConfig()` 的单一赋值）、不改 Web 端对 `tenantEnabled` 的现有消费点（`web/src/utils/auth/auth-methods.ts`）、不改 Web 端 `19001` / `19002` 门禁（`web/src/components/tenant-code-gate/`、`web/src/api/auth.ts`）。
- 不改登录 / 注册 / 刷新流程，不改 `X-Tenant-Code` 请求头逻辑（`mobile/src/request/client.ts`），不改品牌渲染（`projectName`、`init.tenant` 资料）。
- 不新增任何 npm 依赖；不引入 Jest / `@testing-library/react-native`。
- 不做登录页 UI 重设计（布局、配色、字段顺序、其它文案均保持原样）。
- 不为本次缺陷顺手扩大 `mobile/tsconfig.json` 的编译范围（`App.tsx` / `src/screens/*.tsx` 依旧不在 `tsc` 图内）。

## 2. 现状与约束

### 2.1 端与技术栈

- 移动端：React Native 0.77 + TypeScript，测试用 Node 内置 `node:test`（`node --test "test/**/*.test.ts"`，Node 原生类型擦除，不做类型检查）。
- SDK：`packages/client-sdk` 为纯 TypeScript 契约包（无 React、无 UI、无传输实现），同样用 `node:test`。
- 后端：Spring Boot / MyBatis，本次只读核对，不改。

### 2.2 根因链（三处叠加）

1. **`mobile/App.tsx` 无条件传 callback**：第 375 行 `onTenantCodeChange={updateTenantCode}` 恒为真值，`state.loginConfig` 完全没有参与该判断。
2. **`mobile/src/screens/LoginScreen.tsx` 靠 callback 显隐**：第 448 行 `{onTenantCodeChange ? (<View>…企业代码输入框…) : null}`，即「有无 callback」是唯一的显隐协议；组件内没有、也不应该自行读 `tenantEnabled` 做第二次判断。
3. **SDK 漏字段**：`packages/client-sdk/types/frontend.ts` 的 `FrontendLoginConfigResp` 未声明 `tenantEnabled`，因此移动端拿不到类型化的判断依据（后端其实已经下发了该字段）。

### 2.3 后端行为（只读核对，不改）

| 文件 | 位置 | 行为 |
| --- | --- | --- |
| `nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/LoginServiceImpl.java` | 第 813 行 | `dto.setTenantEnabled(tenantProperties.isEnabled())`：`getAuthConfig()` 恒定写入 `AuthInitDto.tenantEnabled`。这是全后端**唯一**的赋值源，值直接取自部署开关 `nebula.tenant.enabled`，不按 Web / Mobile 或任何客户端做分支。 |
| `nebula-auth/nebula-auth-api/src/main/java/cn/cloudomni/nebula/auth/model/dto/AuthInitDto.java` | 第 11–12 行 | `@Schema(description = "是否启用多租户模式；启用后额外提供独立的平台账号登录方式")` + `private Boolean tenantEnabled;` |
| `nebula-auth/nebula-auth-local/src/main/java/cn/cloudomni/nebula/auth/model/resp/AuthInitResp.java` | 第 11–12 行 | 同上 `@Schema` 描述与 `Boolean tenantEnabled`，由 `GET /api/auth/get-auth-config` 暴露。 |
| `nebula-frontend/nebula-frontend-local/src/main/java/cn/cloudomni/nebula/frontend/model/resp/FrontendLoginConfigResp.java` | 第 13–14 行 | 同上 `@Schema` 描述与 `Boolean tenantEnabled`，由 `GET /api/frontend/init` 的 `loginConfig` 暴露（Web 与 Mobile 同源）。 |
| 生成式转换器 `FrontendLocalConverterImpl`（`target/generated-sources`） | 第 352 行 | `frontendLoginConfigResp.setTenantEnabled(authInitDto.getTenantEnabled())` 已透传，无字段丢失。 |
| `nebula-auth/nebula-auth-core/src/main/java/cn/cloudomni/nebula/auth/service/impl/TenantBrandingServiceImpl.java` | 第 24–34 行 | `tenantProperties.isEnabled()` 关闭、或 `TenantContext` 无租户、或租户不存在时返回 `null`。**说明**：`init.tenant` 缺失 ≠ 单租户，多租户首启同样缺失，不能拿它当隐藏依据。 |

### 2.4 `tenantEnabled` 的契约语义，以及 Web 与 Mobile 的消费关系

这一节是本次改动的**唯一判据来源**，必须区分「字段语义」与「某一端当前的直接消费点」两件事。

#### 2.4.1 字段语义（Web 与 Mobile 完全一致）

- **权威定义**：后端三处 `@Schema` 一致声明为「**是否启用多租户模式；启用后额外提供独立的平台账号登录方式**」——`AuthInitDto.java:11`、`AuthInitResp.java:11`、`FrontendLoginConfigResp.java:13`。三端（DTO / 认证侧 Resp / 前端 `loginConfig`）共用同一句描述，说明它是**部署级多租户总开关**的对外投影，不是某个平台的专属属性。
- **主语义 vs 衍生结果**：主语义是「多租户模式是否启用」；「额外提供独立的平台账号登录方式」是该开关为 `true` 时**衍生**出来的登录方式差异，不是字段本义，更不是字段的唯一用途。
- **唯一赋值源**：`LoginServiceImpl.getAuthConfig():813` 的 `dto.setTenantEnabled(tenantProperties.isEnabled())`。全后端没有第二处写入，值恒等于 `nebula.tenant.enabled`，**不区分 Web / Mobile，也不因客户端不同而变化**。
- **关闭态的系统行为**：`docs/spec/12-multitenancy.md:1248` 明确 `tenant.enabled=false` 时「不启用租户解析、租户选择和平台账号绑定；租户拦截器仍然注册，读写统一落到 `default-tenant-id`」。因此 `tenantEnabled=false` 表达的是「这套部署根本没有租户概念可供选择」，企业代码输入在这种部署下必然是无效输入。

结论：**Web 与 Mobile 对 `tenantEnabled` 的解释不得分叉**——两端读到的是同一个字段、同一个值、同一个语义。

#### 2.4.2 Web 当前的直接消费点（只是消费点，不是字段语义）

- **唯一直接把 `tenantEnabled` 读进逻辑的地方**是 `web/src/utils/auth/auth-methods.ts:16`：`if (config.tenantEnabled) { methods.push('person') }`，即仅决定是否追加「平台账号登录」这一登录方式。这是主语义（多租户 → 平台账号层随租户模式自动启用）的衍生结果在 Web 上的落地。
- **Web 的企业代码门禁（`TenantCodeGate`）当前不是靠读 `tenantEnabled` 触发的**。`web/src/pages/login/index.tsx:232-255` 的触发条件只有 `tenantError`，而 `tenantError` 由 `login/index.tsx:155` 的 `isTenantResolutionError(caught)` 设置——该判定只认 `web/src/utils/tenant/tenant-error.ts:16` 里 `19001`（未指定租户）/ `19002`（租户不存在）两个业务码。也就是说，门禁的直接触发条件是 **`init` 请求返回 19001/19002**，不是字段值。

#### 2.4.3 单租户 Web 不出现企业代码门禁的真实机制

Web 代码里**没有** `if (tenantEnabled) { …门禁… }` 这样的显式判断，但单租户部署下门禁确实不会出现。机制在后端：

`TenantContextFilter.java:53-62`——当 `tenantProperties.isEnabled()` 为 `false` 时，过滤器直接 `TenantContext.set(tenantIdResolver.resolve())` 写入默认租户上下文并 `filterChain.doFilter(...)` 继续，**不进入匿名租户解析分支**（`resolveTenant()` 与 `X-Tenant-Code` / 子域名解析都不执行），因此永远不会走到 `TenantErrorInfo.TENANT_REQUIRED`（`19001`，`TenantErrorInfo.java:10`）或 `TENANT_NOT_FOUND`（`19002`，`TenantErrorInfo.java:11`）的抛出点。`init` 因此正常 200 返回，`tenantError` 始终为 `null`，`TenantCodeGate` 自然不渲染。

即：**同一个部署开关通过后端行为间接保证了两端一致的结果**——单租户下 `tenantEnabled=false` 是「因」，后端不做租户解析是「机制」，Web 不出现门禁是「果」。这不构成「Web 用 `tenantEnabled` 控制了门禁」的证据。

#### 2.4.4 本次移动端修复的准确定位

- **不是**引入新的字段语义，也不是新增开关；
- **不是**照搬 Web 的 `19001` / `19002` 交互（移动端 `init` 被 19001 拦截时 `App.tsx` 拿到的是 `loginConfig: null`，此时恰恰**必须保留**输入框，见 2.2 与第 4 节三态表）；
- **而是**消费同一个多租户总开关，补齐移动端**缺失的那层 UI 行为**：
  - 成功取得配置且 `tenantEnabled === false` → **隐藏**企业代码输入框（该部署没有企业可选，隐藏等价于 Web 门禁不出现的同一结果）；
  - `tenantEnabled === true` → **显示**（该部署需要企业代码，且 Web 由 19001/19002 兜底提示，移动端提前给出输入入口）；
  - 配置未知（`loginConfig` 为 `null` / `undefined`，含 `init` 被 19001 拦截的多租户首启）→ **保留**输入框，避免多租户首启死路。

据此，2.4 的**准确表述**是：不能声称 Web 现有代码直接用 `tenantEnabled` 控制 `TenantCodeGate`；本次依据是**后端统一的字段语义**与**单租户关闭租户解析的行为**（`LoginServiceImpl:813` + `docs/spec/12-multitenancy.md:1248` + `TenantContextFilter.java:53-62`）。

### 2.5 工具链与编译图约束

- `mobile/tsconfig.json` 的 `include` 只有 `src/**/*.ts`，`exclude` 含 `test` 与 `src/session/secure-storage-rn.ts`；`App.tsx`、`src/screens/*.tsx` 不在编译图内。
- 现有工具链**没有** RN 组件渲染测试能力：无 Jest，无 `@testing-library/react-native`，无 Metro/mock 组件环境。`npm test` 只跑纯 TS 逻辑。
- 因此可测的落点必须是纯函数；组件显隐接线只能靠代码审查 + 有条件的人工观察。

### 2.6 常用命令与本计划开工前的基线（已实测）

```bash
cd mobile && npm test              # 112 pass / 0 fail
cd mobile && npm run typecheck     # exit 0，无输出
cd packages/client-sdk && npm test # 14 pass / 0 fail
cd packages/client-sdk && npm run typecheck  # exit 0，无输出
```

补充 TSX 类型检查（不改配置、`--noEmit` 不产文件、只查单文件入口）：

```bash
cd mobile && npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler \
  --jsx react-jsx --strict --skipLibCheck --allowImportingTsExtensions \
  --verbatimModuleSyntax --noUncheckedIndexedAccess --types react src/screens/LoginScreen.tsx
# 实测：exit 0，0 条错误

cd mobile && npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler \
  --jsx react-jsx --strict --skipLibCheck --allowImportingTsExtensions \
  --verbatimModuleSyntax --noUncheckedIndexedAccess --types react App.tsx
# 实测：非零退出码，stdout 仅有 1 条基线既有错误：
# App.tsx(126,13): error TS2322: Type '<T>(config: RequestConfig) => Promise<T>'
#                  is not assignable to type 'RequestClient'.
```

**该命令的边界必须如实写明**：只检查给定单文件入口及其 import 链，不等于覆盖整棵组件树，也**不是**渲染测试；`App.tsx` 存在 1 条与本次无关的既有错误，故**预期非零退出码**，它只能做「错误集合与基线完全一致」的回归比对，**不是通过门禁**，不能按 exit 0 判定。

## 3. 关键决策

三个候选：

- **A. `App.tsx` 直接内联三元**：`onTenantCodeChange={state.loginConfig?.tenantEnabled === false ? undefined : updateTenantCode}`。改动最小（一行），但三态规则藏在 JSX 里，无法单测，后续容易被「优化」成 `=== true`。
- **B. 在 `mobile/src/auth/login-service.ts` 新增纯函数 `shouldShowTenantCodeInput(loginConfig)`，`App.tsx` 调用它，并补单测。**（**最终选择**）
- **C. 只有 `=== true` 才显示**：**拒绝**。`init` 失败、`19001` 拦截、SDK 字段再次丢失、老后端未下发字段时都会隐藏输入框，多租户首次启动直接死路。

选择 B 的理由：把三态（`false` / `true` / `null|undefined|缺失`）规则收进一个有名字、有注释、有测试的纯函数，`App.tsx` 只负责调用；`LoginScreen` 的「有 callback 就显示」协议**完全不动**，改动面比 A 只多一个函数和几行测试。

### 3.0 契约前提（不可协商）

- **Web 与 Mobile 对 `tenantEnabled` 的解释不得分叉**：两端消费的是同一个后端字段（`FrontendLoginConfigResp.tenantEnabled`，唯一赋值源 `LoginServiceImpl.getAuthConfig():813` = `tenantProperties.isEnabled()`），语义恒为「是否启用多租户模式」。移动端只是补上「单租户不渲染企业代码输入」这一层 UI 行为，不定义第二套解释。
- 该约束只作用于**解释口径**：本次不改 Web、不改后端，也不要求 Web 增加 `tenantEnabled` 读取点（Web 单租户不出现门禁已由 `TenantContextFilter.java:53-62` 的后端行为保证，见 2.4.3）。

### 3.1 函数契约（放在 `mobile/src/auth/login-service.ts`，与其它 `is*Enabled` / `is*Allowed` 判定并列）

```ts
/**
 * 登录页是否显示企业代码输入框。
 *
 * <p>只有后端<b>明确</b>下发 `tenantEnabled === false` 才隐藏。`true` / `undefined` /
 * `null` / `loginConfig` 整个缺失时一律显示：多租户首启未带企业代码时
 * `init` 会被 19001 拦截，配置必然缺失，此时隐藏输入框会让用户无路可走。</p>
 *
 * <p>禁止用 `init.tenant === null` 判断：单租户、平台入口、init 失败都会导致
 * tenant 节点缺失，与是否多租户无关。</p>
 *
 * <p>`tenantEnabled` 是后端多租户总开关（`tenantProperties.isEnabled()` 的唯一投影），
 * Web 与 Mobile 使用同一解释；本函数只决定移动端这一层的 UI 表现。</p>
 */
export function shouldShowTenantCodeInput(
  loginConfig?: FrontendLoginConfigResp | null,
): boolean {
  return loginConfig?.tenantEnabled !== false;
}
```

### 3.2 组件侧接线（`mobile/App.tsx`）

```tsx
onTenantCodeChange={
  shouldShowTenantCodeInput(state.loginConfig) ? updateTenantCode : undefined
}
```

并在该 prop 上方保留一段说明 fail-open 理由的注释（3–5 行）。`state.loginConfig` 的类型已是 `FrontendLoginConfigResp | null`，无需改 `BootState`。

### 3.3 `LoginScreen` 侧

- 保持 `onTenantCodeChange ? … : null` 显隐协议不变（不在组件内二次判断 `tenantEnabled`）。
- placeholder 改为 `"例如 acme；通过链接或二维码进入时可留空"`。
- 只补必要注释（一句话说明「是否渲染由组合根通过 callback 决定」），不动 label「企业代码（可选）」，不动样式与位置。

## 4. 数据模型与接口契约

- 无 DB 变更，无新增/调整 API 路径与结构，仅补齐 SDK 侧既有字段声明。
- **字段语义（Web / Mobile 共用，不得分叉）**：`tenantEnabled` = 「是否启用多租户模式」，唯一来源 `LoginServiceImpl.getAuthConfig():813` 的 `tenantProperties.isEnabled()`；为 `false` 时后端不启用租户解析、租户选择和平台账号绑定（`docs/spec/12-multitenancy.md:1248`）。「平台账号登录」「企业代码输入框」都是该总开关的衍生表现，而不是字段本身。

| 层 | 类型 | 字段 | 说明 |
| --- | --- | --- | --- |
| 后端 DTO | `AuthInitDto` / `AuthInitResp` / `FrontendLoginConfigResp` | `Boolean tenantEnabled` | Java `Boolean`，`LoginServiceImpl:813` 恒定赋值；三处 `@Schema` 统一为「是否启用多租户模式；启用后额外提供独立的平台账号登录方式」 |
| SDK | `FrontendLoginConfigResp`（`packages/client-sdk/types/frontend.ts`） | `tenantEnabled?: boolean` | 可选；本次唯一新增声明。Web 与 Mobile 读同一字段，解释规则必须一致 |
| 组合根 | `BootState.anonymous.loginConfig: FrontendLoginConfigResp \| null` | — | 已存在，不改 |
| 组件 | `LoginScreenProps.onTenantCodeChange?` | — | 已存在语义「未提供则隐藏」，不改 |

消费链：`GET /api/frontend/init` → `FrontendInitResp.loginConfig`（`FrontendLoginConfigResp`）→ `App.fetchLoginConfig()` → `BootState.anonymous.loginConfig` → `shouldShowTenantCodeInput()` → `LoginScreenProps.onTenantCodeChange` → `LoginScreen` 是否渲染 `testID="login-tenant-code"`。

三态真值表（`shouldShowTenantCodeInput` 的实现即此表）：

| `loginConfig` | `tenantEnabled` | 是否显示输入框 |
| --- | --- | --- |
| 对象 | `false` | **隐藏** |
| 对象 | `true` | 显示 |
| 对象 | `null` | 显示 |
| 对象 | `undefined` / 字段缺失 | 显示 |
| `null` / `undefined`（配置对象缺失，含 init 失败或 19001） | — | 显示 |

表中 `false` 指的是**后端多租户总开关关闭**（`nebula.tenant.enabled=false`，由 `LoginServiceImpl.getAuthConfig():813` 唯一投影下发），不是「客户端不支持该能力」之类的端侧差异；`true` 同理。三态判定与 Web 门禁的差异只体现在**表现层**（Web 靠 19001/19002 事后兜底，Mobile 提前隐藏），字段解释本身两端一致。

## 5. 任务拆分

### F1（前端，唯一实现任务）

执行顺序**必须**是「先红灯、后实现」。

**F1.1 新增失败测试（先做）**

- 产出文件：`mobile/test/login-config.test.ts`（新增；不复用 `mobile/test/login-service.test.ts`，避免该文件继续变大）。
- 内容：`import { shouldShowTenantCodeInput } from '../src/auth/login-service.ts';`，用 `node:test` + `node:assert/strict`，命名风格对齐现有用例（`LoginConfigTest.xxx`）。至少覆盖 5 个用例：
  1. `tenantEnabled: false` → `false`（隐藏）
  2. `tenantEnabled: true` → `true`
  3. `tenantEnabled: null` → `true`。**注意类型兼容**：当前 SDK 声明为 `tenantEnabled?: boolean`，`null` 不在其类型内，因此该用例的输入需以 `as unknown as FrontendLoginConfigResp`（或等价的局部测试构造方式）绕过类型检查，**不扩大 SDK 类型为 `boolean | null`**。该用例的语义是运行时防御——后端可能缺字段或下空值——只验证运行期三态行为，不代表接口契约允许 `null`。
  4. `tenantEnabled: undefined`（显式写出）→ `true`
  5. `loginConfig` 为 `{}` → `true`；并补 `loginConfig = undefined` / `null` → `true`（可并入 5 或单列第 6 条）
- 红灯判据：此时 `shouldShowTenantCodeInput` 尚不存在，`cd mobile && npm test` 失败（该测试文件因导出缺失而整体报错），**记录失败输出**作为 M1 证据。

**F1.2 实现 helper**

- 修改 `mobile/src/auth/login-service.ts`：新增 `shouldShowTenantCodeInput`（见 3.1），并从该文件导出；`FrontendLoginConfigResp` 已在文件顶部 import，无需新增 import。
- 完成判据：`cd mobile && npm test` 全绿，且 `mobile/test/login-config.test.ts` 的 6 条用例全部出现在通过列表中。

**F1.3 补齐 SDK 字段**

- 修改 `packages/client-sdk/types/frontend.ts`：在 `FrontendLoginConfigResp` 内新增 `tenantEnabled?: boolean;`（位置放在最前，与后端 DTO 顺序一致），带一行注释说明「是否启用多租户模式（部署级总开关，Web 与 Mobile 语义相同）；客户端仅当明确 false 时隐藏企业代码输入」。
- 完成判据：`cd packages/client-sdk && npm run typecheck` 与 `npm test` 均 exit 0；`cd mobile && npm run typecheck` exit 0（helper 读取该字段，字段一旦再丢会直接编译失败，即类型级锁定，无需另写 SDK 契约测试）。

**F1.4 `App.tsx` 条件传参**

- 修改 `mobile/App.tsx`：`import { shouldShowTenantCodeInput }` 并入现有 `./src/auth/login-service.ts` 的 import 列表；第 375 行 `onTenantCodeChange` 改为 3.2 的条件表达式；补 fail-open 注释。
- 完成判据：代码审查确认 (a) 不再无条件传 `updateTenantCode`；(b) 未出现 `tenant === null` / `state.loginConfig?.tenant` 之类判断；(c) `mobile/src/auth/tenant-code.ts` 的深链/二维码提取逻辑与 `updateTenantCode` 实现未改。

**F1.5 `LoginScreen.tsx` 文案与注释**

- 修改 `mobile/src/screens/LoginScreen.tsx`：placeholder → `"例如 acme；通过链接或二维码进入时可留空"`；补一句显隐归属注释。**不改**显隐条件、label、样式、其它字段。
- 完成判据：`git diff` 中该文件仅 placeholder 与注释行变更；`testID="login-tenant-code"` 保留。

### B0（后端：无实现任务）

**明确不实现任何后端改动。** 仅列出已完成核对的只读文件与「不可修改」判据，供 reviewer 核对 coder 是否存在越界：

- 已核对：`LoginServiceImpl.java:813`、`AuthInitDto.java:11-12`、`AuthInitResp.java:11-12`、`FrontendLoginConfigResp.java:13-14`、`FrontendLocalConverterImpl:352`（生成物）、`TenantBrandingServiceImpl.java:24–34`、`TenantContextFilter.java:53-62`、`docs/spec/12-multitenancy.md:1248`。
- 判据：`git status` 中不得出现任何 `.java` 文件；不得改动 `tenantProperties.isEnabled()` 调用点、`AuthInitDto` / `FrontendLoginConfigResp` 字段、`19001` / `19002` 的抛出与 `TenantResolver` 行为。

### D1（文档）

- 修改 `docs/projects/nebula/tenant/usage-guide.md` 的「## 4. 移动端接入」小节：在现有「约定」列表补一条——「后端明确 `tenantEnabled=false`（单租户）时登录页不显示企业代码输入框；多租户或配置未知（含 `init` 被 `19001` 拦截、`loginConfig` 缺失）时保留输入框，可由深链 / 二维码带入后留空。」
- 同时把 4.1 的来源列表第 4 条「登录页手动输入企业代码」后面加一句限定：仅多租户或配置未知时可用。
- 判据：只改这一处语义；**不新增页面、不改侧边栏**、不改 `docs/publish/cludix-doc/`；不扩写成品牌 / 登录页专题文档；**本任务仅修改 `usage-guide.md`，不修改 `docs/projects/nebula/release/changelog.md`、侧边栏或其他业务文档**。

### T1（测试与验收）

- 运行四条主命令并保留输出（通过数、退出码）：
  - `cd mobile && npm test`（基线 112 + 新增 6 = 预期 ≥118 pass / 0 fail）
  - `cd mobile && npm run typecheck`（exit 0）
  - `cd packages/client-sdk && npm test`（14 pass / 0 fail）
  - `cd packages/client-sdk && npm run typecheck`（exit 0）
- 补充静态检查（见 2.6 的命令）：
  - `LoginScreen.tsx` 单文件检查 → 0 条错误（exit 0，可作为门禁）；
  - `App.tsx` 单文件检查 → 预期**非零退出码**，stdout 仅含基线已有的 `App.tsx(126,13)` TS2322 一条错误；该检查**不是通过门禁**，只比对「无新增错误」：一旦出现基线之外的任何错误（含该函数新增的错误位置）即判失败。
- 人工可观察验收（需可用 RN 环境；环境不可用时**必须写「未执行」**，不得宣称通过）：
  1. 单租户后端（`tenant.enabled=false`）：登录页**无企业代码输入框**（`testID="login-tenant-code"` 不渲染），既有登录流程可用。**不对请求头做断言**：深链 / 二维码已带入 code 时仍可能发送 `X-Tenant-Code`，且本任务不改请求头逻辑；
  2. 多租户后端 + 深链 `?tenantCode=acme`：输入框存在、可编辑、已被带入 `acme`；
  3. 多租户后端 + 不带企业代码（`init` 返回 `19001`）：输入框仍存在且可编辑，填入后可正常登录。
- 生产环境验证：本计划不含，也不得在结论中声称已在生产验证。

## 6. 顺序与依赖

| 里程碑 | 内容 | 依赖 | 产出 |
| --- | --- | --- | --- |
| M0 | 本计划评审确认（用户确认后才允许实施） | — | 本文件 |
| M1 | 写 F1.1 失败用例并运行 `cd mobile && npm test` 取得红灯证据 | M0 | 失败输出记录 |
| M2 | F1.2 → F1.3 → F1.4 → F1.5，跑通 `npm test` + `npm run typecheck` | M1 | 5 个文件变更，逐项为：`mobile/src/auth/login-service.ts`（新增 helper）、`mobile/test/login-config.test.ts`（新增测试，计 1 个新增文件）、`packages/client-sdk/types/frontend.ts`（SDK 字段声明）、`mobile/App.tsx`（条件接线）、`mobile/src/screens/LoginScreen.tsx`（placeholder 与注释） |
| M3 | D1 文档更新 | M2（口径以实现为准） | `usage-guide.md` 变更 |
| M4 | T1 全量命令 + 静态检查 + 人工观察记录，随后由 reviewer 只读独立验收 | M2、M3 | 测试证据与验收报告 |

- F1 的 5 个子步骤由**一个 coder 顺序完成**，不要拆给并行 agent（同一函数被 `App.tsx` 与测试同时依赖）。
- B0 无实施，仅 reviewer 核对。
- 计划经用户确认后才可实施；未确认前不写业务代码。

## 7. 验收标准

1. `cd mobile && npm test` exit 0，`fail 0`，通过数 ≥ 基线 112 + 新增用例数；`mobile/test/login-config.test.ts` 的 `false / true / null / undefined / {} / 缺失` 6 条用例存在且通过。
2. `cd mobile && npm run typecheck` exit 0；`cd packages/client-sdk && npm test` 14 pass 且 `npm run typecheck` exit 0（既有 112 + 14 条不回归）。
3. 静态审查：`App.tsx` 不再无条件传 `onTenantCodeChange`；`LoginScreen` 显隐协议与 `testID` 未变；placeholder 含「例如 acme」与「可留空」两层语义；无 `tenant === null` 判据；无新依赖；`tsconfig.json` 未改；无 `.java` 变更；`LoginScreen.tsx` 单文件 `tsc` 为 0 错误，`App.tsx` 单文件 `tsc` **预期非零退出码且无基线以外的新增错误**（不是通过门禁）。
4. 人工观察（环境可用时）：单租户不出现 `login-tenant-code`；多租户 `tenantEnabled=true` 与「配置未知 / `19001`」两种情形输入框均存在且可编辑。环境不可用时报告「未执行」，不得记作通过。
5. reviewer 只读验收：逐条对照本文件第 5、7 节，附命令输出证据；不通过则回退到 M2 修正。

## 8. 风险与回滚

| 风险 | 影响 | 预防 / 处置 |
| --- | --- | --- |
| **fail-closed 误判**（实现成 `=== true` 或误用 `tenant === null`） | 多租户首次启动无企业代码输入入口，完全无法登录 | 三态表 + 6 条单测锁死；代码审查断言「无 `=== true`、无 `tenant === null`」 |
| SDK 字段再次丢失 | 判断依据消失后静默退化为「永远隐藏」 | `mobile npm run typecheck` 会因引用不存在字段失败（类型级门禁） |
| placeholder 文案偏差 | 仅文案体验问题 | 人工观察项，无功能风险 |
| 文档口径与实现不一致 | 误导使用者 | M3 排在 M2 之后，以最终实现为准 |
| 误改后端 / Web | 超出范围，影响 19001 门禁与多租户行为 | B0 只读 + `git status` 检查 `.java` 与 `web/` 零变更 |

**回滚**：仅 `git checkout --` 还原本计划列出的业务文件（`mobile/src/auth/login-service.ts`、`mobile/test/login-config.test.ts`（直接删除）、`packages/client-sdk/types/frontend.ts`、`mobile/App.tsx`、`mobile/src/screens/LoginScreen.tsx`、`docs/projects/nebula/tenant/usage-guide.md`），不碰无关改动（例如 `docs/plan/` 其它文件）。无 DB 变更，**无需数据回滚**，也无需配置回滚。

## 9. 测试限制（必须如实声明）

- `mobile/test/login-config.test.ts` 验证的是**纯函数三态规则**，不是 React Native 渲染测试。**不得**声称「组件测试已覆盖」或「登录页显隐已被自动化测试覆盖」。
- 组件层的真实显隐由三部分共同保证，验收时必须分别说明：
  1. `App.tsx` 的一行条件接线（代码审查 + `App.tsx` 单文件 `tsc` 与基线比对；该命令预期非零退出码，只能比对「无新增错误」，不等于通过门禁）；
  2. `LoginScreen` 现有「有 callback 就渲染」协议未变（代码审查，`testID="login-tenant-code"` 仍在）；
  3. 有条件的真机 / 模拟器人工观察（环境不可用即报「未执行」）。
- 本次**不**引入 Jest / `@testing-library/react-native`，**不**扩大 `mobile/tsconfig.json` 的 `include`（把 `App.tsx`、`src/**/*.tsx` 纳入编译图应作为独立技术债任务评估，不作为本缺陷的附带改动）。
- 单文件 `tsc` 补充检查只覆盖被指定入口的 import 链，不能代表整棵组件树可编译。
