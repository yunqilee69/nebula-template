/**
 * 端类型，取值与后端 `ClientType` 枚举名一一对应。
 */
export type ClientType = 'WEB' | 'H5' | 'MP_WEIXIN' | 'MP_ALIPAY' | 'APP' | 'API' | 'UNKNOWN';

/**
 * 端类型的判定依据：请求头自报 / 由 User-Agent 推断 / 无法判定时的兜底值。
 */
export type ClientTypeSource = 'HEADER' | 'USER_AGENT' | 'DEFAULT';

/**
 * 设备类型，由 User-Agent 推断。
 */
export type DeviceType = 'PC' | 'MOBILE' | 'TABLET';
