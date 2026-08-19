import { describe, expect, it } from 'vitest';
import { buildDictItemPageReq, buildDictTypePageReq } from './dict-page-params';

describe('dict page request builders', () => {
  it('builds a dictionary type page request from table query params', () => {
    const req = buildDictTypePageReq({
      pageNum: 3,
      pageSize: 20,
      orderName: 'code',
      orderType: 'asc',
      code: '  SYS  ',
      name: ' System ',
    });

    expect(req).toEqual({
      pageNum: 3,
      pageSize: 20,
      orderName: 'code',
      orderType: 'asc',
      code: 'SYS',
      name: 'System',
    });
  });

  it('builds a dictionary type page request with default pagination when params are empty', () => {
    const req = buildDictTypePageReq({ code: '' });

    expect(req).toEqual({ pageNum: 1, pageSize: 10 });
  });

  it('builds a dictionary item page request from table query params', () => {
    const req = buildDictItemPageReq({
      pageNum: 2,
      pageSize: 50,
      orderName: 'sort',
      orderType: 'desc',
      dictCode: '  SYS_STATUS ',
      name: ' Enabled ',
      enabled: false,
    });

    expect(req).toEqual({
      pageNum: 2,
      pageSize: 50,
      orderName: 'sort',
      orderType: 'desc',
      dictCode: 'SYS_STATUS',
      name: 'Enabled',
      enabled: false,
    });
  });

  it('builds a dictionary item page request with default pagination when params are undefined', () => {
    const req = buildDictItemPageReq(undefined);

    expect(req).toEqual({ pageNum: 1, pageSize: 10 });
  });
});
