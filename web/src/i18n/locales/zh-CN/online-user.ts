import type { NebulaOnlineUserMessages } from '../../types';

export const onlineUser: NebulaOnlineUserMessages = {
  columns: {
    userId: '用户ID',
    username: '用户名',
    nickname: '昵称',
    phone: '手机号',
    email: '邮箱',
    orgCodeList: '组织编码',
    roleCodeList: '角色编码',
    clientType: '端类型',
    loginType: '登录方式',
    loginIp: '登录IP',
    browser: '浏览器',
    os: '操作系统',
    deviceType: '设备类型',
    loginTime: '登录时间',
    lastActiveTime: '最近活跃',
    expireTime: '过期时间',
    remainingTtlSeconds: '剩余 TTL',
    actions: '操作',
  },
  actions: {
    kickOut: '踢出',
    kickOutAll: '踢出全部会话',
  },
  tooltip: {
    clientTypeSource: '识别依据',
    userAgent: '原始 User-Agent',
  },
  confirm: {
    kickOutTitle: '确认踢出该在线用户？',
    kickOutAllTitle: '确认踢出该用户的全部会话？',
    kickOutAllDescription: '该用户在当前系统的所有登录会话都会被立即吊销，需要重新登录。',
  },
  feedback: {
    listLoadFailed: '加载在线用户失败',
    kickOutSuccess: '在线用户已踢出',
    kickOutFailed: '踢出在线用户失败',
    kickOutAllSuccess: '该用户的全部会话已踢出',
    kickOutAllFailed: '踢出该用户全部会话失败',
  },
  pagination: {
    total: '共 {count} 条记录',
  },
};
