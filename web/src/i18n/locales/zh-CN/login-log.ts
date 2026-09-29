import type { NebulaLoginLogMessages } from '../../types';

export const loginLog: NebulaLoginLogMessages = {
  columns: {
    id: '记录ID',
    loginAccount: '登录账号',
    loginType: '登录方式',
    clientType: '端类型',
    loginIp: '登录IP',
    deviceInfo: '客户端',
    loginResult: '登录结果',
    failReason: '失败原因',
    loginTime: '登录时间',
  },
  search: {
    loginAccount: '登录账号',
    clientType: '端类型',
    loginType: '登录方式',
    loginResult: '登录结果',
    loginIp: '登录IP',
    loginTimeRange: '登录时间',
  },
  placeholders: {
    loginAccount: '请输入登录账号',
    clientType: '请选择端类型',
    loginType: '请选择登录方式',
    loginResult: '请选择登录结果',
    loginIp: '请输入登录IP',
    loginTimeRange: '请选择登录时间范围',
  },
  feedback: {
    listLoadFailed: '加载登录日志失败',
  },
  pagination: {
    total: '共 {count} 条记录',
  },
};
