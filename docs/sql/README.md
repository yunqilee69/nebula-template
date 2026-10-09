# SQL 脚本目录

本目录统一存放 nebula 的数据库脚本，分为**全量初始化**和**版本升级**两类。

两类脚本都按数据库方言分子目录（`mysql/`、`postgresql/`），文件名不再带方言后缀：部署时先进入所用数据库的方言目录，再整目录按文件名顺序执行即可，无需逐个甄别文件后缀。

版本升级目录以**目标版本**命名——`0.2.1/` 表示「升级到 `0.2.1` 要执行什么脚本」；尚未发版的脚本先放 `unreleased/`，发版时整体更名为新版本号。

## 目录结构

```text
docs/sql/
├── init/                  # 最新的全量初始化脚本（跟随当前版本，始终可用）
│   ├── mysql/             # MySQL 方言
│   └── postgresql/        # PostgreSQL 方言
├── unreleased/            # 尚未发版的增量脚本（发版时整体更名为新版本号）
│   ├── mysql/
│   └── postgresql/
├── <版本号>/               # 目标版本目录：升级到该版本所需的增量脚本
│   ├── mysql/
│   └── postgresql/
└── README.md
```

## init/ —— 全量初始化

`init/` 目录**永远是最新版本的全量初始化脚本**：新环境部署时，进入所用数据库的方言目录，按文件名顺序逐个执行即可得到与当前版本一致的完整库结构。

| 文件（`init/mysql/` 与 `init/postgresql/` 同名） | 说明 |
| --- | --- |
| `01-init-structure.sql` | 业务库全量建表 |
| `02-init-data.sql` | 初始化数据：种子用户、菜单、字典、参数等 |
| `03-init-structure-quartz.sql` | Quartz JDBC 持久化表结构（建在**当前库**，仅启用 JDBC 持久化时执行，见下文） |

执行顺序与文件名顺序一致：先建表（`01`），再灌数据（`02`），Quartz 表（`03`）按调度引擎选型决定是否执行。也可以整目录一次导入：

```bash
# MySQL：按文件名顺序导入 init/mysql/ 下全部脚本
for f in docs/sql/init/mysql/*.sql; do mysql --default-character-set=utf8mb4 -u root -p nebula < "$f"; done

# PostgreSQL：按文件名顺序导入 init/postgresql/ 下全部脚本
for f in docs/sql/init/postgresql/*.sql; do psql -d nebula -f "$f"; done
```

> **字符集：导入中文时最容易踩的坑。** 脚本文件本身是 UTF-8，但写入是否乱码取决于**导入时的会话字符集**。若客户端以 `latin1`（cp1252）连接——命令行客户端的默认字符集可能跟随系统 locale，部分 GUI 客户端的「文件编码」默认也不是 UTF-8——中文菜单、字典、参数名会被双重编码成 `å…¶ä»–é€šçŸ¥` 这类乱码，且**不报任何错**。
>
> - MySQL 命令行显式加 `--default-character-set=utf8mb4`（见上面的导入命令）；
> - PostgreSQL 侧确认 `client_encoding` 为 `UTF8`（`psql` 内可用 `\encoding UTF8`）；
> - 用 GUI 客户端导入 `.sql` 文件时，把文件编码显式设为 UTF-8。
>
> 导入后建议复核一句，期望返回 `登录日志` 与 `通知类别`：
>
> ```sql
> SELECT code, name FROM auth_menu WHERE code IN ('system-monitor-login-log', 'NOTIFY_CATEGORY');
> ```

版本升级**不要**重复执行 `init/` 下的脚本——那是给全新环境用的。

## 调度引擎脚本 —— Quartz 与 XXL-JOB 二选一

`nebula.scheduler.engine` 决定调度引擎（`quartz` 为默认，`xxl` 为备选），两者**互斥**，按选型只执行对应一方的脚本：

