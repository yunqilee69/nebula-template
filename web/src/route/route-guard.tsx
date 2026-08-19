import { useSyncExternalStore, type PropsWithChildren, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { ExceptionResult } from '@/layouts/exception-result';
import { isSessionExpiredPending, subscribeSessionExpiredPending } from '@/utils/auth/session-expired';
import { createLoginRedirectPath } from '@/utils/auth/return-path';
import type { PermissionRequirement } from '@/utils/permissions';
import { hasPermission } from '@/utils/permissions';
import { RouteLoading } from './route-loading';

interface RouteGuardProps extends PropsWithChildren {
  requiresAuth?: boolean;
  permission?: PermissionRequirement;
  loginPath?: string;
  loadingElement?: ReactNode;
  forbiddenElement?: ReactNode;
}

export function RouteGuard({
  requiresAuth,
  permission,
  loginPath = '/login',
  loadingElement = <RouteLoading />,
  forbiddenElement = <ExceptionResult status="403" subTitle="你没有访问该内容的权限" />,
  children,
}: RouteGuardProps) {
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);
  const loading = useAuthStore((state) => state.loading);
  const location = useLocation();
  const sessionExpiredPending = useSyncExternalStore(
    subscribeSessionExpiredPending,
    isSessionExpiredPending,
    () => false,
  );

  if (loading) {
    return <>{loadingElement}</>;
  }

  if (requiresAuth && !user && !sessionExpiredPending) {
    return <Navigate to={createLoginRedirectPath(loginPath, `${location.pathname}${location.search}${location.hash}`)} replace />;
  }

  if (!hasPermission(permissions, permission, { roles })) {
    return <>{forbiddenElement}</>;
  }

  return <>{children}</>;
}
