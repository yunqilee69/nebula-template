import { describe, expect, it } from 'vitest';
import { buildSiteMessagePageReq } from './site-message-table';

describe('buildSiteMessagePageReq', () => {
  it('maps creation-time ranges to the site-message page contract', () => {
    expect(buildSiteMessagePageReq({
      pageNum: 3,
      pageSize: 50,
      orderName: 'createTime',
      orderType: 'desc',
      readStatus: false,
      createTimeRange: ['2026-08-01T00:00:00', '2026-08-31T23:59:59'],
    }, 'current-user')).toEqual({
      pageNum: 3,
      pageSize: 50,
      orderName: 'createTime',
      orderType: 'desc',
      receiverUserId: 'current-user',
      readStatus: false,
      createTimeFrom: '2026-08-01 00:00:00',
      createTimeTo: '2026-08-31 23:59:59',
    });
  });
});
