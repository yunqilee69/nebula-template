import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public application hooks', () => {
  it('exposes app-wide hooks from src/hooks', async () => {
    const [{ useNebulaTheme }, { useNebulaI18n }, { useNotice }] = await Promise.all([
      import('./use-nebula-theme'),
      import('./use-nebula-i18n'),
      import('./use-notice'),
    ]);

    expect(typeof useNebulaTheme).toBe('function');
    expect(typeof useNebulaI18n).toBe('function');
    expect(typeof useNotice).toBe('function');
  });

  it('does not expose app-wide hooks from their old module locations', async () => {
    expect(existsSync(resolve(__dirname, '../i18n/use-nebula-i18n.ts'))).toBe(false);

    const themeContext = await import('../providers/theme-provider');

    expect(Object.prototype.hasOwnProperty.call(themeContext, 'useNebulaTheme')).toBe(false);
  });
});
