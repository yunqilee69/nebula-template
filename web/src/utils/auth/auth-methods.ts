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
