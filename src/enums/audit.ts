import type { AuditResultStatus } from '@/types/audit';

export const AUDIT_RESULT_STATUS_VALUES = ['SUCCESS', 'FAILURE'] as const satisfies readonly AuditResultStatus[];

export const AUDIT_RESULT_STATUS_TAG_COLOR = {
  SUCCESS: 'success',
  FAILURE: 'error',
} as const;

AUDIT_RESULT_STATUS_TAG_COLOR satisfies Record<AuditResultStatus, string>;

export const AUDIT_RESULT_STATUS_LABEL_KEY = {
  SUCCESS: 'audit.status.success',
  FAILURE: 'audit.status.failure',
} as const;
