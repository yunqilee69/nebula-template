# Nebula Template

Nebula 中台**前后端完整模板**。Fork 本仓库即可开始你的项目：后端引入 [`nebula-app-starter`](https://central.sonatype.com/artifact/cn.cloudomni/nebula-app-starter) 获得完整中台能力，前端直接修改模板页面。

```
├── backend/   # 后端：Spring Boot 4 + nebula-app-starter（认证/字典/参数/通知/存储/审计/调度）
└── web/       # 前端：React 18 + Ant Design 6 + Vite（fork 模板模式，应用层自由修改）
```

> 本仓库由 [nebula 主仓](https://github.com/yunqilee69/nebula) 的 `web/` + `backend/` 目录自动同步生成，请勿直接向上游提交 PR——到主仓改，同步会带过来。

## 快速开始（三步启动）

```bash
# 1. 启动依赖：MySQL 8 + Redis 7（首次自动建库并导入初始化 SQL）
cd backend && docker compose up -d && cd ..

# 2. 启动后端（localhost:8080）
cd backend && mvn spring-boot:run &

# 3. 启动前端（localhost:5173，/api 代理到 8080）
cd web && pnpm install && pnpm dev
```

浏览器打开 http://localhost:5173 ，默认管理员：`admin` / `123456`（登录后立即修改）。

## 环境要求

JDK 21 · Maven 3.9+ · Node 22 / pnpm 10 · Docker

## 接入你的业务

- **后端**：backend 就是一个普通 Spring Boot 工程——加你自己的 Controller / Service / Entity；`pom.xml` 改成你的 groupId；可变配置全部环境变量化（见 `backend/README.md`）
- **前端**：`web/src/pages/` 加页面、`web/src/services/` 加接口；框架层（request/route/stores/providers）尽量少动，升级冲突少（分层约定见 `web/AGENTS.md`）

## 升级

```bash
git remote add upstream https://github.com/yunqilee69/nebula-template.git
git fetch upstream
git merge upstream/main
```

- 前端升级 = merge 上游（冲突按约定应只落在你改过的应用层文件）
- 后端升级 = 改 `backend/pom.xml` 的 `nebula.version`（前后端同 tag 发布，版本一一配对）

## 文档

- 后端模板详细说明：[`backend/README.md`](./backend/README.md)
- 前端模板详细说明：[`web/README.md`](./web/README.md)
- 中台完整能力与微服务拆分：[主仓 README](https://github.com/yunqilee69/nebula)
