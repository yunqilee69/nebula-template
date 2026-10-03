import type { NebulaCommonMessages } from '../../types';

export const common: NebulaCommonMessages = {
  languageZh: '中文',
  languageEn: 'English',
  empty: {
    noModules: '暂无模块',
  },
  actions: {
    confirm: '确认',
    cancel: '取消',
  },
  pagination: {
    total: '共 {total} 条',
  },
  clientType: {
    web: 'Web 端',
    h5: 'H5',
    mpWeixin: '微信小程序',
    mpAlipay: '支付宝小程序',
    app: '移动应用',
    api: '开放接口',
    unknown: '未知',
  },
  clientTypeSource: {
    header: '请求头',
    userAgent: 'User-Agent 推断',
    default: '默认兜底',
  },
  deviceType: {
    pc: '电脑',
    mobile: '手机',
    tablet: '平板',
  },
  loginType: {
    password: '账密登录',
    phone: '手机验证码',
    email: '邮箱验证码',
    oauth2: '第三方登录',
  },
  loginResult: {
    success: '成功',
    failed: '失败',
  },
  tooltip: {
    clientTypeSource: '识别依据',
    userAgent: '原始 User-Agent',
  },
  notProvided: '未填写',
  iconPicker: {
    title: '选择图标',
    searchPlaceholder: '搜索图标名称，如 user、setting',
    empty: '未找到匹配图标',
    inputPlaceholder: '请输入图标',
    triggerAriaLabel: '选择图标',
  },
};
