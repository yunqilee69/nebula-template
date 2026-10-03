/**
 * 页面组件注册表：后端菜单的 `component` 字符串 → 页面组件。
 *
 * <p>移动端与 `web/` 的映射表<b>不同</b>，不可复用。采用 <b>fail-closed</b>：
 * 未知/缺失 component 一律解析为「占位页」，绝不返回 undefined 造成白屏。</p>
 */

/** 占位页标记（未识别菜单/组件时使用）。 */
export const PLACEHOLDER_SCREEN_KIND = 'nebula.placeholder';

export interface PlaceholderScreen {
  kind: typeof PLACEHOLDER_SCREEN_KIND;
  /** 原始 component 字符串，便于排障。 */
  component?: string;
}

export function createPlaceholderScreen(component?: string): PlaceholderScreen {
  const screen: PlaceholderScreen = { kind: PLACEHOLDER_SCREEN_KIND };
  if (component !== undefined) screen.component = component;
  return screen;
}

export function isPlaceholderScreen(value: unknown): value is PlaceholderScreen {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === PLACEHOLDER_SCREEN_KIND
  );
}

/** 注册表接口。 */
export interface ScreenRegistry {
  register(component: string, screen: unknown): void;
  has(component?: string): boolean;
  /** 解析组件；未注册返回占位页（fail-closed）。 */
  resolve(component?: string): unknown;
}

export function createScreenRegistry(initial?: Record<string, unknown>): ScreenRegistry {
  const map = new Map<string, unknown>(Object.entries(initial ?? {}));

  const has = (component?: string): boolean =>
    typeof component === 'string' && component.trim() !== '' && map.has(component);

  return {
    register(component, screen) {
      map.set(component, screen);
    },
    has,
    resolve(component) {
      if (has(component)) return map.get(component as string);
      return createPlaceholderScreen(component);
    },
  };
}
