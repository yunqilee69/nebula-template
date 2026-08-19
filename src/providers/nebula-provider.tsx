import { App as AntdApp, ConfigProvider, theme as antdTheme, type ThemeConfig } from 'antd';
import { StyleProvider, ThemeProvider as AntdStyleThemeProvider } from 'antd-style';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useEffect, type PropsWithChildren } from 'react';
import { NebulaBrandProvider, useNebulaBrand, type NebulaBrandConfig } from '@/providers/brand-context';
import { NoticeProvider, type NoticeConfig } from '@/providers/notice';
import { NebulaLoginBadgeProvider } from '@/providers/login-badge-provider';
import { SessionExpiredModal } from '@/providers/session-expired-modal';
import type { AuthAdapter, LoginBadgeOptions } from '@/types/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useNebulaTheme } from '@/hooks/use-nebula-theme';
import { useLocaleStore } from '@/stores/locale-store';
import { NebulaThemeProvider, type NebulaThemeMode } from '@/providers/theme-provider';
import { defaultDarkTheme, defaultLightTheme } from '@/providers/themes';

const antdLocales = { 'zh-CN': zhCN, 'en-US': enUS } as const;

const themeModeAttribute = 'data-nebula-theme';

interface NebulaProviderProps extends PropsWithChildren {
  authAdapter?: AuthAdapter;
  loginBadge?: LoginBadgeOptions;
  /** Startup-level defaults that package consumers can override before rendering the app. */
  brand?: NebulaBrandConfig;
  defaultThemeMode?: NebulaThemeMode;
  lightTheme?: ThemeConfig;
  darkTheme?: ThemeConfig;
  notice?: NoticeConfig;
}

function AntdProviderBridge({ children, lightTheme, darkTheme, notice }: PropsWithChildren<Pick<NebulaProviderProps, 'lightTheme' | 'darkTheme' | 'notice'>>) {
  const mode = useNebulaTheme((state) => state.mode);
  const locale = useLocaleStore((state) => state.locale);
  const themeConfig = mode === 'dark' ? darkTheme ?? defaultDarkTheme : lightTheme ?? defaultLightTheme;

  return (
    <ConfigProvider locale={antdLocales[locale]} theme={themeConfig}>
      <StyleProvider>
        <AntdStyleThemeProvider appearance={mode} theme={themeConfig}>
          <NebulaThemeDomBridge mode={mode} />
          <AntdApp>
            <NoticeProvider options={notice}>{children}</NoticeProvider>
          </AntdApp>
        </AntdStyleThemeProvider>
      </StyleProvider>
    </ConfigProvider>
  );
}

function NebulaThemeDomBridge({ mode }: { mode: NebulaThemeMode }) {
  const { token } = antdTheme.useToken();

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute(themeModeAttribute, mode);
    root.style.colorScheme = mode;
    root.style.setProperty('--nebula-color-bg-layout', token.colorBgLayout);
    root.style.setProperty('--nebula-color-bg-container', token.colorBgContainer);
    root.style.setProperty('--nebula-color-bg-elevated', token.colorBgElevated);
    root.style.setProperty('--nebula-color-text', token.colorText);
    root.style.setProperty('--nebula-color-text-secondary', token.colorTextSecondary);
    root.style.setProperty('--nebula-color-border', token.colorBorderSecondary);
    root.style.setProperty('--nebula-color-primary', token.colorPrimary);
    root.style.setProperty('--nebula-border-radius-lg', `${token.borderRadiusLG}px`);
    root.style.setProperty('--nebula-shadow-secondary', token.boxShadowSecondary);

    return () => {
      root.removeAttribute(themeModeAttribute);
      root.style.colorScheme = '';
      root.style.removeProperty('--nebula-color-bg-layout');
      root.style.removeProperty('--nebula-color-bg-container');
      root.style.removeProperty('--nebula-color-bg-elevated');
      root.style.removeProperty('--nebula-color-text');
      root.style.removeProperty('--nebula-color-text-secondary');
      root.style.removeProperty('--nebula-color-border');
      root.style.removeProperty('--nebula-color-primary');
      root.style.removeProperty('--nebula-border-radius-lg');
      root.style.removeProperty('--nebula-shadow-secondary');
    };
  }, [mode, token]);

  return null;
}

function ensureFaviconLink(): HTMLLinkElement {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (existing) {
    return existing;
  }

  const link = document.createElement('link');
  link.rel = 'icon';
  document.head.appendChild(link);
  return link;
}

function NebulaBrandMetadata() {
  const resolvedBrand = useNebulaBrand();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = resolvedBrand.title;

    if (resolvedBrand.faviconHref) {
      ensureFaviconLink().href = resolvedBrand.faviconHref;
    }
  }, [resolvedBrand.title, resolvedBrand.faviconHref]);

  return null;
}

export function NebulaProvider({ authAdapter, loginBadge, brand, defaultThemeMode = 'light', lightTheme, darkTheme, notice, children }: NebulaProviderProps) {
  const refreshUser = useAuthStore((state) => state.refreshUser);

  useEffect(() => {
    void refreshUser(authAdapter);
  }, [authAdapter, refreshUser]);

  return (
    <NebulaBrandProvider brand={brand}>
      <NebulaBrandMetadata />
      <NebulaThemeProvider defaultMode={defaultThemeMode}>
        <AntdProviderBridge lightTheme={lightTheme} darkTheme={darkTheme} notice={notice}>
          <NebulaLoginBadgeProvider loginBadge={loginBadge}>
            <SessionExpiredModal />
            {children}
          </NebulaLoginBadgeProvider>
        </AntdProviderBridge>
      </NebulaThemeProvider>
    </NebulaBrandProvider>
  );
}
