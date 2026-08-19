# Nebula 后端模板工程

基于 `cn.cloudomni:nebula-app-starter` 的最小可运行 Spring Boot 工程。一个依赖即获得完整中台后端能力：认证（用户/角色/组织/菜单/权限/OAuth2）、数据字典、系统参数、通知、文件存储、审计、任务调度、前端配置。

> 与主仓 `nebula-app/nebula-app-runner` 的区别：本工程完全独立于 nebula 主仓 Maven reactor，仅通过 Maven Central 依赖 starter，模拟真实使用者的接入形态。

## 环境要求

- JDK 21
- Docker（用于 MySQL + Redis，或使用你自有的实例）
- Maven 3.9+

## 快速启动

```bash
# 1. 启动依赖（首次自动建库并导入 sql/ 下的初始化脚本）
docker compose up -d

# 2. 启动后端（默认 localhost:8080）
mvn spring-boot:run
```

默认管理员账号：`admin` / `123456`（**部署后立即修改**）。

前端：启动本仓库 `web/` 目录的前端工程（`pnpm install && pnpm dev`，默认代理到 8080）。

## 配置

所有可变项已环境变量化（见 `src/main/resources/application.yml`），默认值与 `docker-compose.yml` 对齐，本地零配置。生产环境至少覆盖：

| 变量 | 说明 |
|---|---|
| `NEBULA_APP_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | 数据库连接 |
| `NEBULA_APP_REDIS_HOST` / `_PORT` / `_PASSWORD` | Redis 连接 |
| `NEBULA_AUTH_JWT_SECRET` | JWT 签名密钥，至少 32 字节随机串（**必须**） |

PostgreSQL 初始化脚本见主仓 `doc/database-init-scripts/`（`*-postgresql.sql`）。

## 升级

改 `pom.xml` 中 `<nebula.version>` 即升级后端（与前端模板同版本发布，见根 README 版本配对说明）。

## 常用能力开关

- 任务调度：`nebula.scheduler.engine`（quartz / xxl / 关闭）
- 文件存储：`nebula.storage.*.type`（filesystem / db / minio）
- GitHub 登录：`NEBULA_AUTH_GITHUB_ENABLED=true` + client-id/secret
- 验证码 / 限流：`nebula.auth.security.captcha` / `rate-limit`
