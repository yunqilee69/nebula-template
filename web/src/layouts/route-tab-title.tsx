import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

interface RouteTabTitleContextValue {
  /** 当前路由标签的 path（pathname + search） */
  path: string;
  setTitle: (path: string, title: string) => void;
}

const RouteTabTitleContext = createContext<RouteTabTitleContextValue | null>(null);

interface RouteTabTitleProviderProps {
  value: RouteTabTitleContextValue;
  children: ReactNode;
}

export function RouteTabTitleProvider({ value, children }: RouteTabTitleProviderProps) {
  return <RouteTabTitleContext.Provider value={value}>{children}</RouteTabTitleContext.Provider>;
}

/**
 * 页面可通过该 hook 覆盖当前路由标签的展示名称，例如详情页加载完数据后显示业务名称。
 * 手工重命名优先于这里设置的名称；未调用或传空值时沿用菜单名。
 */
export function useRouteTabTitle(title: string | null | undefined): void {
  const context = useContext(RouteTabTitleContext);
  const trimmed = title?.trim();

  useEffect(() => {
    if (!context || !trimmed) return;
    context.setTitle(context.path, trimmed);
  }, [context, trimmed]);
}
