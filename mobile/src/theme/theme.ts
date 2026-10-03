import type { FrontendInitResp } from '../../../packages/client-sdk/index.ts';

/** 主题解析（对齐服务端下发的 `defaultTheme`）。 */

export interface ResolvedTheme {
  themeCode: string;
  themeName?: string;
  builtin: boolean;
  colors: Record<string, string>;
}

export const DEFAULT_THEME_CODE = 'default';

export function resolveTheme(init: FrontendInitResp | null | undefined): ResolvedTheme {
  const theme = init?.defaultTheme;
  return {
    themeCode: theme?.themeCode ?? init?.frontendConfig?.defaultThemeCode ?? DEFAULT_THEME_CODE,
    ...(theme?.themeName !== undefined ? { themeName: theme.themeName } : {}),
    builtin: theme?.builtin ?? true,
    colors: theme?.themeConfig ?? {},
  };
}
