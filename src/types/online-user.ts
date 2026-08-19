import type { PageReq } from './auth-management';

export type OnlineUserResp = {
  readonly cacheKey: string;
  readonly userId: string;
  readonly username: string;
  readonly nickname?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly orgCodeList?: readonly string[];
  readonly roleCodeList?: readonly string[];
  readonly loginTime?: string;
  readonly expireTime?: string;
  readonly remainingTtlSeconds?: number;
};

export interface OnlineUserPageReq extends PageReq {
  readonly userId?: string;
  readonly username?: string;
  readonly nickname?: string;
  readonly email?: string;
  readonly phone?: string;
}
