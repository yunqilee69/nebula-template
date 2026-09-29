import type { ClientType, ClientTypeSource } from './client-type';

/**
 * 登录方式，取值与后端 `UserLoginEvent.LOGIN_TYPE_*` 一一对应。
 */
export type LoginRecordType = 'PASSWORD' | 'PHONE' | 'EMAIL' | 'OAUTH2';

/**
 * 登录结果，取值与后端 `UserLoginEvent.LOGIN_RESULT_*` 一一对应。
 */
export type LoginRecordResult = 'SUCCESS' | 'FAILED';

/**
 * 登录记录分页请求。个人中心仅使用分页字段，管理端登录日志页复用同一结构并补充筛选条件。
 */
export interface LoginRecordPageReq {
  pageNum: number;
  pageSize: number;
  orderName?: string;
  orderType?: 'asc' | 'desc';
  userId?: string;
  loginAccount?: string;
  loginType?: LoginRecordType;
  loginResult?: LoginRecordResult;
  clientType?: ClientType;
  loginIp?: string;
  loginTimeFrom?: string;
  loginTimeTo?: string;
}

export interface LoginRecordResp {
  id?: string;
  userId?: string;
  loginTime?: string;
  loginAccount?: string;
  loginType?: LoginRecordType;
  loginResult?: LoginRecordResult;
  loginIp?: string;
  clientType?: ClientType;
  clientTypeSource?: ClientTypeSource;
  /** 解析后的浏览器 / 操作系统，例如 "Chrome / Mac"。 */
  deviceInfo?: string;
  userAgent?: string;
  oauthProvider?: string;
  failReason?: string;
}
