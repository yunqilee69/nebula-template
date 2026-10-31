export interface PersonStatusMeta {
  label: string;
  color: string;
}

const PERSON_STATUS_META: Record<string, PersonStatusMeta> = {
  ACTIVE: { label: '正常', color: 'green' },
  DISABLED: { label: '已停用', color: 'red' },
  LOCKED: { label: '已锁定', color: 'orange' },
};

const LINK_STATUS_META: Record<string, PersonStatusMeta> = {
  ACTIVE: { label: '已关联', color: 'green' },
  PENDING: { label: '待确认', color: 'gold' },
  REVOKED: { label: '已解除', color: 'default' },
};

export function personStatusMeta(status?: string): PersonStatusMeta {
  if (!status) return { label: '-', color: 'default' };
  return PERSON_STATUS_META[status] ?? { label: status, color: 'default' };
}

export function linkStatusMeta(status?: string): PersonStatusMeta {
  if (!status) return { label: '-', color: 'default' };
  return LINK_STATUS_META[status] ?? { label: status, color: 'default' };
}

export const PERSON_STATUS_OPTIONS = [
  { label: '正常', value: 'ACTIVE' },
  { label: '已停用', value: 'DISABLED' },
  { label: '已锁定', value: 'LOCKED' },
];
