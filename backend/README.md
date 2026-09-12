# Nebula 后端模板工程

基于 `cn.cloudomni:nebula-app-starter` 的最小可运行 Spring Boot 工程。一个依赖即获得完整中台后端能力：认证（用户/角色/组织/菜单/权限/OAuth2）、数据字典、系统参数、通知、文件存储、审计、任务调度、前端配置。

> 与主仓 `nebula-app/nebula-app-runner` 的区别：本工程完全独立于 nebula 主仓 Maven reactor，仅通过 Maven Central 依赖 starter，模拟真实使用者的接入形态。

## 环境要求

- JDK 21
- Docker（用于 MySQL + Redis，或使用你自有的实例）
- Maven 3.9+

## 快速启动

```bash
# 1. 启动依赖（首次自动建库并导入 ../docs/sql/init/ 下的初始化脚本）
docker compose up -d

# 2. 启动后端（默认 localhost:8080）
mvn spring-boot:run
```

> 若你的 shell（`~/.zshrc` 等）里导出了指向远程环境的 `NEBULA_APP_DATASOURCE_*` / `NEBULA_APP_REDIS_*` / `NEBULA_STORAGE_*`，它们会覆盖 `application.yml` 的本地默认值（Spring 的既定优先级）。本地联调前先取消，或直接注释掉这些导出行：
>
> ```bash
> unset NEBULA_APP_DATASOURCE_URL NEBULA_APP_DATASOURCE_USERNAME NEBULA_APP_DATASOURCE_PASSWORD \
>       NEBULA_APP_REDIS_HOST NEBULA_APP_REDIS_PORT NEBULA_APP_REDIS_USERNAME NEBULA_APP_REDIS_PASSWORD \
>       NEBULA_STORAGE_TEMPORARY_TYPE NEBULA_STORAGE_FORMAL_TYPE
> ```
>
> 第 1 步的 `docker compose` 不受影响：本机依赖栈只读取 `NEBULA_LOCAL_*`（见下表），与应用的 `NEBULA_APP_*` 变量隔离。

默认管理员账号：`admin` / `123456`（**部署后立即修改**）。

前端：启动本仓库 `web/` 目录的前端工程（`pnpm install && pnpm dev`，默认代理到 8080）。

## 配置

所有可变项已环境变量化（见 `src/main/resources/application.yml`），默认值与 `docker-compose.yml` 对齐，本地零配置。生产环境至少覆盖：

| 变量 | 说明 |
|---|---|
| `NEBULA_APP_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | 数据库连接 |
| `NEBULA_APP_REDIS_HOST` / `_PORT` / `_PASSWORD` | Redis 连接 |
| `NEBULA_AUTH_JWT_SECRET` | JWT 签名密钥，至少 32 字节随机串（**必须**） |

本机依赖栈（`docker-compose.yml`）使用独立的 `NEBULA_LOCAL_*` 变量，避免被宿主机上导出的远程连接信息改写：`NEBULA_LOCAL_MYSQL_ROOT_PASSWORD` / `_MYSQL_DATABASE` / `_MYSQL_USER` / `_MYSQL_PASSWORD` / `_MYSQL_PORT` / `_REDIS_PORT`。

PostgreSQL 初始化脚本见仓库根 `docs/sql/init/`（`*-postgresql.sql`），脚本目录组织见 `docs/sql/README.md`。

## 升级

改 `pom.xml` 中 `<nebula.version>` 即升级后端（与前端模板同版本发布，见根 README 版本配对说明）。

## 常用能力开关

- 任务调度：`nebula.scheduler.engine`（默认 quartz，可选 xxl）
- 文件存储：`nebula.storage.*.type`（filesystem / db / minio）
- GitHub 登录：`NEBULA_AUTH_GITHUB_ENABLED=true` + client-id/secret
- 验证码 / 限流：`nebula.auth.security.captcha` / `rate-limit`

## 业务模块开发要点

- Mapper 扫描：启动类已声明 `@MapperScan("cn.cloudomni.nebula.template.**.mapper")`，业务 Mapper 接口放在 `<业务包>.**.mapper` 下即可，无需再改启动类；Mapper XML 放在 `src/main/resources/mapper/**/*.xml`。
- 实体与审计字段：继承 `cn.cloudomni.nebula.mybatis.entity.BaseEntity` / `BaseIdEntity`，`create_time` / `update_time` 由框架自动填充。
- 操作审计：在 Controller 方法上标注 `@NebulaAudit(module = "...", action = "...", resourceType = "...", recordRequestParams = true)`，审计记录写入 `audit_record`。
- 定时任务：实现 `INebulaJobHandler` 并在类上标注 `@NebulaScheduledJob(code = "...", name = "...", cron = "...")`，注册为 Bean 后由调度模块同步（见 `nebula-scheduler/README.md`）。
- 短信/邮件验证码：实现 `cn.cloudomni.nebula.auth.service.VerificationCodeSender` 并注册为 Bean；未实现时发送验证码接口返回「验证码发送器未配置」，本地联调可临时开启 `nebula.auth.code.log-enabled=true` 把验证码打到日志。
- 跨域：默认关闭；需要时配置 `nebula.web.cors.allowed-origins`（或环境变量 `NEBULA_WEB_CORS_ALLOWED_ORIGINS`）。
