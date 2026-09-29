import type { NebulaLoginLogMessages } from '../../types';

export const loginLog: NebulaLoginLogMessages = {
  columns: {
    id: 'Record ID',
    loginAccount: 'Account',
    loginType: 'Login method',
    clientType: 'Client type',
    loginIp: 'Login IP',
    deviceInfo: 'Client',
    loginResult: 'Result',
    failReason: 'Failure reason',
    loginTime: 'Login time',
  },
  search: {
    loginAccount: 'Account',
    clientType: 'Client type',
    loginType: 'Login method',
    loginResult: 'Result',
    loginIp: 'Login IP',
    loginTimeRange: 'Login time',
  },
  placeholders: {
    loginAccount: 'Enter the login account',
    clientType: 'Select a client type',
    loginType: 'Select a login method',
    loginResult: 'Select a result',
    loginIp: 'Enter the login IP',
    loginTimeRange: 'Select a login time range',
  },
  feedback: {
    listLoadFailed: 'Failed to load login logs',
  },
  pagination: {
    total: '{count} records in total',
  },
};
