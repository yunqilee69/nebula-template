import type { ClientType, ClientTypeSource, DeviceType } from './client-type';
import type { LoginRecordType } from './login-record';
import type { PageReq } from './auth-management';

/**
 * 在线用户列表的令牌类型，取值与后端 `TokenTypeEnum` 枚举名一一对应。
 * 同一次会话会同时缓存鉴权令牌与刷新令牌，列表默认只查鉴权令牌。
 */
export type OnlineUserTokenType = 'ACCESS_TOKEN' | 'REFRESH_TOKEN';

export type OnlineUserResp = {
  readonly cacheKey: string;
  readonly userId: string;
  readonly username: string;
  readonly nickname?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly orgCodeList?: readonly string[];
  readonly roleCodeList?: readonly string[];
  readonly clientType?: ClientType;
  readonly clientTypeSource?: ClientTypeSource;
  readonly loginType?: LoginRecordType;
  readonly loginIp?: string;
  readonly browser?: string;
  readonly os?: string;
  readonly deviceType?: DeviceType;
  readonly userAgent?: string;
  readonly loginTime?: string;
  readonly lastActiveTime?: string;
  readonly expireTime?: string;
  readonly remainingTtlSeconds?: number;
};

export interface OnlineUserPageReq extends PageReq {
  readonly userId?: string;
  readonly username?: string;
  readonly nickname?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly clientType?: ClientType;
  readonly loginIp?: string;
  readonly tokenType?: OnlineUserTokenType;
}
