export interface StatusMeta {
  label: string;
  color: string;
}

const TENANT_STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: '正常', color: 'green' },
  SUSPENDED: { label: '已停用', color: 'orange' },
  DELETED: { label: '已删除', color: 'red' },
};

const INVITATION_STATUS_META: Record<string, StatusMeta> = {
  PENDING: { label: '待接受', color: 'orange' },
  ACCEPTED: { label: '已接受', color: 'green' },
  EXPIRED: { label: '已过期', color: 'default' },
  REVOKED: { label: '已撤销', color: 'red' },
};

const DOMAIN_STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: '已生效', color: 'green' },
  PENDING: { label: '待验证', color: 'orange' },
  DISABLED: { label: '已停用', color: 'default' },
};

export function tenantStatusMeta(status?: string): StatusMeta {
  if (!status) {
    return { label: '未知', color: 'default' };
  }
  return TENANT_STATUS_META[status] ?? { label: status, color: 'default' };
}

export function invitationStatusMeta(status?: string): StatusMeta {
  if (!status) {
    return { label: '未知', color: 'default' };
  }
  return INVITATION_STATUS_META[status] ?? { label: status, color: 'default' };
}

export function domainStatusMeta(status?: string): StatusMeta {
  if (!status) {
    return { label: '未知', color: 'default' };
  }
  return DOMAIN_STATUS_META[status] ?? { label: status, color: 'default' };
}

export const TENANT_STATUS_FILTER_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '正常', value: 'ACTIVE' },
  { label: '已停用', value: 'SUSPENDED' },
  { label: '已删除', value: 'DELETED' },
];
