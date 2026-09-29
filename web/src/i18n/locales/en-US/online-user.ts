import type { NebulaOnlineUserMessages } from '../../types';

export const onlineUser: NebulaOnlineUserMessages = {
  columns: {
    userId: 'User ID',
    username: 'Username',
    nickname: 'Nickname',
    phone: 'Phone',
    email: 'Email',
    orgCodeList: 'Organization codes',
    roleCodeList: 'Role codes',
    clientType: 'Client type',
    loginType: 'Login method',
    loginIp: 'Login IP',
    browser: 'Browser',
    os: 'OS',
    deviceType: 'Device type',
    loginTime: 'Login time',
    lastActiveTime: 'Last active',
    expireTime: 'Expiry time',
    remainingTtlSeconds: 'Remaining TTL',
    actions: 'Actions',
  },
  actions: {
    kickOut: 'Kick out',
    kickOutAll: 'Kick out all sessions',
  },
  tooltip: {
    clientTypeSource: 'Detected from',
    userAgent: 'Raw User-Agent',
  },
  confirm: {
    kickOutTitle: 'Kick out this online user?',
    kickOutAllTitle: 'Kick out all sessions of this user?',
    kickOutAllDescription: 'Every active session of this user will be revoked immediately and they will need to sign in again.',
  },
  feedback: {
    listLoadFailed: 'Failed to load online users',
    kickOutSuccess: 'Online user kicked out',
    kickOutFailed: 'Failed to kick out the online user',
    kickOutAllSuccess: 'All sessions of the user were kicked out',
    kickOutAllFailed: 'Failed to kick out all sessions of the user',
  },
  pagination: {
    total: '{count} records in total',
  },
};
