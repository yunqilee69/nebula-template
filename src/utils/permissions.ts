export type PermissionRequirement = string | readonly string[];
export type PermissionMatchMode = 'any' | 'all';

export interface PermissionCheckOptions {
  mode?: PermissionMatchMode;
  roles?: readonly string[];
  superRoles?: readonly string[];
}

const defaultSuperRoles = ['ADMIN', 'SUPER_ADMIN'];

export function createPermissionCode(resourceType: string, resourceCode: string, effect = 'Allow'): string {
  return `${resourceType}:${resourceCode}:${effect}`;
}

function hasSuperRole(roles: readonly string[] = [], superRoles: readonly string[] = defaultSuperRoles): boolean {
  return roles.some((role) => superRoles.includes(role));
}

function matchPermission(ownedPermission: string, requiredPermission: string): boolean {
  if (ownedPermission === '*' || ownedPermission === requiredPermission) {
    return true;
  }

  const segments = ownedPermission.split(':', 3);
  if (segments.length === 3 && segments[2].toLowerCase() === 'allow' && segments[1] === requiredPermission) {
    return true;
  }

  if (!ownedPermission.endsWith('*')) {
    return false;
  }

  return requiredPermission.startsWith(ownedPermission.slice(0, -1));
}

function hasSinglePermission(permissions: readonly string[], required: string): boolean {
  return permissions.some((permission) => matchPermission(permission, required));
}

export function hasPermission(
  permissions: readonly string[],
  required?: PermissionRequirement,
  options: PermissionCheckOptions = {},
): boolean {
  if (!required || (Array.isArray(required) && required.length === 0)) {
    return true;
  }

  if (hasSuperRole(options.roles, options.superRoles)) {
    return true;
  }

  const requiredPermissions = Array.isArray(required) ? required : [required];
  const mode = options.mode ?? 'any';

  return mode === 'all'
    ? requiredPermissions.every((permission) => hasSinglePermission(permissions, permission))
    : requiredPermissions.some((permission) => hasSinglePermission(permissions, permission));
}
