import { request } from '@/request/request';
import type { PageResp } from '@/types/auth-management';
import type { OnlineUserPageReq, OnlineUserResp } from '@/types/online-user';

export interface OnlineUserService {
  readonly pageOnlineUsers: (data: OnlineUserPageReq) => Promise<PageResp<OnlineUserResp>>;
  readonly kickOutOnlineUser: (cacheKey: string) => Promise<void>;
  /** 吊销该用户当前所有会话，返回被吊销的会话数量。 */
  readonly kickOutOnlineUsers: (userId: string) => Promise<number>;
}

export const onlineUserService: OnlineUserService = {
  pageOnlineUsers: (data) => request<PageResp<OnlineUserResp>>({ method: 'POST', url: '/api/auth/online-users/page', data }),
  kickOutOnlineUser: (cacheKey) => request<void>({ method: 'POST', url: `/api/auth/online-users/${encodeURIComponent(cacheKey)}/kick-out` }),
  kickOutOnlineUsers: (userId) => request<number>({
    method: 'POST',
    url: `/api/auth/online-users/users/${encodeURIComponent(userId)}/kick-out`,
  }),
};
