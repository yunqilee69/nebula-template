import type { AuthInitResp, BuiltInLoginMethodKey, NebulaExtraLoginBadge } from '@/types/auth';

export function getBuiltInLoginMethods(config: Partial<AuthInitResp>): BuiltInLoginMethodKey[] {
  const methods: BuiltInLoginMethodKey[] = [];

  if (config.usernameEnabled) {
    methods.push('password');
  }
  if (config.phoneEnabled) {
    methods.push('phone');
  }
  if (config.emailEnabled) {
    methods.push('email');
  }
  if (config.githubEnabled) {
    methods.push('github');
  }
  // 浏览器登录页只能走网站应用（扫码）渠道；小程序渠道由小程序端自身接入，
  // 只在网站应用凭据齐备时展示微信入口，避免入口点了就报错。
  if (config.wechatWebEnabled ?? config.wechatEnabled) {
    methods.push('wechat');
  }

  return methods;
}

export function mergeLoginBadges(
  builtIns: BuiltInLoginMethodKey[],
  extraBadges: NebulaExtraLoginBadge[],
): string[] {
  const seen = new Set<string>(builtIns);
  const result: string[] = [...builtIns];

  for (const badge of extraBadges) {
    if (!seen.has(badge.key)) {
      seen.add(badge.key);
      result.push(badge.key);
    }
  }

  return result;
}
