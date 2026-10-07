import type { PermissionDraftEffect, PermissionGrantResp } from '@/types/permission';

/** 授权树里权限效果文案所在的 i18n 前缀。 */
export type PermissionEffectI18nPrefix = 'auth.buttonPermission.effects' | 'auth.apiPermission.effects';

/** 下一个三态值：未设置 → 授权 → 拒绝 → 未设置。 */
export function getNextPermissionEffect(effect: PermissionDraftEffect): PermissionDraftEffect {
  if (effect === 'none') return 'Allow';
  if (effect === 'Allow') return 'Deny';
  return 'none';
}

/** 以 resourceId 为键，把授权记录整理成「资源 → 效果」映射。 */
export function toPermissionEffects(grants: PermissionGrantResp[]): Record<string, PermissionDraftEffect> {
  return Object.fromEntries(grants.map((grant) => [grant.resourceId, grant.effect]));
}

/** 取某状态对应的 i18n 文案 key。 */
export function getPermissionEffectMessageKey(effect: PermissionDraftEffect, prefix: PermissionEffectI18nPrefix) {
  const suffix: 'none' | 'allow' | 'deny' = effect === 'Allow' ? 'allow' : effect === 'Deny' ? 'deny' : 'none';
  return `${prefix}.${suffix}` as const;
}
