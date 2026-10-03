/**
 * 权限 Hook（React）。逻辑判定全部委托给纯函数 `auth/permission.ts`。
 *
 * <p>该文件依赖 React 运行时，未在无 RN/React 工具链的环境编译（见功能说明书交付边界）。
 * 纯判定逻辑的测试在 `test/permission.test.ts` 覆盖。</p>
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  createPermissionChecker,
  type PermissionChecker,
  type PermissionRequirement,
  type PermissionCheckOptions,
} from './permission.ts';

export interface PermissionContextValue {
  permissions: readonly string[];
  roles: readonly string[];
  superRoles?: readonly string[];
}

const emptyContext: PermissionContextValue = { permissions: [], roles: [] };

export const PermissionContext = createContext<PermissionContextValue>(emptyContext);

export function PermissionProvider({
  permissions,
  roles,
  superRoles,
  children,
}: PermissionContextValue & { children?: ReactNode }) {
  const value = useMemo(
    () => ({ permissions, roles, ...(superRoles ? { superRoles } : {}) }),
    [permissions, roles, superRoles],
  );
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

/** 返回一个权限判定器；判定语义与 `hasPermission` 完全一致。 */
export function usePermission(): PermissionChecker {
  const context = useContext(PermissionContext);
  return useMemo(
    () => createPermissionChecker(context.permissions, context.roles, context.superRoles),
    [context.permissions, context.roles, context.superRoles],
  );
}

export type { PermissionChecker, PermissionRequirement, PermissionCheckOptions };
