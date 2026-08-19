import { describe, expect, it } from 'vitest';
import { buildNebulaTableRequestParams } from './params';

describe('buildNebulaTableRequestParams', () => {
  it('maps ProTable pagination and filters to Nebula page params', () => {
    const params = buildNebulaTableRequestParams(
      { current: 3, pageSize: 50, username: 'alice', nickname: '', status: 1 },
      {},
    );

    expect(params).toEqual({ pageNum: 3, pageSize: 50, username: 'alice', status: 1 });
  });

  it('maps primary sorter to Nebula order params', () => {
    const params = buildNebulaTableRequestParams(
      { current: 1, pageSize: 20, code: 'ADMIN' },
      { createTime: 'descend' },
    );

    expect(params).toEqual({ pageNum: 1, pageSize: 20, code: 'ADMIN', orderName: 'createTime', orderType: 'desc' });
  });

  it('uses backend defaults when ProTable pagination is absent', () => {
    const params = buildNebulaTableRequestParams({}, {});

    expect(params).toEqual({ pageNum: 1, pageSize: 10 });
  });
});
