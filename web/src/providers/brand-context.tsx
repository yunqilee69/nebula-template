import { createContext, useContext, useMemo, type PropsWithChildren, type ReactNode } from 'react';
import NebulaLogoSvg from '@/assets/brand/nebula-logo.svg?react';
import { nebulaTokens } from '@/providers/tokens';

/** 登录页页脚展示信息；全部来自租户显式配置，未配置时不渲染对应项。 */
export interface NebulaLoginFooterConfig {
  copyright?: string;
  icp?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
}

export interface NebulaBrandConfig {
  /** App-wide brand name shown by layouts when no local title override is provided. */
  name?: string;
  /** Browser tab title set by NebulaProvider at startup; falls back to name. */
  title?: string;
  /** App-wide brand logo shown by layouts when no local logo override is provided. */
  logo?: ReactNode;
  /** 企业 Logo 地址；认证页按登录尺寸自行渲染，其他布局继续使用 {@link logo}。 */
  logoUrl?: string;
  /** Login page heading; falls back to {@link name}. */
  loginTitle?: string;
  /** Optional login page subtitle. */
  loginSubtitle?: string;
  /** Optional login page background image URL. */
  loginBackground?: string;
  /** Optional primary color override for the tenant. */
  themeColor?: string;
  /** Browser favicon href set by NebulaProvider at startup. */
  faviconHref?: string;
  /** Optional login page footer content. */
  footer?: NebulaLoginFooterConfig;
}

export interface ResolvedNebulaBrandConfig {
  name: string;
  title: string;
  logo?: ReactNode;
  logoUrl?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  loginBackground?: string;
  themeColor?: string;
  faviconHref?: string;
  footer?: NebulaLoginFooterConfig;
}

const defaultBrand: ResolvedNebulaBrandConfig = {
  name: nebulaTokens.brandName,
  title: nebulaTokens.brandName,
  // 标记用 currentColor，颜色跟随侧边栏的 colorPrimary，深浅主题都不用另做一份
  logo: <NebulaLogoSvg width={26} height={26} aria-hidden="true" />,
};

const NebulaBrandContext = createContext<ResolvedNebulaBrandConfig>(defaultBrand);

export function resolveNebulaBrand(brand?: NebulaBrandConfig): ResolvedNebulaBrandConfig {
  const name = brand?.name?.trim() || defaultBrand.name;
  const title = brand?.title?.trim() || name;

  return {
    name,
    title,
    logo: brand?.logo ?? defaultBrand.logo,
    logoUrl: brand?.logoUrl?.trim(),
    loginTitle: brand?.loginTitle?.trim() || name,
    loginSubtitle: brand?.loginSubtitle?.trim(),
    loginBackground: brand?.loginBackground?.trim(),
    themeColor: brand?.themeColor?.trim(),
    faviconHref: brand?.faviconHref,
    footer: normalizeFooter(brand?.footer),
  };
}

function normalizeFooter(footer?: NebulaLoginFooterConfig): NebulaLoginFooterConfig | undefined {
  if (!footer) return undefined;
  const normalized: NebulaLoginFooterConfig = {
    copyright: footer.copyright?.trim() || undefined,
    icp: footer.icp?.trim() || undefined,
    contactEmail: footer.contactEmail?.trim() || undefined,
    contactPhone: footer.contactPhone?.trim() || undefined,
    website: footer.website?.trim() || undefined,
  };
  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

export function NebulaBrandProvider({ brand, children }: PropsWithChildren<{ brand?: NebulaBrandConfig }>) {
  const value = useMemo(() => resolveNebulaBrand(brand), [brand]);

  return <NebulaBrandContext.Provider value={value}>{children}</NebulaBrandContext.Provider>;
}

export function useNebulaBrand(): ResolvedNebulaBrandConfig {
  return useContext(NebulaBrandContext);
}
