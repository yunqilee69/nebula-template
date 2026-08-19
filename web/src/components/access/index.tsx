import type { PropsWithChildren, ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import type { PermissionMatchMode, PermissionRequirement } from '@/utils/permissions';
import { hasPermission } from '@/utils/permissions';

interface AccessProps extends PropsWithChildren {
  permission?: PermissionRequirement;
  mode?: PermissionMatchMode;
  fallback?: ReactNode;
}

export function Access({ permission, mode, fallback = null, children }: AccessProps) {
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);

  if (!hasPermission(permissions, permission, { mode, roles })) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
