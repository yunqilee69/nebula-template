# NEBULA TEMPLATE 项目约定

## 一、这个仓库是什么，提供什么

Nebula 中台的前后端完整模板。克隆下来就是一个可直接开发的工程骨架：中台能力（认证 / 字典 / 参数 /
通知 / 存储 / 审计 / 调度）由后端依赖框架发布件获得，不需要自己搭一套中台。

| 目录 | 提供什么 |
|---|---|
| `backend/` | 后端工程：Spring Boot 4，一个 `cn.cloudomni:nebula-app-starter` 依赖即获得完整中台后端能力。`pom.xml` 的 `<nebula.version>` 锁定框架版本，与上游 tag 一一配对 |
| `web/` | 前端管理端：React 18 + Ant Design 6 + Vite（fork 模板模式，应用层自由修改；分层约定见 `web/AGENTS.md`） |
| `mobile/` | 移动端基座：React Native 新架构 + RNOH，含 iOS / Android / 鸿蒙三端工程 |
| `packages/` | 端无关共享包（`client-sdk`：纯 TS 类型、token 规则、端点常量） |
| `docs/` | `spec/` 项目规范（分层 / 命名 / 数据库 / 接口 / 异常 / 日志 / 安全 / 配置 / 开发）；`sql/` 数据库脚本——`init/` 是全量初始化（MySQL、PostgreSQL 两套方言），`<版本号>/` 是逐版本升级脚本 |
| `.agents/` | 项目 skills：AI 辅助开发时复用（模块导读、功能分析、规范检索等） |
| `scripts/` | `rename-project.sh`：fork 后一键改名（groupId / artifactId / Java 包名 / 数据库名 / 容器名等）。主仓自用的发布与审计脚本不同步到模板仓 |

环境要求与三步启动（MySQL + Redis → 后端 → 前端）见根 `README.md`；后端细节见 `backend/README.md`，
前端细节见 `web/README.md`。

> 本仓库内容由 [nebula 主仓](https://github.com/yunqilee69/nebula) 自动同步生成（同步目录清单见主仓
> `.github/workflows/sync-template.yml` 的 `TEMPLATE_DIRS`）。要改进模板本身请改主仓，同步会带过来；
> 直接在本仓库提的 PR 会在下次同步被覆盖。你为自己的业务做的改动留在自己的仓库里，按第二章与上游合并即可。

## 二、如何与上游同步

把 `github.com/yunqilee69/nebula-template` 一直留在 remote 里，它只做一件事：给你送上游更新。
业务改动留在自己的分支上，升级就是「拉上游分支，合并进业务分支」，冲突只出现在你改过的地方。

### 起步：把模板变成你自己的仓库

```bash
git clone https://github.com/yunqilee69/nebula-template.git my-project
cd my-project

# 可选：一键改名（groupId / artifactId / Java 包名 / 数据库名 / 容器名等）
scripts/rename-project.sh

# 在 GitHub / GitLab 新建一个空仓库，作为你的 origin
git remote rename origin upstream     # 模板仓保留为上游，别删——后续升级全靠它
git remote add origin <你的新仓库地址>
git push -u origin main
```

此后 `origin` 是你的业务仓库（想怎么提交就怎么提交），`upstream` 是模板仓。**保留模板的提交历史**
（照上面的 clone 流程，而不是 `git init` 一个空仓库再拷贝文件）——历史是第二章能直接 merge 的前提。

### 升级：拉上游分支，合并进业务分支

```bash
git fetch upstream
git merge upstream/main    # 在业务开发分支上执行
```

- 冲突只应落在你改过的文件上，逐个解决即可，解完提交。
- 用 merge，不要 rebase 上游：merge 每次只解一遍冲突，rebase 会反复重放同一批冲突。
- 后端框架版本随上游一起来：merge 后 `backend/pom.xml` 的 `<nebula.version>` 就是本次上游版本，
  不需要手动改。若你改过该文件（例如改名动过 groupId / artifactId），解决冲突时保留自己的坐标、
  取上游的版本号。
- 前端同一套动作：`git merge upstream/main` 就是前端升级。框架层
  （`web/src/request|route|stores|i18n|providers`）少改，冲突自然收敛在应用层。
- 想固定在某个上游版本，就 merge tag 而不是主干：`git fetch upstream --tags && git merge v0.2.5`
  （前后端同 tag 发布，版本一一配对）。
