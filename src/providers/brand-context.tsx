import { createContext, useContext, useMemo, type PropsWithChildren, type ReactNode } from 'react';
import { nebulaTokens } from '@/providers/tokens';

export interface NebulaBrandConfig {
  /** App-wide brand name shown by layouts when no local title override is provided. */
  name?: string;
  /** Browser tab title set by NebulaProvider at startup; falls back to name. */
  title?: string;
  /** App-wide brand logo shown by layouts when no local logo override is provided. */
  logo?: ReactNode;
  /** Browser favicon href set by NebulaProvider at startup. */
  faviconHref?: string;
}

export interface ResolvedNebulaBrandConfig {
  name: string;
  title: string;
  logo?: ReactNode;
  faviconHref?: string;
}

const defaultBrand: ResolvedNebulaBrandConfig = {
  name: nebulaTokens.brandName,
  title: nebulaTokens.brandName,
};

const NebulaBrandContext = createContext<ResolvedNebulaBrandConfig>(defaultBrand);

export function resolveNebulaBrand(brand?: NebulaBrandConfig): ResolvedNebulaBrandConfig {
  const name = brand?.name?.trim() || defaultBrand.name;
  const title = brand?.title?.trim() || name;

  return {
    name,
    title,
    logo: brand?.logo,
    faviconHref: brand?.faviconHref,
  };
}

export function NebulaBrandProvider({ brand, children }: PropsWithChildren<{ brand?: NebulaBrandConfig }>) {
  const value = useMemo(() => resolveNebulaBrand(brand), [brand]);

  return <NebulaBrandContext.Provider value={value}>{children}</NebulaBrandContext.Provider>;
}

export function useNebulaBrand(): ResolvedNebulaBrandConfig {
  return useContext(NebulaBrandContext);
}