| | Quartz（默认） | XXL-JOB |
| --- | --- | --- |
| 表所在库 | 与调度器数据源同库：单体应用即业务库（`03-init-structure-quartz.sql` 建在当前连接的库）；调度器独立部署时为其自身数据源所在库 | **独立部署的 XXL Admin 数据库**（不在 nebula 主库，`init/` 中无对应脚本） |
| 初始化脚本 | 本仓库 `init/mysql/03-init-structure-quartz.sql` / `init/postgresql/03-init-structure-quartz.sql` | 官方 [`tables_xxl_job.sql`](https://github.com/xuxueli/xxl-job/blob/master/doc/db/tables_xxl_job.sql)，随 XXL Admin 部署执行 |
| 数据库支持 | 本仓库提供 MySQL / PostgreSQL 双方言脚本 | 官方仅提供 MySQL 脚本 |
| 默认存储 | 默认 RAMJobStore（进程内单节点，**无需建表**）；启用 JDBC 持久化（`org.quartz.jobStore.class=JobStoreTX`）时才需执行建表脚本 | XXL Admin 自管 |

选型速查：

- 默认 **Quartz + RAM 存储**（`nebula.scheduler.engine` 缺省即生效）：无需执行任何引擎脚本，无需额外部署
- 选 **Quartz + JDBC 持久化**：按数据库类型对**调度器数据源所在库**执行 `init/mysql/03-init-structure-quartz.sql` 或 `init/postgresql/03-init-structure-quartz.sql`（单体应用即业务库，docker-compose 已随业务库初始化自动执行）
- 选 **XXL-JOB**：不执行 `init/` 中的 Quartz 脚本；单独部署 XXL Admin 并用官方脚本初始化其 MySQL 库

## 版本目录 —— 增量升级

版本目录（如 `0.2.1/`）以**目标版本**命名，存放**升级到该版本**需要执行的增量脚本，同样按方言分子目录。它与 `CHANGELOG.md` 的版本段落对应：某个版本目录里的内容，应当是发版时该版 CHANGELOG 段落中需要落库的部分，两者一起整理。

开发中的脚本放在 `unreleased/` 目录，**发版时**再整体更名为新版本号——与 CHANGELOG 中 `[Unreleased]` 段落改写为 `[X.Y.Z] - 日期` 是同一时机、同一动作。这两件事已由发版脚本一并完成，不要手工分开做（漏做会让本版增量 SQL 滞留在 `unreleased/` 而漏发）：

```bash
# 发布 X.Y.Z 时执行（unreleased/ 为空则跳过，并重建空的 unreleased/；
# 同时把本行「当前版本为」与 CHANGELOG 的 [Unreleased] 一起收口）
scripts/set-version.sh X.Y.Z --release
```

脚本只做机械动作，**各版本目录的脚本说明（下方「当前状态」里的条目）仍需人工补写**。

升级规则：**从当前版本之后的下一个版本目录开始，按版本号升序逐个执行，直到目标版本目录为止（含目标版本自身）。**

以从 `0.1.0` 升级到 `0.2.1` 为例（假设使用 MySQL）：

1. 目标版本是 `0.2.1`，区间内只有 `0.2.1/` 一个目录（`0.1.0`、`0.2.0` 没有需要落库的变更，故不存在这两个目录）
2. 进入 `docs/sql/0.2.1/mysql/`，按文件名顺序逐个执行（`01-xxx.sql`、`02-xxx.sql`……）
3. 执行完毕即到达 `0.2.1`；若之后还有 `0.3.0/`、`0.4.0/` 等目录，继续按版本号升序执行到目标版本为止

`unreleased/` 是不带版本号的例外：其中的脚本尚未随任何版本发布，**升级时不要执行**，仅用于在开发/预发环境上提前验证。

约定：

- 目录名即目标版本；`unreleased/` 是唯一不以版本号命名的目录
- 每个版本目录内先选方言子目录，再按文件名前缀（`01-`、`02-`……）排序执行，先后依赖由前缀保证
- 两个方言子目录内的脚本同名成对（`NN-描述.sql`），按所用数据库进入对应目录执行
- 同一版本内不同变更合并进同一目录，序号在目录内唯一即可（不同版本目录之间可以重名）
- 每个脚本应可重复执行或自带存在性判断（`IF NOT EXISTS` / `ON CONFLICT` 等），避免中断后重跑失败

## 当前状态

当前版本为 `0.2.5`。

- `0.2.1/`：升级到 `0.2.1` 所需的增量脚本（`auth_login_record` 端类型列；移除失效的 `spring.servlet.multipart.*` 参数、新增 `storage.upload.*` 上传策略参数）；版本低于 `0.2.1` 的环境执行本目录脚本即可对齐。
- `0.2.2/`：升级到 `0.2.2` 所需的增量脚本（新增微信登录提供商开关参数 `login.oauth2.provider.wechat.enabled`，默认关闭；该开关覆盖网站应用扫码与小程序两个渠道）。
- `0.2.4/`：升级到 `0.2.4` 所需的增量脚本。**`0.2.3` 打标签时漏了更名**，其增量脚本滞留在 `unreleased/`，故一并归入本目录——`0.2.4/` 的集合等于「`0.2.3` + `0.2.4`」的落库变更，从任何低于 `0.2.4` 的版本升级都按本目录顺序执行一遍（已在 `0.2.3` 上跑过部分脚本的环境重跑即可，各脚本幂等）：
  - `01-notify-category-preference.sql`：通知类别可管理化与订阅偏好（新增 `sys_notify_category` 并写入 5 条内置类别、`category_code` 列、用户偏好表；**删除**免打扰表 `sys_notify_user_setting`；新增「通知类别」菜单与按钮权限）；
  - `02-app-release.sql`：应用版本发布记录表 `frontend_app_release`；
  - `03-notify-push-device.sql`：移动推送设备注册表与逐设备投递明细表；
  - `04-storage-file-variant.sql`：存储派生版本表 `storage_file_variant`；
  - `05-default-role-org-param.sql`：恢复「自助注册自动建号」的默认角色 / 默认组织两个登录参数（`login.oauth2.default-role-id` / `login.oauth2.default-org-id`，键名保留历史前缀，作用域见脚本头注释；用 `INSERT IGNORE` / `ON CONFLICT DO NOTHING`，**不覆盖**运维已配的值）。
- `0.2.5/`：升级到 `0.2.5` 所需的增量脚本，按文件名顺序执行：
  - `01-api-permission.sql`：接口权限 `auth_api` 表（新增 `API` 资源类型）；新增「接口管理」「接口权限」两个菜单与 `AUTH_API_CREATE` / `AUTH_API_EDIT` / `AUTH_API_DELETE` 三个按钮，4 行内置接口权限码，并为 `ADMIN` 补授权；同时把 4 个纯接口权限码（`AUDIT_RECORD_VIEW` / `PARAM_GENERAL_CONFIG_QUERY` / `FRONTEND_APP_RELEASE_QUERY` / `STORAGE_FILE_QUERY`）已授出的 `BUTTON` 授权**迁移**为 `API` 授权并删除旧 `auth_button` 行（按 `code` 关联重指，已授权主体不丢权限）；
  - `02-button-permission-backfill.sql`：补登记 12 个此前只在代码里声明、未落 `auth_button` 的内置按钮权限码（`param` / `scheduler` / `frontend` 及通知模块新增项），并为 `ADMIN` 补齐授权；无归属菜单的 8 个码不在范围内；
  - `03-notify-channel-dict.sql`：`NOTIFY_CHANNEL_TYPE` 字典补「移动推送」（`PUSH`，排序 6）项，修复模板 PUSH 变体页签与 PUSH 发送记录的渠道标签空白。

`unreleased/` 当前为空：本版增量脚本已随 `0.2.5` 发布更名为版本目录。后续新增升级脚本时，再按 `mysql/`、`postgresql/` 方言子目录放入（空目录不受版本控制，需要时重建即可）。

`0.1.0`、`0.2.0` 没有版本目录：这两个版本没有需要落库的变更，全新环境直接执行 `init/` 即可。

从 `0.2.0` 升级到 `0.2.1` 时，除执行 `0.2.1/` 下的脚本外，还需确认应用 `application.yml` 的静态传输口径不小于业务上限：

```yaml
spring.servlet.multipart.max-file-size: 110MB    # >= storage.upload.max-file-size（默认 100MB）
spring.servlet.multipart.max-request-size: 120MB  # >= max-file-size + 文本字段开销
server.tomcat.max-part-header-size: 10KB          # 长文件名场景，默认 512B 容易触发上传失败
```

`nebula-storage` 启动时会自检该口径，静态口径小于业务上限将直接启动失败。

后续版本发布时，先把升级脚本放进 `unreleased/`（含 `mysql/`、`postgresql/` 两个方言子目录），发版时再整体更名为新版本目录，同时同步刷新 `init/` 至最新全量。
