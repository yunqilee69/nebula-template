/**
 * `<Access>` 权限组件：缺权限时<b>隐藏（不渲染）</b>，而不是禁用。
 *
 * <p>依赖 React 运行时，未在无 RN/React 工具链的环境编译（见功能说明书交付边界）。
 * 组件背后的判定逻辑由 `auth/permission.ts` 的纯函数承担并被单测覆盖。</p>
 */
import type { ReactNode } from 'react';
import { usePermission } from './usePermission.tsx';
import type { PermissionRequirement, PermissionCheckOptions } from './permission.ts';

export interface AccessProps {
  /** 所需权限码，单个或数组。 */
  permission?: PermissionRequirement;
  /** `any`（默认）或 `all`。 */
  mode?: PermissionCheckOptions['mode'];
  /** 无权限时的渲染内容，默认不渲染（隐藏）。 */
  fallback?: ReactNode;
  children?: ReactNode;
}

export function Access({ permission, mode, fallback = null, children }: AccessProps) {
  const can = usePermission();
  const allowed = permission === undefined ? true : can(permission, mode ? { mode } : {});
  return <>{allowed ? children : fallback}</>;
}
