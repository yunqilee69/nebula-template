import type { FrontendInitResp } from '../../../packages/client-sdk/index.ts';

/** 国际化默认语言与请求头（对齐服务端下发的 `defaultPreference` / `defaultLocale`）。 */

export const DEFAULT_LOCALE = 'zh-CN';

/** 解析生效语言：用户偏好 > 前端默认 > 内置默认。 */
export function resolveLocale(init: FrontendInitResp | null | undefined): string {
  return (
    init?.defaultPreference?.localeTag ??
    init?.frontendConfig?.defaultLocale ??
    DEFAULT_LOCALE
  );
}

/** 构造 `Accept-Language`；服务端按此返回国际化 message。 */
export function buildAcceptLanguage(locale: string): string {
  const normalized = locale.trim() || DEFAULT_LOCALE;
  const [language] = normalized.split('-');
  if (!language || language === normalized) return normalized;
  return `${normalized},${language}`;
}
