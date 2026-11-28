import { App as AntdApp, ConfigProvider, theme as antdTheme, type ThemeConfig } from 'antd';
import { StyleProvider, ThemeProvider as AntdStyleThemeProvider } from 'antd-style';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';
import { useEffect, useRef, type PropsWithChildren } from 'react';
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

/** antd DatePicker/Calendar 面板文案（月份/星期）来自 dayjs 自身 locale，须与 ConfigProvider 同步切换 */
const dayjsLocales = { 'zh-CN': 'zh-cn', 'en-US': 'en' } as const;

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

  useEffect(() => {
    dayjs.locale(dayjsLocales[locale]);
  }, [locale]);

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

interface FaviconSnapshot {
  readonly node: HTMLLinkElement;
  readonly attributes: readonly [string, string][];
}

interface FaviconState {
  readonly originals: FaviconSnapshot[];
  managed: HTMLLinkElement[];
  generation: number;
}

interface ThemeColorSnapshot {
  readonly node: HTMLMetaElement;
  readonly attributes: readonly [string, string][];
}

interface ThemeColorState {
  readonly originals: ThemeColorSnapshot[];
  managed: HTMLMetaElement[];
}

function snapshotFaviconLinks(): FaviconSnapshot[] {
  return [...document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')].map((node) => ({
    node,
    attributes: [...node.attributes].map(({ name, value }) => [name, value] as [string, string]),
  }));
}

function snapshotThemeColorMetas(): ThemeColorSnapshot[] {
  return [...document.head.querySelectorAll<HTMLMetaElement>('meta')]
    .filter((node) => node.getAttribute('name')?.toLowerCase() === 'theme-color')
    .map((node) => ({
      node,
      attributes: [...node.attributes].map(({ name, value }) => [name, value] as [string, string]),
    }));
}

function restoreAttributes(node: Element, attributes: readonly [string, string][]) {
  [...node.attributes].forEach(({ name }) => node.removeAttribute(name));
  attributes.forEach(([name, value]) => node.setAttribute(name, value));
}

function restoreOriginalFavicons(state: FaviconState) {
  state.managed.forEach((node) => node.remove());
  state.managed = [];
  state.originals.forEach(({ node, attributes }) => {
    restoreAttributes(node, attributes);
    if (!node.isConnected) document.head.appendChild(node);
  });
}

function replaceFaviconLinks(current: HTMLLinkElement[], next: HTMLLinkElement[]) {
  if (current.length === 0) {
    const insertionPoint = document.head.querySelector('link[rel~="apple-touch-icon"]');
    next.forEach((node) => {
      if (insertionPoint) {
        document.head.insertBefore(node, insertionPoint);
      } else {
        document.head.appendChild(node);
      }
    });
    return;
  }

  current.forEach((node, index) => {
    const replacement = next[index];
    if (replacement) {
      node.replaceWith(replacement);
    } else {
      node.remove();
    }
  });
}

function restoreOriginalThemeColors(state: ThemeColorState) {
  state.managed.forEach((node) => node.remove());
  state.managed = [];
  state.originals.forEach(({ node, attributes }) => {
    restoreAttributes(node, attributes);
    if (!node.isConnected) document.head.appendChild(node);
  });
}

function applyThemeColor(state: ThemeColorState, themeColor: string | undefined) {
  const normalized = themeColor?.trim();
  if (!normalized) {
    restoreOriginalThemeColors(state);
    return;
  }

  const sourceNodes = state.managed.length > 0
    ? state.managed
    : state.originals.map(({ node }) => node).filter((node) => node.isConnected);
  const nodes = sourceNodes.length > 0 ? sourceNodes : [document.createElement('meta')];
  const nextManaged = nodes.map((sourceNode, index) => {
    const original = state.originals[index];
    const nextNode = sourceNode.cloneNode(true) as HTMLMetaElement;
    if (original) {
      restoreAttributes(nextNode, original.attributes);
    } else {
      nextNode.name = 'theme-color';
    }
    nextNode.content = normalized;
    return nextNode;
  });

  sourceNodes.forEach((node, index) => {
    const replacement = nextManaged[index];
    if (replacement) {
      node.replaceWith(replacement);
    } else {
      node.remove();
    }
  });
  if (sourceNodes.length === 0) {
    nextManaged.forEach((node) => document.head.appendChild(node));
  }
  state.managed = nextManaged;
}

function NebulaBrandMetadata() {
  const resolvedBrand = useNebulaBrand();
  const faviconStateRef = useRef<FaviconState>();
  const themeColorStateRef = useRef<ThemeColorState>();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    faviconStateRef.current = {
      originals: snapshotFaviconLinks(),
      managed: [],
      generation: 0,
    };
    themeColorStateRef.current = {
      originals: snapshotThemeColorMetas(),
      managed: [],
    };

    return () => {
      const faviconState = faviconStateRef.current;
      // Test/document teardown can remove all links before React unmounts. In that case
      // re-appending the snapshot would leak stale defaults into the next document state.
      if (faviconState?.managed.some((node) => node.isConnected)) {
        restoreOriginalFavicons(faviconState);
      }
      const themeColorState = themeColorStateRef.current;
      if (themeColorState?.managed.some((node) => node.isConnected)) {
        restoreOriginalThemeColors(themeColorState);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = resolvedBrand.title;
    const faviconState = faviconStateRef.current;
    const themeColorState = themeColorStateRef.current;
    if (!faviconState || !themeColorState) return;

    faviconState.generation += 1;
    const generation = faviconState.generation;
    const faviconHref = resolvedBrand.faviconHref?.trim();
    if (!faviconHref) {
      restoreOriginalFavicons(faviconState);
    } else {
      const sourceNodes = faviconState.managed.length > 0
        ? faviconState.managed
        : faviconState.originals.map(({ node }) => node).filter((node) => node.isConnected);
      const nodes = sourceNodes.length > 0 ? sourceNodes : [document.createElement('link')];
      const nextManaged = nodes.map((sourceNode, index) => {
        const original = faviconState.originals[index];
        const nextNode = sourceNode.cloneNode(true) as HTMLLinkElement;
        if (original) {
          restoreAttributes(nextNode, original.attributes);
        } else {
          nextNode.rel = 'icon';
        }
        nextNode.href = faviconHref;
        nextNode.onerror = () => {
          if (faviconState.generation !== generation) return;
          restoreOriginalFavicons(faviconState);
        };
        return nextNode;
      });

      replaceFaviconLinks(sourceNodes, nextManaged);
      faviconState.managed = nextManaged;
    }
    applyThemeColor(themeColorState, resolvedBrand.themeColor);
  }, [resolvedBrand.title, resolvedBrand.faviconHref, resolvedBrand.themeColor]);

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
