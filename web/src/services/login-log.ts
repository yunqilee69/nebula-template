import { request } from '@/request/request';
import type { PageResp } from '@/types/auth-management';
import type { LoginRecordPageReq, LoginRecordResp } from '@/types/login-record';

export interface LoginLogService {
  readonly pageLoginRecords: (data: LoginRecordPageReq) => Promise<PageResp<LoginRecordResp>>;
}

export const loginLogService: LoginLogService = {
  pageLoginRecords: (data) => request<PageResp<LoginRecordResp>>({
    method: 'POST',
    url: '/api/auth/login-records/page',
    data,
  }),
};
