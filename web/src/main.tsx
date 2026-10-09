import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import '@/styles/index.css';
import { NebulaProvider } from '@/providers/nebula-provider';
import { RealtimeProvider } from '@/providers/realtime-provider';
import { toCurrentUser } from '@/utils/auth/current-user';
import { getStoredAccessToken, getStoredRefreshToken } from '@/utils/auth/token-session';
import { authService } from '@/api/auth';
import { builtInMenuComponentRegistry } from '@/route/menu-component-registry';
import { createNebulaRouter } from '@/route/create-nebula-router';
import type { NebulaRouteObject } from '@/route/types';
import type { LoginBadgeOptions } from '@/types/auth';
import { useAuthStore } from '@/stores/auth-store';

// Permission-controlled business routes are generated from backend menu records via the component registry below.
// If the backend does not provide any usable page, the shell renders its empty-module fallback at the root.
const routes: NebulaRouteObject[] = [];

const authAdapter = {
  getCurrentUser: async () => {
    if (!getStoredAccessToken() && !getStoredRefreshToken()) {
      return null;
    }

    try {
      const currentUser = await authService.getCurrentUser();
      return currentUser ? toCurrentUser(currentUser) : null;
    } catch {
      return null;
    }
  },
};

const loginBadgeOptions: LoginBadgeOptions = { authService };

export function App() {
  const backendMenus = useAuthStore((state) => state.user?.menuList);
  const routerKey = useMemo(
    () => (backendMenus ? `backend-menu-router:${JSON.stringify(backendMenus)}` : 'static-router'),
    [backendMenus],
  );
  const router = useMemo(
    // Recreate the router when backend menus arrive so dynamic menu routes are registered with the latest permissions.
    () => createNebulaRouter({ routes, backendMenus, componentRegistry: builtInMenuComponentRegistry }),
    [backendMenus],
  );

  return (
    <NebulaProvider authAdapter={authAdapter} loginBadge={loginBadgeOptions}>
      {/* 站内信实时通道：以登录用户为生命周期，登录建连、登出/切换用户断连 */}
      <RealtimeProvider>
        <RouterProvider key={routerKey} router={router} />
      </RealtimeProvider>
    </NebulaProvider>
  );
}

export default App;
