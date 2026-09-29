import type { ClientType, ClientTypeSource, DeviceType } from '@/types/client-type';

export const CLIENT_TYPE_VALUES = [
  'WEB',
  'H5',
  'MP_WEIXIN',
  'MP_ALIPAY',
  'APP',
  'API',
  'UNKNOWN',
] as const satisfies readonly ClientType[];

export const CLIENT_TYPE_TAG_COLOR = {
  WEB: 'blue',
  H5: 'cyan',
  MP_WEIXIN: 'green',
  MP_ALIPAY: 'geekblue',
  APP: 'purple',
  API: 'orange',
  UNKNOWN: 'default',
} as const;

CLIENT_TYPE_TAG_COLOR satisfies Record<ClientType, string>;

export const CLIENT_TYPE_LABEL_KEY = {
  WEB: 'common.clientType.web',
  H5: 'common.clientType.h5',
  MP_WEIXIN: 'common.clientType.mpWeixin',
  MP_ALIPAY: 'common.clientType.mpAlipay',
  APP: 'common.clientType.app',
  API: 'common.clientType.api',
  UNKNOWN: 'common.clientType.unknown',
} as const;

export const CLIENT_TYPE_SOURCE_VALUES = ['HEADER', 'USER_AGENT', 'DEFAULT'] as const satisfies readonly ClientTypeSource[];

export const CLIENT_TYPE_SOURCE_LABEL_KEY = {
  HEADER: 'common.clientTypeSource.header',
  USER_AGENT: 'common.clientTypeSource.userAgent',
  DEFAULT: 'common.clientTypeSource.default',
} as const;

export const DEVICE_TYPE_LABEL_KEY = {
  PC: 'common.deviceType.pc',
  MOBILE: 'common.deviceType.mobile',
  TABLET: 'common.deviceType.tablet',
} as const;

DEVICE_TYPE_LABEL_KEY satisfies Record<DeviceType, string>;
