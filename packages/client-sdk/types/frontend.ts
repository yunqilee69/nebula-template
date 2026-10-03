/**
 * 启动引导与会话偏好契约，对应后端 `nebula-frontend` 的 init / 版本检查响应。
 *
 * <p>来源：`FrontendInitResp`、`FrontendConfigResp`、`FrontendLoginConfigResp`、
 * `FrontendPreferenceResp`、`FrontendThemeResp`、`FrontendStorageInitResp`、
 * `FrontendUploadConfigResp`、`AppReleaseCheckReq`、`AppReleaseCheckResp`。</p>
 */

/** `GET /api/frontend/init` 响应。不含菜单、权限码、字典、参数、用户信息。 */
export interface FrontendInitResp {
  frontendConfig?: FrontendConfigResp;
  loginConfig?: FrontendLoginConfigResp;
  defaultPreference?: FrontendPreferenceResp;
  defaultTheme?: FrontendThemeResp;
  storage?: FrontendStorageInitResp;
  /** 移动推送初始化配置；仅移动端请求时下发，缺失表示不初始化任何推送 SDK。 */
  push?: FrontendPushInitResp;
}

/**
 * 移动推送初始化配置。
 *
 * <p>`enabled=false` / `vendors` 为空表示不要初始化任何推送 SDK，客户端维持轮询 + 站内信。</p>
 */
export interface FrontendPushInitResp {
  enabled?: boolean;
  /** 本端可用的厂商通道，按优先级排序；客户端在其中按自身条件再选一次。 */
  vendors?: string[];
}

/** 前端平台配置。`platform` 查询参数存在时才下发版本字段。 */
export interface FrontendConfigResp {
  projectName?: string;
  layoutMode?: string;
  defaultThemeCode?: string;
  defaultLocale?: string;
  localeOptions?: string[];
  /** 客户端最低可接受构建号；仅 init 携带 platform 时下发，否则为 null。 */
  minSupportedVersionCode?: number | null;
  /** 客户端最新构建号；仅 init 携带 platform 时下发，否则为 null。 */
  latestVersionCode?: number | null;
}

/** 登录页配置。 */
export interface FrontendLoginConfigResp {
  usernameEnabled?: boolean;
  usernameRegisterAllowed?: boolean;
  usernamePasswordMinLength?: number;
  usernamePasswordMaxLength?: number;
  phoneEnabled?: boolean;
  phoneRegisterAllowed?: boolean;
  phoneCodeExpireMinutes?: number;
  phoneSendIntervalSeconds?: number;
  emailEnabled?: boolean;
  emailRegisterAllowed?: boolean;
  emailCodeExpireMinutes?: number;
  emailSendIntervalSeconds?: number;
  oauth2Enabled?: boolean;
  oauth2RegisterAllowed?: boolean;
  githubEnabled?: boolean;
  wechatEnabled?: boolean;
  wechatWebEnabled?: boolean;
  wechatMiniEnabled?: boolean;
}

/** 默认偏好。 */
export interface FrontendPreferenceResp {
  localeTag?: string;
  themeCode?: string;
  navigationLayoutCode?: string;
  sidebarLayoutCode?: string;
}

/** 默认主题。 */
export interface FrontendThemeResp {
  themeCode?: string;
  themeName?: string;
  builtin?: boolean;
  themeConfig?: Record<string, string>;
}

/** 存储初始化配置（上传策略）。 */
export interface FrontendStorageInitResp {
  upload?: FrontendUploadConfigResp;
}

/**
 * 前端上传配置，字段与 `storage.upload.*` 一一对应。
 * 注意：`maxFileSize` / `chunkThreshold` / `chunkSize` 单位为 <b>MB</b>。
 */
export interface FrontendUploadConfigResp {
  maxFileSize?: number;
  chunkThreshold?: number;
  chunkSize?: number;
  /** 允许的扩展名，逗号分隔，空表示不限制。 */
  allowedExtensions?: string;
  tempRetentionDays?: number;
}

/** `POST /api/frontend/app-release/check` 请求（匿名可调）。 */
export interface AppReleaseCheckReq {
  platform: string;
  channel?: string;
  /** 整数构建号，比较用。 */
  versionCode: number;
  versionName?: string;
}

/** 版本检查响应。 */
export interface AppReleaseCheckResp {
  platform?: string;
  channel?: string;
  latestVersionCode?: number | null;
  latestVersionName?: string;
  minSupportedVersionCode?: number;
  upgradeAvailable?: boolean;
  /** 为 true 时客户端必须阻断进入业务界面。 */
  forceUpgrade?: boolean;
  downloadUrl?: string;
  releaseNotes?: string;
  publishedAt?: string;
}
