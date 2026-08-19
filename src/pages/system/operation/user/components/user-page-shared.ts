import type { EnableStatus } from '@/types/auth-management';
import type { NebulaMessageKey } from '@/i18n/types';

export function createEnableStatusOptions(t: (key: NebulaMessageKey) => string): Array<{ label: string; value: EnableStatus }> {
  return [
    { label: t('auth.userManagement.status.enabled'), value: 1 },
    { label: t('auth.userManagement.status.disabled'), value: 0 },
  ];
}

export function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export interface UserDrawerFormValues {
  username: string;
  password?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  status: EnableStatus;
  roleIds?: string[];
  orgIds?: string[];
}
