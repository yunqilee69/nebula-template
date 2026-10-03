/**
 * 权限码匹配。纯逻辑，与 `web/src/utils/permissions.ts` 保持同一套语义，避免跨端漂移。
 *
 * <p>规则：
 * <ul>
 *   <li>精确匹配；</li>
 *   <li>三段式：拥有 `TYPE:CODE:Allow`（第三段允许大小写）可命中所需 `CODE`；</li>
 *   <li>通配：拥有以 `*` 结尾时做前缀匹配；</li>
 *   <li>超管短路：角色含 `ADMIN` / `SUPER_ADMIN` 时直接放行；</li>
 *   <li><b>fail-closed</b>：默认 `mode = 'any'`，缺权限返回 false。</li>
 * </ul></p>
 */

export type PermissionRequirement = string | readonly string[];
export type PermissionMatchMode = 'any' | 'all';

export interface PermissionCheckOptions {
  mode?: PermissionMatchMode;
  /** 当前用户角色码。 */
  roles?: readonly string[];
  /** 超管角色码，默认 `['ADMIN', 'SUPER_ADMIN']`。 */
  superRoles?: readonly string[];
}

export const DEFAULT_SUPER_ROLES: readonly string[] = ['ADMIN', 'SUPER_ADMIN'];

/** 生成三段式权限码。 */
export function createPermissionCode(resourceType: string, resourceCode: string, effect = 'Allow'): string {
  return `${resourceType}:${resourceCode}:${effect}`;
}

function hasSuperRole(
  roles: readonly string[] = [],
  superRoles: readonly string[] = DEFAULT_SUPER_ROLES,
): boolean {
  return roles.some((role) => superRoles.includes(role));
}

/** 单个权限码是否命中所需权限。 */
export function matchPermission(ownedPermission: string, requiredPermission: string): boolean {
  if (ownedPermission === '*' || ownedPermission === requiredPermission) return true;

  const segments = ownedPermission.split(':', 3);
  const code = segments[1];
  const effect = segments[2];
  if (segments.length === 3 && effect !== undefined && effect.toLowerCase() === 'allow' && code === requiredPermission) {
    return true;
  }

  if (!ownedPermission.endsWith('*')) return false;
  return requiredPermission.startsWith(ownedPermission.slice(0, -1));
}

function hasSinglePermission(permissions: readonly string[], required: string): boolean {
  return permissions.some((permission) => matchPermission(permission, required));
}

/** 判断是否拥有所需权限。 */
export function hasPermission(
  permissions: readonly string[],
  required?: PermissionRequirement,
  options: PermissionCheckOptions = {},
): boolean {
  if (!required || (Array.isArray(required) && required.length === 0)) return true;
  if (hasSuperRole(options.roles, options.superRoles ?? DEFAULT_SUPER_ROLES)) return true;

  const requiredPermissions = Array.isArray(required) ? required : [required];
  const mode = options.mode ?? 'any';

  return mode === 'all'
    ? requiredPermissions.every((permission) => hasSinglePermission(permissions, permission))
    : requiredPermissions.some((permission) => hasSinglePermission(permissions, permission));
}

/** 权限判定器类型。 */
export type PermissionChecker = (
  required?: PermissionRequirement,
  options?: PermissionCheckOptions,
) => boolean;

/** 用当前用户的权限码/角色码创建一个判定器（供 `<Access>` 与 `usePermission()` 共用）。 */
export function createPermissionChecker(
  permissions: readonly string[],
  roles: readonly string[] = [],
  superRoles: readonly string[] = DEFAULT_SUPER_ROLES,
): PermissionChecker {
  return (required, options = {}) =>
    hasPermission(permissions, required, { ...options, roles: options.roles ?? roles, superRoles });
}
