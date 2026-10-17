/**
 * 个人资料、第三方账号绑定与登录记录契约。
 *
 * <p>来源：`nebula-auth` 的 `ProfileController`、`ProfileResp`、
 * `OAuth2BindingListResp`、`LoginRecordResp`。分页结构复用 `PageResp<T>`。</p>
 */
import type { BasePageReq } from './api.ts';
import type { ClientType } from '../client-type.ts';

/** 个人资料响应。 */
export interface ProfileResp {
  id: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  /** 1=正常，0=禁用。 */
  status?: number;
  /** 注册时间。 */
  createTime?: string;
}

/** OAuth2 / 第三方登录绑定项。 */
export interface OAuth2BindingResp {
  providerId: string;
  providerName?: string;
  bound: boolean;
  providerUserId?: string;
  displayName?: string;
  linkedAt?: string;
}

/** 第三方账号绑定列表。 */
export interface OAuth2BindingListResp {
  providers: OAuth2BindingResp[];
}

/** 登录方式，与后端 `UserLoginEvent.LOGIN_TYPE_*` 对应。 */
export type LoginRecordType = 'PASSWORD' | 'PHONE' | 'EMAIL' | 'OAUTH2';

/** 登录结果，与后端 `UserLoginEvent.LOGIN_RESULT_*` 对应。 */
export type LoginRecordResult = 'SUCCESS' | 'FAILED';

/** 端类型判定来源。 */
export type ClientTypeSource = 'HEADER' | 'USER_AGENT' | 'DEFAULT';

/** 当前用户登录记录分页请求。 */
export interface LoginRecordPageReq extends BasePageReq {
  pageNum: number;
  pageSize: number;
}

/** 登录记录响应。 */
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
