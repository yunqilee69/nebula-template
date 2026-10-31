# NEBULA 多租户控制平台

独立的控制平面前端工程，只承载平台级操作，与租户数据平面分离部署。

## 边界

| 平面 | 入口 | 使用者 | 职责 |
|---|---|---|---|
| 控制平面（本工程） | 独立域名 / 端口 | 超级管理员 | 企业生命周期、域名、成员邀请、全局用户查询 |
| 数据平面（`web/`） | 每租户子域名 | 租户成员与租户管理员 | 租户业务、租户内用户 / 角色 / 组织 / 菜单 |

- 控制平面复用同一个后端，不新增后端服务；接口仍是 `/api/auth/tenants`、`/api/auth/persons` 等平台管理员接口。
- 登录使用 `/api/auth/platform-login`，直接认证 `auth_person` 中的平台管理员账号，**只支持账号 + 密码**，不绑定任何租户；邮箱、手机号只作为全局用户信息字段展示，不提供验证码登录或 OAuth 登录。
- 登录成功后必须通过 `/api/auth/current-user` 校验 `sessionType=PLATFORM` 且 `platformAdmin=true`；否则立即清空本地令牌并拒绝进入。
- 控制平面使用独立令牌存储键（`nebula-control.*`），不会复用或写入数据平面的 `nebula-web.*` 令牌。
- 后端 `PlatformAdminGuard` 仍是最终权限边界，前端校验只负责控制台登录体验。

## 启动

```bash
cd control
pnpm install
cp .env.example .env.local   # 按需修改
pnpm dev                     # http://localhost:5174
```

默认连接 `http://localhost:8080` 后端。

## 环境变量

| 变量 | 说明 |
|---|---|
| `VITE_API_BASE_URL` | 仅用于 Vite 开发代理；生产环境走同源 `/api` |
| `VITE_TENANT_ENTRY_URL_TEMPLATE` | 数据平面企业入口模板，`{code}` 会被替换为租户编码；留空则不生成跳转链接 |

## 脚本

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 默认账号

初始化 SQL 中的超级管理员账号为 `superadmin / 123456`，部署后请立即修改密码。
该账号是 `auth_person` 中的平台管理员（`platform_admin=1`），控制平面登录不依赖租户。
数据平面不使用该账号登录；默认租户的数据平面账号请使用 `admin`。
