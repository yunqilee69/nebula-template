import { describe, expect, it } from 'vitest';
import type { NotifyCategoryResp } from '@/types/notify';
import {
  NOTIFY_CATEGORY_FALLBACK,
  resolveNotifyCategoryLabel,
  toNotifyCategoryOptions,
} from './notify-category-options';

function category(code: string, name: string): NotifyCategoryResp {
  return { id: `id-${code}`, code, name };
}

const categories: readonly NotifyCategoryResp[] = [
  category('SECURITY', '安全与账号'),
  category('ANNOUNCEMENT', '公告与运营'),
  category('DEFAULT', '其他通知'),
];

describe('toNotifyCategoryOptions', () => {
  it('maps server categories to select options preserving order', () => {
    expect(toNotifyCategoryOptions(categories)).toEqual([
      { label: '安全与账号', value: 'SECURITY' },
      { label: '公告与运营', value: 'ANNOUNCEMENT' },
      { label: '其他通知', value: 'DEFAULT' },
    ]);
  });

  it('falls back to the code when the server name is blank', () => {
    expect(toNotifyCategoryOptions([{ id: 'id-1', code: 'CUSTOM_X', name: '  ' }])).toEqual([
      { label: 'CUSTOM_X', value: 'CUSTOM_X' },
    ]);
  });
});

describe('resolveNotifyCategoryLabel', () => {
  const options = toNotifyCategoryOptions(categories);

  it('resolves labels for known codes', () => {
    expect(resolveNotifyCategoryLabel('SECURITY', options)).toBe('安全与账号');
    expect(resolveNotifyCategoryLabel('ANNOUNCEMENT', options)).toBe('公告与运营');
  });

  it('treats an empty code as the DEFAULT category', () => {
    expect(NOTIFY_CATEGORY_FALLBACK).toBe('DEFAULT');
    expect(resolveNotifyCategoryLabel(undefined, options)).toBe('其他通知');
    expect(resolveNotifyCategoryLabel('', options)).toBe('其他通知');
  });

  it('keeps unknown codes visible instead of hiding them', () => {
    expect(resolveNotifyCategoryLabel('CUSTOM_X', options)).toBe('CUSTOM_X');
  });

  it('falls back to the default label text when DEFAULT is not in the options', () => {
    expect(resolveNotifyCategoryLabel(undefined, [])).toBe('其他通知');
  });
});
