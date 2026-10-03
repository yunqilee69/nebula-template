import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyScanValue, createScanHandler, normalizeScanValue } from '../src/components/scan.ts';
import { buildAcceptLanguage, resolveLocale } from '../src/i18n/locale.ts';
import { resolveTheme } from '../src/theme/theme.ts';

test('ScanTest.testNormalizeAndClassify', () => {
  assert.equal(normalizeScanValue('  abc  '), 'abc');
  assert.equal(normalizeScanValue('   '), null);
  assert.equal(classifyScanValue(''), 'EMPTY');
  assert.equal(classifyScanValue('https://example.com/x'), 'URL');
  assert.equal(classifyScanValue('wms://order/1'), 'DEEPLINK');
  assert.equal(classifyScanValue('6901234567890'), 'TEXT');
});

test('ScanTest.testDedupeWindow', () => {
  let clock = 0;
  const scanned: string[] = [];
  const handler = createScanHandler({
    onScan: (value) => scanned.push(value),
    dedupeWindowMs: 800,
    now: () => clock,
  });
  assert.equal(handler.handle('CODE-1', 'GUN'), 'CODE-1');
  assert.equal(handler.handle('CODE-1', 'GUN'), null, '窗口内重复扫码被忽略');
  clock = 1000;
  assert.equal(handler.handle('CODE-1', 'GUN'), 'CODE-1');
  assert.deepEqual(scanned, ['CODE-1', 'CODE-1']);
});

test('MiscTest.testLocaleAndThemeResolution', () => {
  assert.equal(resolveLocale(null), 'zh-CN');
  assert.equal(
    resolveLocale({ defaultPreference: { localeTag: 'en-US' }, frontendConfig: { defaultLocale: 'zh-CN' } }),
    'en-US',
  );
  assert.equal(resolveLocale({ frontendConfig: { defaultLocale: 'ja-JP' } }), 'ja-JP');
  assert.equal(buildAcceptLanguage('zh-CN'), 'zh-CN,zh');
  assert.equal(buildAcceptLanguage(''), 'zh-CN,zh');

  assert.equal(resolveTheme(null).themeCode, 'default');
  const theme = resolveTheme({ defaultTheme: { themeCode: 'dark', themeConfig: { primary: '#000' } } });
  assert.equal(theme.themeCode, 'dark');
  assert.equal(theme.colors.primary, '#000');
});
