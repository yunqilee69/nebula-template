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

/**
 * 个人资料资源位待提交的上传任务 id。
 *
 * <p>`avatar` 是单值资源位，数组必须恰好 1 个元素；后端在保存资料时完成绑定，
 * 并在响应里返回头像的最终地址。</p>
 */
export interface ProfileUploadTaskIds {
  avatar?: string[];
}

export interface UpdateProfileReq {
  nickname?: string;
  email?: string;
  phone?: string;
  /** 待绑定的上传任务；不再提交 avatar 地址本身。 */
  uploadTaskIds?: ProfileUploadTaskIds;
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

export type {
  LoginRecordPageReq,
  LoginRecordResp,
  LoginRecordResult,
  LoginRecordType,
} from './login-record';
