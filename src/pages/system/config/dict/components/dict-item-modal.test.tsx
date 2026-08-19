import { describe, expect, it } from 'vitest';
import {
  buildDictItemTablePageReq,
  toCreateDictItemReq,
  toUpdateDictItemReq,
} from './dict-item-modal';
import type { DictItemFormValues, DictItemTableQuery } from './dict-item-modal';

describe('dict item modal helpers', () => {
  it('builds an item table request with trimmed filters and parent filtering', () => {
    const query: DictItemTableQuery = {
      pageNum: 2,
      pageSize: 20,
      orderName: 'sort',
      orderType: 'asc',
      dictCode: ' SYS_STATUS ',
      name: ' Enabled ',
      enabled: false,
      parentId: ' item-parent ',
    };

    const req = buildDictItemTablePageReq(query);

    expect(req).toEqual({
      pageNum: 2,
      pageSize: 20,
      orderName: 'sort',
      orderType: 'asc',
      dictCode: 'SYS_STATUS',
      name: 'Enabled',
      enabled: false,
      parentId: 'item-parent',
    });
  });

  it('normalizes form values for create and update payloads', () => {
    const values: DictItemFormValues = {
      name: ' Enabled ',
      parentId: ' parent-1 ',
      itemValue: ' 1 ',
      sort: 5,
      enabled: false,
      tagColor: ' green ',
      remark: ' Active value ',
    };

    expect(toCreateDictItemReq(' SYS_STATUS ', values)).toEqual({
      dictCode: 'SYS_STATUS',
      name: 'Enabled',
      parentId: 'parent-1',
      itemValue: '1',
      sort: 5,
      enabled: false,
      tagColor: 'green',
      remark: 'Active value',
    });
    expect(toUpdateDictItemReq(values)).toEqual({
      name: 'Enabled',
      parentId: 'parent-1',
      itemValue: '1',
      sort: 5,
      enabled: false,
      tagColor: 'green',
      remark: 'Active value',
    });
  });
});
