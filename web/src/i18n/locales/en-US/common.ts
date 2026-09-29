import type { NebulaCommonMessages } from '../../types';

export const common: NebulaCommonMessages = {
  languageZh: '中文',
  languageEn: 'English',
  empty: {
    noModules: 'No modules',
  },
  actions: {
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
  pagination: {
    total: '{total} total',
  },
  clientType: {
    web: 'Web',
    h5: 'H5',
    mpWeixin: 'WeChat Mini Program',
    mpAlipay: 'Alipay Mini Program',
    app: 'Mobile App',
    api: 'Open API',
    unknown: 'Unknown',
  },
  clientTypeSource: {
    header: 'Request header',
    userAgent: 'Inferred from User-Agent',
    default: 'Default fallback',
  },
  deviceType: {
    pc: 'Desktop',
    mobile: 'Phone',
    tablet: 'Tablet',
  },
  loginType: {
    password: 'Password',
    phone: 'Phone code',
    email: 'Email code',
    oauth2: 'OAuth2',
  },
  loginResult: {
    success: 'Success',
    failed: 'Failed',
  },
  tooltip: {
    clientTypeSource: 'Detected from',
    userAgent: 'Raw User-Agent',
  },
  notProvided: 'Not provided',
};
