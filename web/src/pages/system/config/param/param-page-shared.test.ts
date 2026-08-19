import { describe, expect, it } from 'vitest';
import { DataType } from '@/types/param';
import { buildParamPageReq, normalizeParamValue } from './param-page-shared';

describe('buildParamPageReq', () => {
  it('maps table pagination, sorting, and filters to system parameter page requests', () => {
    const legacyParams = {
      pageNum: 2,
      pageSize: 20,
      orderName: 'paramKey',
      orderType: 'asc' as const,
      paramKey: '  site.title  ',
      paramName: '  Site Title  ',
      dataType: DataType.STRING,
      moduleCode: '  system  ',
      renderEnabled: false,
    };

    const req = buildParamPageReq(legacyParams);

    expect(req).toEqual({
      pageNum: 2,
      pageSize: 20,
      orderName: 'paramKey',
      orderType: 'asc',
      paramKey: 'site.title',
      paramName: 'Site Title',
      dataType: DataType.STRING,
      moduleCode: 'system',
    });
    expect(req).not.toHaveProperty('renderEnabled');
  });

  it('uses default pagination and omits empty filters when params are undefined', () => {
    expect(buildParamPageReq()).toEqual({ pageNum: 1, pageSize: 10 });
    expect(buildParamPageReq({ paramKey: ' ', moduleCode: '' })).toEqual({ pageNum: 1, pageSize: 10 });
  });
});

describe('normalizeParamValue', () => {
  it('normalizes scalar values by data type', () => {
    expect(normalizeParamValue('  hello  ', DataType.STRING)).toBe('hello');
    expect(normalizeParamValue('42', DataType.INT)).toBe(42);
    expect(normalizeParamValue('3.14', DataType.DOUBLE)).toBe(3.14);
    expect(normalizeParamValue('true', DataType.BOOLEAN)).toBe(true);
    expect(normalizeParamValue(0, DataType.BOOLEAN)).toBe(false);
    expect(normalizeParamValue(123, DataType.SINGLE)).toBe('123');
  });

  it('normalizes multiple values to a stable API string', () => {
    expect(normalizeParamValue(['  alpha  ', 'beta', '', 'gamma'], DataType.MULTIPLE)).toBe('["alpha","beta","gamma"]');
    expect(normalizeParamValue('["beta","alpha"]', DataType.MULTIPLE)).toBe('["beta","alpha"]');
  });

  it('returns undefined for invalid or empty values', () => {
    expect(normalizeParamValue(undefined, DataType.STRING)).toBeUndefined();
    expect(normalizeParamValue('abc', DataType.INT)).toBeUndefined();
    expect(normalizeParamValue('3.14.15', DataType.DOUBLE)).toBeUndefined();
    expect(normalizeParamValue('maybe', DataType.BOOLEAN)).toBeUndefined();
    expect(normalizeParamValue({ value: 'alpha' }, DataType.MULTIPLE)).toBeUndefined();
  });
});
