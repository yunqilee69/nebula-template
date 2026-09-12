# SQL 脚本目录

本目录统一存放 nebula 的数据库脚本，分为**全量初始化**和**版本升级**两类。

## 目录结构

```text
docs/sql/
├── init/          # 最新的全量初始化脚本（跟随当前版本，始终可用）
├── <版本号>/       # 从该版本升级到更新版本所需的增量脚本（尚不存在，有升级脚本时创建）
└── README.md
```

## init/ —— 全量初始化

`init/` 目录**永远是最新版本的全量初始化脚本**：新环境部署时，按文件名顺序逐个执行即可得到与当前版本一致的完整库结构。

| 文件 | 说明 |
| --- | --- |
| `01-init-structure-mysql.sql` | 业务库全量建表（MySQL） |
| `01-init-structure-postgresql.sql` | 业务库全量建表（PostgreSQL） |
| `01-init-structure-quartz-mysql.sql` | Quartz JDBC 持久化表结构（MySQL，建在**当前库**，仅启用 JDBC 持久化时执行，见下文） |
| `01-init-structure-quartz-postgresql.sql` | Quartz JDBC 持久化表结构（PostgreSQL，建在**当前库**，仅启用 JDBC 持久化时执行，见下文） |
| `02-init-data-mysql.sql` | 初始化数据：种子用户、菜单、字典、参数等（MySQL） |
| `02-init-data-postgresql.sql` | 初始化数据（PostgreSQL） |

执行顺序：先 `01-init-structure-*`，后 `02-init-data-*`；业务库脚本按数据库类型二选一，Quartz 脚本按调度引擎选型决定是否执行（见下节）。

版本升级**不要**重复执行 `init/` 下的脚本——那是给全新环境用的。

## 调度引擎脚本 —— Quartz 与 XXL-JOB 二选一

`nebula.scheduler.engine` 决定调度引擎（`quartz` 为默认，`xxl` 为备选），两者**互斥**，按选型只执行对应一方的脚本：

| | Quartz（默认） | XXL-JOB |
| --- | --- | --- |
| 表所在库 | 与调度器数据源同库：单体应用即业务库（`01-init-structure-quartz-*.sql` 建在当前连接的库）；调度器独立部署时为其自身数据源所在库 | **独立部署的 XXL Admin 数据库**（不在 nebula 主库，`init/` 中无对应脚本） |
| 初始化脚本 | 本仓库 `init/01-init-structure-quartz-mysql.sql` / `01-init-structure-quartz-postgresql.sql` | 官方 [`tables_xxl_job.sql`](https://github.com/xuxueli/xxl-job/blob/master/doc/db/tables_xxl_job.sql)，随 XXL Admin 部署执行 |
| 数据库支持 | 本仓库提供 MySQL / PostgreSQL 双方言脚本 | 官方仅提供 MySQL 脚本 |
| 默认存储 | 默认 RAMJobStore（进程内单节点，**无需建表**）；启用 JDBC 持久化（`org.quartz.jobStore.class=JobStoreTX`）时才需执行建表脚本 | XXL Admin 自管 |

选型速查：

- 默认 **Quartz + RAM 存储**（`nebula.scheduler.engine` 缺省即生效）：无需执行任何引擎脚本，无需额外部署
- 选 **Quartz + JDBC 持久化**：按数据库类型对**调度器数据源所在库**执行 `01-init-structure-quartz-mysql.sql` 或 `01-init-structure-quartz-postgresql.sql`（单体应用即业务库，docker-compose 已随业务库初始化自动执行）
- 选 **XXL-JOB**：不执行 `init/` 中的 Quartz 脚本；单独部署 XXL Admin 并用官方脚本初始化其 MySQL 库

## 版本目录 —— 增量升级

版本目录（如 `0.1.0/`）存放**从该版本升级到更新版本**需要执行的增量脚本。

升级规则：**按版本顺序，从起始版本目录开始，逐个执行目录内的 SQL（按文件名顺序），直到到达目标版本。**

以从 `0.1.0` 升级到 `1.0.0` 为例：

1. 按文件名顺序逐个执行 `docs/sql/0.1.0/` 下的脚本（如 `01-xxx-mysql.sql`、`02-xxx-mysql.sql`……）
2. 若 `0.1.0` 与 `1.0.0` 之间还有其他版本目录（如 `0.2.0/`），执行完 `0.1.0/` 后继续按版本顺序执行 `0.2.0/`
3. 到达 `1.0.0` 后停止，**不执行** `1.0.0/` 目录下的脚本（那是留给下次升级用的）

约定：

- 每个版本目录内的脚本按文件名前缀（`01-`、`02-`……）排序执行，同一目录内先后依赖由前缀保证
- 双方言脚本成对提供：`NN-描述-mysql.sql` / `NN-描述-postgresql.sql`，按所用数据库执行对应方言
- 每个脚本应可重复执行或自带存在性判断（`IF NOT EXISTS` / `ON CONFLICT` 等），避免中断后重跑失败

## 当前状态

`0.1.0` 是首个规划发布版本，**尚无版本升级目录**（`docs/sql/` 下暂无 `0.1.0/` 等版本目录，待有升级脚本时再创建）。后续版本发布时，在本目录新建对应版本目录并放入升级脚本，同时同步刷新 `init/` 至最新全量。
