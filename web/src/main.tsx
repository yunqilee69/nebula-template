import { useEffect, useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import '@/styles/index.css';
import { NebulaProvider } from '@/providers/nebula-provider';
import { RealtimeProvider } from '@/providers/realtime-provider';
import type { NebulaBrandConfig } from '@/providers/brand-context';
import { defaultDarkTheme, defaultLightTheme } from '@/providers/themes';
import { TenantBrandLogo } from '@/components/tenant-brand-logo';
import { toCurrentUser } from '@/utils/auth/current-user';
import { getStoredAccessToken, getStoredRefreshToken } from '@/utils/auth/token-session';
import { authService } from '@/api/auth';
import { builtInMenuComponentRegistry } from '@/route/menu-component-registry';
import { createNebulaRouter } from '@/route/create-nebula-router';
import type { NebulaRouteObject } from '@/route/types';
import type { LoginBadgeOptions } from '@/types/auth';
import type { TenantBranding } from '@/types/tenant-profile';
import type { ThemeConfig } from 'antd';
import { useAuthStore } from '@/stores/auth-store';
import { useTenantBrandStore } from '@/stores/tenant-brand-store';

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

function buildTenantBrand(tenant: TenantBranding | null): NebulaBrandConfig | undefined {
  if (!tenant) return undefined;
  const name = tenant.name?.trim() || tenant.shortName?.trim() || tenant.code?.trim();
  if (!name) return undefined;
  const logoUrl = tenant.logo?.trim();
  const loginLogoUrl = tenant.branding?.loginLogo?.trim() || logoUrl;
  return {
    name,
    title: name,
    logo: logoUrl ? <TenantBrandLogo src={logoUrl} alt={name} height={26} /> : undefined,
    loginLogo: loginLogoUrl
      ? <TenantBrandLogo src={loginLogoUrl} alt={name} height={40} resolveStorage={false} />
      : undefined,
    loginTitle: tenant.branding?.loginTitle?.trim() || name,
    loginSubtitle: tenant.branding?.loginSubtitle?.trim(),
    loginBackground: tenant.branding?.loginBackground?.trim(),
    themeColor: tenant.branding?.themeColor?.trim(),
    faviconHref: tenant.branding?.favicon?.trim() || logoUrl,
  };
}

function applyPrimaryColor(theme: ThemeConfig, themeColor?: string): ThemeConfig | undefined {
  if (!themeColor) return undefined;
  return { ...theme, token: { ...(theme.token ?? {}), colorPrimary: themeColor } };
}

export function App() {
  const backendMenus = useAuthStore((state) => state.user?.menuList);
  const tenant = useTenantBrandStore((state) => state.tenant);
  const loadTenantBrand = useTenantBrandStore((state) => state.load);

  useEffect(() => {
    void loadTenantBrand();
  }, [loadTenantBrand]);

  const tenantBrand = useMemo(() => buildTenantBrand(tenant), [tenant]);
  const lightTheme = useMemo(
    () => applyPrimaryColor(defaultLightTheme, tenantBrand?.themeColor),
    [tenantBrand?.themeColor],
  );
  const darkTheme = useMemo(
    () => applyPrimaryColor(defaultDarkTheme, tenantBrand?.themeColor),
    [tenantBrand?.themeColor],
  );
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
    <NebulaProvider
      authAdapter={authAdapter}
      loginBadge={loginBadgeOptions}
      brand={tenantBrand}
      lightTheme={lightTheme}
      darkTheme={darkTheme}
    >
      {/* 站内信实时通道：以登录用户为生命周期，登录建连、登出/切换用户断连 */}
      <RealtimeProvider>
        <RouterProvider key={routerKey} router={router} />
      </RealtimeProvider>
    </NebulaProvider>
  );
}

export default App;
