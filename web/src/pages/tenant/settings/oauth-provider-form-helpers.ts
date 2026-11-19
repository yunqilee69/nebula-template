import type { Rule } from 'antd/es/form';
import type {
  TenantOAuth2Channel,
  TenantOAuth2Provider,
  TenantOAuth2ProviderId,
  UpsertTenantOAuth2ProviderReq,
} from '@/api/tenant-oauth';

/** 表单字段键；顺序无关，显隐与排序由字段分组决定。 */
export type OAuthProviderFieldKey =
  | 'providerId'
  | 'channel'
  | 'enabled'
  | 'clientId'
  | 'clientSecret'
  | 'redirectUri'
  | 'scope'
  | 'authorizeUrl'
  | 'tokenUrl'
  | 'userinfoUrl'
  | 'frontendCallbackUri'
  | 'configJson';

/** 表单模型：`clientSecret` 只写不回显，因此不进响应类型 `TenantOAuth2Provider`。 */
export interface OAuthProviderFormValues {
  providerId: TenantOAuth2ProviderId;
  channel: TenantOAuth2Channel;
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
  frontendCallbackUri?: string;
  configJson?: string;
}

/** 判定必填与说明文案所需的上下文。 */
export interface OAuthProviderFormContext {
  providerId: TenantOAuth2ProviderId;
  channel: TenantOAuth2Channel;
  enabled: boolean;
  hasStoredSecret: boolean;
}

export interface OAuthProviderFieldMeta {
  readonly label: string;
  readonly tooltip: string;
  readonly placeholder?: string;
  readonly extra?: string;
}

export interface OAuthProviderFieldGroup {
  readonly key: string;
  readonly title: string;
  readonly fields: readonly OAuthProviderFieldKey[];
}

export const DEFAULT_PROVIDER_ID: TenantOAuth2ProviderId = 'github';
export const DEFAULT_CHANNEL: TenantOAuth2Channel = 'web';

export const OAUTH_PROVIDER_OPTIONS: readonly { readonly label: string; readonly value: TenantOAuth2ProviderId }[] = [
  { label: 'GitHub', value: 'github' },
  { label: '微信', value: 'wechat' },
];

const CHANNEL_LABELS: Record<TenantOAuth2Channel, string> = {
  web: 'Web',
  mini: '小程序',
};

/** 合法 Provider/渠道矩阵：GitHub 仅 Web，微信支持 Web 与小程序。 */
export const PROVIDER_CHANNELS: Record<TenantOAuth2ProviderId, readonly TenantOAuth2Channel[]> = {
  github: ['web'],
  wechat: ['web', 'mini'],
};

export const INVALID_URL_MESSAGE = '请填写以 http:// 或 https:// 开头的完整地址';
export const INVALID_FRONTEND_CALLBACK_MESSAGE = '前端承接页只支持站内相对路径（以 / 开头且不能以 // 开头）';

/** 必须是完整 http/https 地址的字段；前端承接页只允许站内相对路径，另有规则。 */
const ABSOLUTE_URL_FIELDS = new Set<OAuthProviderFieldKey>([
  'redirectUri',
  'authorizeUrl',
  'tokenUrl',
  'userinfoUrl',
  'configJson',
]);

/** 提交时按当前 Provider/渠道筛选的文本字段。 */
const TEXT_FIELDS = [
  'clientId',
  'redirectUri',
  'scope',
  'authorizeUrl',
  'tokenUrl',
  'userinfoUrl',
  'frontendCallbackUri',
  'configJson',
] as const;

