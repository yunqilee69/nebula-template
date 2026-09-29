import type { LoginRecordResult, LoginRecordType } from '@/types/login-record';

export const LOGIN_RECORD_TYPE_VALUES = ['PASSWORD', 'PHONE', 'EMAIL', 'OAUTH2'] as const satisfies readonly LoginRecordType[];

export const LOGIN_RECORD_TYPE_LABEL_KEY = {
  PASSWORD: 'common.loginType.password',
  PHONE: 'common.loginType.phone',
  EMAIL: 'common.loginType.email',
  OAUTH2: 'common.loginType.oauth2',
} as const;

export const LOGIN_RECORD_RESULT_VALUES = ['SUCCESS', 'FAILED'] as const satisfies readonly LoginRecordResult[];

export const LOGIN_RECORD_RESULT_TAG_COLOR = {
  SUCCESS: 'success',
  FAILED: 'error',
} as const;

LOGIN_RECORD_RESULT_TAG_COLOR satisfies Record<LoginRecordResult, string>;

export const LOGIN_RECORD_RESULT_LABEL_KEY = {
  SUCCESS: 'common.loginResult.success',
  FAILED: 'common.loginResult.failed',
} as const;
