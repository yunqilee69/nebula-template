export interface PageResp<T> {
  data: T[];
  total: number;
}

export interface ProfileResp {
  id: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status?: number;
  createTime?: string;
}

export interface UpdateProfileReq {
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordReq {
  oldPassword: string;
  newPassword: string;
}

export interface OAuth2BindingResp {
  providerId: string;
  providerName?: string;
  bound: boolean;
  providerUserId?: string;
  displayName?: string;
  linkedAt?: string;
}

export interface OAuth2BindingListResp {
  providers: OAuth2BindingResp[];
}

export interface BindOAuth2Req {
  providerId: string;
  code: string;
  state: string;
  takeover?: boolean;
}

export interface PrepareBindOAuth2Req {
  providerId: string;
}

export interface PrepareBindOAuth2Resp {
  providerId: string;
  state: string;
  authorizeUrl: string;
  expiresInSeconds?: number;
}

export type BindOAuth2Status = 'BOUND' | 'TAKEOVER_CONFIRMATION_REQUIRED';

export interface BindOAuth2Resp {
  bindingId?: string | null;
  status: BindOAuth2Status;
}

export interface LoginRecordPageReq {
  pageNum: number;
  pageSize: number;
}

export type LoginRecordResult = 'SUCCESS' | 'FAILED';

export interface LoginRecordResp {
  loginTime?: string;
  loginAccount?: string;
  loginType?: string;
  loginResult?: LoginRecordResult;
  loginIp?: string;
  deviceInfo?: string;
  failReason?: string;
}