const ABSOLUTE_URL_PATTERN = /^https?:\/\/[^\s/?#:]+(?::\d{1,5})?(?:[/?#]\S*)?$/i;

/** 当前 Provider 可选的渠道，GitHub 只有 Web。 */
export function channelOptions(
  providerId: TenantOAuth2ProviderId | undefined,
): readonly { readonly label: string; readonly value: TenantOAuth2Channel }[] {
  const allowed = PROVIDER_CHANNELS[providerId ?? DEFAULT_PROVIDER_ID];
  return allowed.map((value) => ({ label: CHANNEL_LABELS[value], value }));
}

/** 把渠道纠正到当前 Provider 的合法集合内，避免残留上一种渠道的隐藏值。 */
export function normalizeChannelForProvider(
  providerId: TenantOAuth2ProviderId | undefined,
  channel: string | undefined,
): TenantOAuth2Channel {
  const allowed = PROVIDER_CHANNELS[providerId ?? DEFAULT_PROVIDER_ID];
  const candidate = channel?.trim().toLowerCase();
  return allowed.find((item) => item === candidate) ?? allowed[0];
}

/** 某个字段在当前 Provider/渠道下是否有效；无效字段既不渲染也不提交。 */
export function isFieldVisible(
  key: OAuthProviderFieldKey,
  providerId: TenantOAuth2ProviderId | undefined,
  channel: string | undefined,
): boolean {
  const provider = providerId ?? DEFAULT_PROVIDER_ID;
  const resolvedChannel = normalizeChannelForProvider(provider, channel);

  switch (key) {
    case 'providerId':
    case 'channel':
    case 'enabled':
    case 'clientId':
    case 'clientSecret':
      return true;
    case 'redirectUri':
    case 'scope':
    case 'authorizeUrl':
    case 'frontendCallbackUri':
      return resolvedChannel === 'web';
    case 'tokenUrl':
      return true;
    case 'userinfoUrl':
      return resolvedChannel === 'mini' || provider === 'github';
    case 'configJson':
      return resolvedChannel === 'mini';
    default:
      return false;
  }
}

/** 弹窗内的字段分组：基本信息 / 授权与回调 / 高级端点（小程序为小程序端点）。 */
export function buildFieldGroups(
  providerId: TenantOAuth2ProviderId | undefined,
  channel: string | undefined,
): readonly OAuthProviderFieldGroup[] {
  const provider = providerId ?? DEFAULT_PROVIDER_ID;
  const resolvedChannel = normalizeChannelForProvider(provider, channel);
  const basic: OAuthProviderFieldGroup = {
    key: 'basic',
    title: '基本信息',
    fields: ['providerId', 'channel', 'enabled', 'clientId', 'clientSecret'],
  };

  if (resolvedChannel === 'mini') {
    return [
      basic,
      { key: 'mini', title: '小程序端点', fields: ['userinfoUrl', 'tokenUrl', 'configJson'] },
    ];
  }

  const endpointFields: readonly OAuthProviderFieldKey[] = provider === 'github'
    ? ['authorizeUrl', 'tokenUrl', 'userinfoUrl']
    : ['authorizeUrl', 'tokenUrl'];

  return [
    basic,
    {
      key: 'callback',
      title: '授权与回调',
      fields: ['redirectUri', 'scope', 'frontendCallbackUri'],
    },
    { key: 'endpoint', title: '高级端点（留空使用默认配置）', fields: endpointFields },
  ];
}

/** 必填矩阵：仅在启用时严格，禁用允许保存不完整草稿。 */
export function isFieldRequired(key: OAuthProviderFieldKey, context: OAuthProviderFormContext): boolean {
  if (key === 'providerId' || key === 'channel') return true;
  if (key === 'clientSecret') return context.enabled && !context.hasStoredSecret;
  if (!context.enabled) return false;

  switch (key) {
    case 'clientId':
      return true;
    case 'redirectUri':
      return context.channel === 'web';
    case 'scope':
      return context.providerId === 'wechat' && context.channel === 'web';
    case 'tokenUrl':
    case 'userinfoUrl':
    case 'configJson':
      return context.providerId === 'wechat' && context.channel === 'mini';
    default:
      return false;
  }
}

/** 必填错误文案：指明启用后缺哪个字段，而不是泛化的“不能为空”。 */
export function requiredMessage(key: OAuthProviderFieldKey, context: OAuthProviderFormContext): string {
  const wechat = context.providerId === 'wechat';
  switch (key) {
    case 'providerId':
      return '请选择 Provider';
    case 'channel':
      return '请选择渠道';
    case 'clientId':
      return wechat ? '启用后必须填写 AppID' : '启用后必须填写 Client ID';
    case 'clientSecret':
      return wechat ? '启用后必须填写 AppSecret' : '启用后必须填写 Client Secret';
    case 'redirectUri':
      return '启用后必须填写 OAuth 回调地址';
    case 'scope':
      return '启用后必须填写 Scope';
    case 'userinfoUrl':
      return '启用后必须填写授权码换会话地址';
    case 'tokenUrl':
      return context.channel === 'mini' ? '启用后必须填写接口调用凭证地址' : '启用后必须填写 Token 地址';
    case 'configJson':
      return '启用后必须填写手机号接口地址';
    default:
      return '该字段为必填项';
  }
}

/** 动态规则：必填随启用状态与 Secret 是否已配置变化，URL 始终校验格式。 */
export function buildFieldRules(
  key: OAuthProviderFieldKey,
  options: OAuthProviderFormContext,
): Rule[] {
  if (key === 'enabled') return [];

  const rules: Rule[] = [];
  if (isFieldRequired(key, options)) {
    rules.push({ required: true, whitespace: true, message: requiredMessage(key, options) });
  }

  if (ABSOLUTE_URL_FIELDS.has(key)) {
    rules.push(absoluteUrlRule());
  } else if (key === 'frontendCallbackUri') {
    rules.push(frontendCallbackUriRule());
  }

  return rules;
}

function absoluteUrlRule(): Rule {
  return {
    validator: (_rule, value) => {
      const text = typeof value === 'string' ? value.trim() : '';
      if (!text || isAbsoluteHttpUrl(text)) return Promise.resolve();
      return Promise.reject(new Error(INVALID_URL_MESSAGE));
    },
  };
}

function frontendCallbackUriRule(): Rule {
  return {
    validator: (_rule, value) => {
      const message = validateFrontendCallbackUri(typeof value === 'string' ? value : '');
      return message ? Promise.reject(new Error(message)) : Promise.resolve();
    },
  };
}

export function isAbsoluteHttpUrl(value: string): boolean {
  return ABSOLUTE_URL_PATTERN.test(value.trim());
}

/**
 * 校验前端承接页：只接受站内相对路径（以 `/` 开头且非 `//`），与服务端保存期/运行时规则一致；
 * 绝对地址、`//host` 协议相对地址与非 http 协议一律拒绝。
 */
export function validateFrontendCallbackUri(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (text.startsWith('/') && !text.startsWith('//')) return null;
  return INVALID_FRONTEND_CALLBACK_MESSAGE;
}

/** 字段说明与示例：短说明进 tooltip，示例进 placeholder，密钥类提示进 extra。 */
export function getFieldMeta(
  key: OAuthProviderFieldKey,
  context: Pick<OAuthProviderFormContext, 'providerId' | 'channel' | 'hasStoredSecret'>,
): OAuthProviderFieldMeta {
  const github = context.providerId === 'github';
  const mini = context.channel === 'mini';

  switch (key) {
    case 'providerId':
      return {
        label: 'Provider',
        tooltip: '第三方登录提供方。GitHub 只支持 Web；微信支持 Web 与小程序，小程序使用独立凭据。',
        placeholder: '请选择 Provider',
      };
    case 'channel':
      return {
        label: '渠道',
        tooltip: 'Web 走浏览器授权回调；小程序走 jscode2session 直连登录，两者凭据相互独立。',
        placeholder: '请选择渠道',
      };
    case 'enabled':
      return {
        label: '启用',
        tooltip: '关闭后本企业该渠道的第三方登录立即失效，也不会回退到 YAML 默认凭据；允许保存不完整草稿。',
        extra: '停用后覆盖 YAML 默认配置',
      };
    case 'clientId':
      return github
        ? {
            label: 'Client ID',
            tooltip: 'GitHub OAuth App 的 Client ID，用于拼装授权页地址。',
            placeholder: '如 Iv1.1a2b3c4d5e6f7g8h',
          }
        : {
            label: 'AppID',
            tooltip: mini ? '小程序的 AppID，与 AppSecret 配对使用。' : '微信开放平台网站应用的 AppID，与 AppSecret 配对使用。',
            placeholder: '如 wx1234567890abcdef',
          };
    case 'clientSecret': {
      const secretLabel = github ? 'Client Secret' : 'AppSecret';
      return {
        label: secretLabel,
        tooltip: `${secretLabel} 只用于服务端换取令牌，前端不参与、接口不回显。`,
        placeholder: context.hasStoredSecret ? '留空保留已保存的密钥' : `请填写 ${secretLabel}`,
        extra: context.hasStoredSecret
          ? '已配置密钥：留空表示保留原值，填写新值将覆盖'
          : '保存后加密存储，任何接口都不会回显明文',
      };
    }
    case 'redirectUri':
      return {
        label: 'OAuth 回调地址',
        tooltip: github
          ? '必须与 GitHub OAuth App 后台的 Authorization callback URL 完全一致，否则授权会被拒绝。'
          : '微信开放平台网站应用的授权回调地址，域名需与后台配置的授权回调域一致。',
        placeholder: github
          ? '如 https://api.example.com/api/auth/github/callback'
          : '如 https://api.example.com/api/auth/wechat/web/callback',
      };
    case 'scope':
      return github
        ? {
            label: 'Scope',
            tooltip: '向 GitHub 申请的权限范围，留空沿用默认值 read:user user:email。',
            placeholder: '如 read:user user:email',
          }
        : {
            label: 'Scope',
            tooltip: 'snsapi_login 静默扫码；snsapi_userinfo 需要用户确认授权，留空沿用默认值。',
            placeholder: '如 snsapi_login',
          };
    case 'authorizeUrl':
      return {
        label: '授权地址',
        tooltip: '浏览器跳转的授权页地址，留空沿用默认端点。',
        placeholder: github
          ? 'https://github.com/login/oauth/authorize'
          : 'https://open.weixin.qq.com/connect/qrconnect',
      };
    case 'tokenUrl':
      if (mini) {
        return {
          label: '接口调用凭证地址（access_token）',
          tooltip: '获取小程序 access_token 的接口地址，手机号接口依赖该凭证。',
          placeholder: 'https://api.weixin.qq.com/cgi-bin/token',
        };
      }
      return {
        label: 'Token 地址',
        tooltip: '授权码换取 access_token 的接口地址，留空沿用默认端点。',
        placeholder: github
          ? 'https://github.com/login/oauth/access_token'
          : 'https://api.weixin.qq.com/sns/oauth2/access_token',
      };
    case 'userinfoUrl':
      if (mini) {
        return {
          label: '授权码换会话地址（jscode2session）',
          tooltip: '小程序 wx.login 得到的 code 在这里换取 openid 与 session_key。',
          placeholder: 'https://api.weixin.qq.com/sns/jscode2session',
        };
      }
      return {
        label: '用户信息地址',
        tooltip: '拉取 GitHub 用户资料的接口地址，留空沿用默认端点。',
        placeholder: 'https://api.github.com/user',
      };
    case 'configJson':
      return {
        label: '手机号接口地址',
        tooltip: '微信小程序获取手机号的接口地址；字段名沿用 configJson 以兼容历史配置。',
        placeholder: 'https://api.weixin.qq.com/wxa/business/getuserphonenumber',
        extra: '需要有效的 access_token 才能调用',
      };
    case 'frontendCallbackUri':
      return {
        label: '前端承接页',
        tooltip: '登录成功后浏览器跳转的前端页面，只填本站相对路径（以 / 开头），留空沿用默认值。',
        placeholder: github ? '/login/github-callback' : '/login/wechat-callback',
      };
    default:
      return { label: String(key), tooltip: '' };
  }
}

/** 提交前归一化：去首尾空格，丢弃与当前 Provider/渠道无关的字段，Secret 留空则不传。 */
export function toUpsertRequest(values: OAuthProviderFormValues): UpsertTenantOAuth2ProviderReq {
  const providerId = values.providerId ?? DEFAULT_PROVIDER_ID;
  const channel = normalizeChannelForProvider(providerId, values.channel);
  const payload: UpsertTenantOAuth2ProviderReq = {
    providerId,
    channel,
    enabled: values.enabled !== false,
  };

  for (const key of TEXT_FIELDS) {
    if (!isFieldVisible(key, providerId, channel)) continue;
    const value = normalizeOptionalText(values[key] ?? '');
    if (value) payload[key] = value;
  }

  const secret = normalizeOptionalText(values.clientSecret ?? '');
  if (secret) payload.clientSecret = secret;

  return payload;
}

/** 响应转表单值：渠道转小写、Secret 始终留空，保证编辑时不回显。 */
export function toFormValues(row?: TenantOAuth2Provider | null): OAuthProviderFormValues {
  if (!row) {
    return {
      providerId: DEFAULT_PROVIDER_ID,
      channel: DEFAULT_CHANNEL,
      enabled: true,
      clientSecret: '',
    };
  }

  const providerId: TenantOAuth2ProviderId = row.providerId?.trim().toLowerCase() === 'wechat' ? 'wechat' : 'github';
  return {
    providerId,
    channel: normalizeChannelForProvider(providerId, row.channel),
    enabled: row.enabled === true,
    clientId: row.clientId,
    clientSecret: '',
    redirectUri: row.redirectUri,
    scope: row.scope,
    authorizeUrl: row.authorizeUrl,
    tokenUrl: row.tokenUrl,
    userinfoUrl: row.userinfoUrl,
    frontendCallbackUri: row.frontendCallbackUri,
    configJson: row.configJson,
  };
}

function normalizeOptionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}
