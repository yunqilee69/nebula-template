import type { OnlineUserTokenType } from '@/types/online-user';

export const ONLINE_USER_TOKEN_TYPE_VALUES = ['ACCESS_TOKEN', 'REFRESH_TOKEN'] as const satisfies readonly OnlineUserTokenType[];

export const ONLINE_USER_TOKEN_TYPE_LABEL_KEY = {
  ACCESS_TOKEN: 'onlineUser.tokenType.accessToken',
  REFRESH_TOKEN: 'onlineUser.tokenType.refreshToken',
} as const;

/** 在线用户列表默认只查鉴权令牌，刷新令牌需显式选择后才查询。 */
export const DEFAULT_ONLINE_USER_TOKEN_TYPE: OnlineUserTokenType = 'ACCESS_TOKEN';
