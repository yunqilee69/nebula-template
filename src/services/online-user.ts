import { request } from '@/request/request';
import type { PageResp } from '@/types/auth-management';
import type { OnlineUserPageReq, OnlineUserResp } from '@/types/online-user';

export interface OnlineUserService {
  readonly pageOnlineUsers: (data: OnlineUserPageReq) => Promise<PageResp<OnlineUserResp>>;
  readonly kickOutOnlineUser: (cacheKey: string) => Promise<void>;
}

export const onlineUserService: OnlineUserService = {
  pageOnlineUsers: (data) => request<PageResp<OnlineUserResp>>({ method: 'POST', url: '/api/auth/online-users/page', data }),
  kickOutOnlineUser: (cacheKey) => request<void>({ method: 'POST', url: `/api/auth/online-users/${encodeURIComponent(cacheKey)}/kick-out` }),
};
