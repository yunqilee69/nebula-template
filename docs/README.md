# Nebula 文档

本目录是全仓库唯一的文档来源。代码旁边只保留模块 `README.md`（构建与本地运行说明），业务能力、功能设计、配置、升级与发版记录统一写在这里，再由 CI 同步到文档站展示。

## 目录结构

```text
docs/
├── projects/nebula/        # 发布到文档站的 Nebula 项目文档（与 cludix-doc 同构）
│   ├── index.md            # 项目简介
│   ├── quick-start.md      # 模板仓 fork 与本地启动
│   ├── design/             # 分层、包设计、加密、多租户实施计划
│   ├── auth/ dict/ param/ storage/ frontend/ notify/ mobile/ tenant/
│   │                       # 每模块统一结构：overview / business-capabilities /
│   │                       # design-and-implementation / usage-guide /
│   │                       # configuration / ddl / index
│   ├── extensibility/      # 扩展点与领域事件
│   ├── spec/index.md       # 规范说明入口
│   └── release/            # 发版记录（changelog.md）与 Maven Central 发布手册
├── spec/                   # 开发规范（架构、分层、命名、数据库、接口、异常、日志、安全、配置、多租户）
├── sql/                    # 数据库全量初始化与版本增量脚本（MySQL / PostgreSQL）
└── publish/cludix-doc/     # 文档站专属配置（侧边栏），随文档一起同步
```

### 各目录的定位

| 目录 | 写什么 | 是否发布到文档站 |
| --- | --- | --- |
| `docs/projects/nebula/` | 面向使用者的模块文档、业务用法、设计说明、发版记录 | ✅ 整体同步 |
| `docs/spec/` | 开发规范与硬性约束，面向贡献者与 AI | ❌ 站点保留入口页，细则以仓库为准 |
| `docs/sql/` | 可执行 SQL 交付物与脚本组织说明 | ❌ 站点不逐条发布 |
| `docs/publish/cludix-doc/` | 文档站侧边栏，源文件在主仓维护 | ✅ 同步到站点配置目录 |

`docs/sql/init/` 只服务全新数据库；存量环境升级按 `docs/sql/<目标版本>/` 执行增量脚本。`docs/sql/unreleased/` 是主仓开发期目录，不会同步到模板仓，也不应作为升级脚本执行。升级 SQL 以仓库中的版本目录为准，文档站只做索引与说明。

模块 `README.md` 留在各模块目录，用来回答“这个模块怎么编译、怎么本地跑”；`docs/projects/nebula/<module>/` 回答“这个模块能做什么、怎么接入、怎么配置”。两者不重复。

## 文档同步

主仓的 `docs/projects/nebula/` 是文档站 [cludix-doc](https://github.com/yunqilee69/cludix-doc) 中 `docs/projects/nebula/` 的来源：

```text
nebula/docs/projects/nebula/  ──CI──>  cludix-doc/docs/projects/nebula/
nebula/docs/publish/cludix-doc/sidebars/projects/nebula.ts
                              ──CI──>  cludix-doc/sidebars/projects/nebula.ts
```

同步由 `.github/workflows/sync-docs.yml` 完成：`master` 上 `docs/**` 变化时触发，使用 `CLUDIX_DOCS_TOKEN` 推送到 `cludix-doc`，随后站点仓库自己的 `deploy.yml` 构建并发布。同步是覆盖式的，目标目录只应通过本仓修改。

## 编写约定

- 站点文档（`docs/projects/nebula/`）文件名使用 kebab-case，目录索引用 `index.md`。
- 相对链接优先，不要写死 GitHub 绝对地址；跨出 Nebula 目录的链接（如 `../omnigate/`）只在站点中存在，仓库内不校验。
- 每篇模块文档保持既有结构：`overview` → `business-capabilities` → `usage-guide` → `configuration` → `design-and-implementation` → `ddl`；新增跨渠道能力时补独立参考页并登记到 `docs/publish/cludix-doc/sidebars/projects/nebula.ts`。
- 新增/修改站点文档后，同步更新对应模块的 `index.md` 文档清单和侧边栏源文件。
- 涉及硬约束（禁止项、错误码、配置键）时，同时更新 `docs/spec/`。
- 功能交付的完成标准：更新 `docs/projects/nebula/release/changelog.md` 的 `[Unreleased]`；面向使用者的变化补 `usage-guide` / 参考页；涉及架构取舍的补 `design-and-implementation`。

## 发版记录

变更记录位于 [projects/nebula/release/changelog.md](./projects/nebula/release/changelog.md)，格式遵循 Keep a Changelog。发版脚本 `scripts/set-version.sh --release` 会自动把 `[Unreleased]` 收口为版本段落，并同步 `docs/sql/unreleased/` 的更名。
