import type {
  FrontendInitResp,
  FrontendLoginConfigResp,
} from '../../../packages/client-sdk/index.ts';

/**
 * init 拉取失败时的内置兜底默认值。
 *
 * <p>原则：<b>不能白屏</b>；登录开关按最保守方式渲染——只放开用户名密码登录，
 * 关闭注册、验证码登录与 OAuth2，直到 init 重试成功再按下发开关渲染。</p>
 */
export function createFallbackLoginConfig(): FrontendLoginConfigResp {
  return {
    usernameEnabled: true,
    usernameRegisterAllowed: false,
    phoneEnabled: false,
    phoneRegisterAllowed: false,
    emailEnabled: false,
    emailRegisterAllowed: false,
    oauth2Enabled: false,
    oauth2RegisterAllowed: false,
    githubEnabled: false,
    wechatEnabled: false,
    wechatWebEnabled: false,
    wechatMiniEnabled: false,
  };
}

/** 兜底 init 配置。 */
export function createFallbackInit(): FrontendInitResp {
  return {
    frontendConfig: {},
    loginConfig: createFallbackLoginConfig(),
    defaultPreference: { localeTag: 'zh-CN' },
    defaultTheme: { themeCode: 'default', builtin: true },
    storage: {
      upload: {
        maxFileSize: 100,
        chunkThreshold: 5,
        chunkSize: 2,
        allowedExtensions: '',
        tempRetentionDays: 14,
      },
    },
  };
}

/**
 * 用服务端 init 覆盖兜底默认值：字段级合并，缺失字段保留兜底值。
 * 保证即使服务端漏下发某段，UI 也有可渲染的保守默认。
 *
 * <p>{@code push} 不走兜底：服务端未下发即视为「不初始化任何推送 SDK」，
 * 客户端不能自己猜一个厂商通道出来。</p>
 */
export function mergeInitWithDefaults(
  init: FrontendInitResp | null | undefined,
): FrontendInitResp {
  const fallback = createFallbackInit();
  if (!init) return fallback;
  return {
    frontendConfig: { ...fallback.frontendConfig, ...init.frontendConfig },
    loginConfig: { ...fallback.loginConfig, ...init.loginConfig },
    defaultPreference: { ...fallback.defaultPreference, ...init.defaultPreference },
    defaultTheme: { ...fallback.defaultTheme, ...init.defaultTheme },
    storage: { upload: { ...fallback.storage?.upload, ...init.storage?.upload } },
    push: init.push,
  };
}
