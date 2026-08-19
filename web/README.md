# Nebula Web

Nebula Web 是 Nebula 中台的前端模板工程（React 18 + Ant Design 6 + React Router 7 + Vite + Tailwind CSS 4），采用 **fork 模板** 模式分发：新项目直接 fork 本工程，在应用层上开发业务页面，并通过 `git pull` 持续吸收上游模板升级。

> 本目录是 `nebula` monorepo 的组成部分（源仓 `nebula-web` 已合入）。纯前端模板镜像仓 `nebula-template` 由主仓 CI 从本目录自动生成，用户应 fork 该镜像仓。

## 快速开始

```bash
pnpm install
pnpm dev        # 开发服务器，/api 默认代理到 http://localhost:8080
pnpm test       # 单元测试
pnpm typecheck  # 类型检查
pnpm build      # 生产构建
```

后端配套：单体模式直接启动 `nebula-app/nebula-app-starter`（默认 8080），或微服务模式启动 `nebula-gateway-service`（9999，见 `.env.local.example`）。完整后端接入见主仓 `doc/quickstart-nebula-app-starter.md`。

## Fork 工作流

1. **Fork** 本工程（或 `nebula-template` 镜像仓）作为你的项目仓库。
2. **在应用层开发**：`src/pages/`、`src/services/`、`src/components/` 等目录可自由修改（目录职责见 `AGENTS.md` 的分层约定）。
3. **谨慎修改框架层**：`src/request/`、`src/route/`、`src/stores/`、`src/providers/`、`src/i18n/` 是模板骨架，改动越少，后续升级冲突越少。
4. **同步上游升级**：

```bash
git remote add upstream https://github.com/yunqilee69/nebula-template.git
git fetch upstream
git merge upstream/main
```

按约定，冲突应集中在你改过的应用层文件；框架层冲突时优先采用上游版本。

## 目录与规范

- 分层约定（框架层 / 应用层 / 开发层）、页面与组件组织、样式与主题规范：见 [`AGENTS.md`](./AGENTS.md)
- 设计决策背景：见 [`DESIGN.md`](./DESIGN.md)

## 品牌定制

品牌信息通过 `NebulaProvider` 在应用启动时注入：

```tsx
import { NebulaProvider } from '@/providers/nebula-provider';

export function AppRoot() {
  return (
    <NebulaProvider brand={{ name: 'Acme Console', logo: <AcmeLogo /> }}>
      <App />
    </NebulaProvider>
  );
}
```

| 字段 | 作用 | 默认值 |
| --- | --- | --- |
| `name` | 侧边栏品牌名 | `Nebula Web` |
| `title` | 浏览器标签页标题 | 取 `name` |
| `logo` | 品牌 Logo | 内置占位图标 |
| `faviconHref` | 浏览器 favicon | 不变更现有 favicon |

单处布局如需差异化，可在 `NebulaLayout` 上直接传 `title` / `logo` 覆盖全局默认。

## 环境变量

| 变量 | 用途 | 默认 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 开发代理后端地址 | `http://localhost:8080` |

配置统一放根目录 `.env` / `.env.local`（后者 git 忽略），`src/` 内不放配置文件。
