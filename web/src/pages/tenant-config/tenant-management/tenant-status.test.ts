import { describe, expect, it } from 'vitest';
import {
  invitationStatusMeta,
  tenantStatusMeta,
  TENANT_STATUS_FILTER_OPTIONS,
} from './tenant-status';

describe('tenant-status', () => {
  it('maps known tenant statuses to labels', () => {
    expect(tenantStatusMeta('ACTIVE')).toEqual({ label: '正常', color: 'green' });
    expect(tenantStatusMeta('SUSPENDED')).toEqual({ label: '已停用', color: 'orange' });
    expect(tenantStatusMeta('DELETED')).toEqual({ label: '已删除', color: 'red' });
  });

  it('falls back for unknown or missing tenant statuses', () => {
    expect(tenantStatusMeta(undefined)).toEqual({ label: '未知', color: 'default' });
    expect(tenantStatusMeta('WEIRD')).toEqual({ label: 'WEIRD', color: 'default' });
  });

  it('maps invitation statuses and exposes filter options', () => {
    expect(invitationStatusMeta('PENDING')).toEqual({ label: '待接受', color: 'orange' });
    expect(invitationStatusMeta('ACCEPTED')).toEqual({ label: '已接受', color: 'green' });
    expect(TENANT_STATUS_FILTER_OPTIONS[0]).toEqual({ label: '全部状态', value: '' });
  });
});
