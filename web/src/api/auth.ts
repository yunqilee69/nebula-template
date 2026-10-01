import { request } from '@/request/request';
import { cacheUploadPolicyFromInit } from '@/stores/upload-policy-store';
import type {
  AuthInitResp,
  FrontendInitResp,
  LoginReq,
  LoginResp,
  RegisterReq,
  PhoneLoginReq,
  EmailLoginReq,
  ForgotPasswordChangeReq,
  ForgotPasswordSendCodeReq,
  ForgotPasswordVerifyCodeReq,
  ForgotPasswordVerifyCodeResp,
  SendPhoneCodeReq,
  SendEmailCodeReq,
  RefreshTokenReq,
  CurrentUserResp,
  GitHubCallbackReq,
  GitHubCallbackResp,
  GitHubLoginStatusResp,
  GitHubRedirectPrepareReq,
  GitHubRedirectPrepareResp,
  WechatWebCallbackReq,
  WechatWebCallbackResp,
  WechatWebClaimTokenReq,
  WechatWebPrepareReq,
  WechatWebPrepareResp,
  WechatWebStatusResp,
} from '@/types/auth';

export interface AuthService {
  getAuthConfig: () => Promise<AuthInitResp>;
  login: (data: LoginReq) => Promise<LoginResp>;
  phoneLogin: (data: PhoneLoginReq) => Promise<LoginResp>;
  emailLogin: (data: EmailLoginReq) => Promise<LoginResp>;
  register: (data: RegisterReq) => Promise<void>;
  sendPhoneCode: (data: SendPhoneCodeReq) => Promise<void>;
  sendEmailCode: (data: SendEmailCodeReq) => Promise<void>;
  sendForgotPasswordCode: (data: ForgotPasswordSendCodeReq) => Promise<void>;
  verifyForgotPasswordCode: (data: ForgotPasswordVerifyCodeReq) => Promise<ForgotPasswordVerifyCodeResp>;
  changeForgottenPassword: (data: ForgotPasswordChangeReq) => Promise<LoginResp>;
  refreshToken: (data: RefreshTokenReq) => Promise<LoginResp>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<CurrentUserResp>;
  prepareGitHubRedirect: (data: GitHubRedirectPrepareReq) => Promise<GitHubRedirectPrepareResp>;
  getGitHubLoginStatus: (loginId: string) => Promise<GitHubLoginStatusResp>;
  completeGitHubRedirectCallback: (data: GitHubCallbackReq) => Promise<GitHubCallbackResp>;
  prepareWechatWebRedirect: (data: WechatWebPrepareReq) => Promise<WechatWebPrepareResp>;
  getWechatWebLoginStatus: (loginId: string) => Promise<WechatWebStatusResp>;
  completeWechatWebCallback: (data: WechatWebCallbackReq) => Promise<WechatWebCallbackResp>;
  claimWechatWebToken: (data: WechatWebClaimTokenReq) => Promise<LoginResp>;
}

export const authService: AuthService = {
  getAuthConfig: async () => {
    const resp = await request<FrontendInitResp>({
      method: 'GET',
      url: '/api/frontend/init',
    });
    // init 响应同时携带上传策略，顺手写入缓存，后续上传无需再请求该端点
    cacheUploadPolicyFromInit(resp);
    return resp.loginConfig ?? {};
  },

  login: (data: LoginReq) =>
    request<LoginResp>({
      method: 'POST',
      url: '/api/auth/login',
      data,
    }),

  phoneLogin: (data: PhoneLoginReq) =>
    request<LoginResp>({
      method: 'POST',
      url: '/api/auth/phone-login',
      data,
    }),

  emailLogin: (data: EmailLoginReq) =>
    request<LoginResp>({
      method: 'POST',
      url: '/api/auth/email-login',
      data,
    }),

  register: (data: RegisterReq) =>
    request<void>({
      method: 'POST',
      url: '/api/auth/register',
      data,
    }),

  sendPhoneCode: (data: SendPhoneCodeReq) =>
    request<void>({
      method: 'POST',
      url: '/api/auth/send-phone-code',
      data,
    }),

  sendEmailCode: (data: SendEmailCodeReq) =>
    request<void>({
      method: 'POST',
      url: '/api/auth/send-email-code',
      data,
    }),

  sendForgotPasswordCode: (data: ForgotPasswordSendCodeReq) =>
    request<void>({
      method: 'POST',
      url: '/api/auth/forgot-password/send-code',
      data,
    }),

  verifyForgotPasswordCode: (data: ForgotPasswordVerifyCodeReq) =>
    request<ForgotPasswordVerifyCodeResp>({
      method: 'POST',
      url: '/api/auth/forgot-password/verify-code',
      data,
    }),

  changeForgottenPassword: (data: ForgotPasswordChangeReq) =>
    request<LoginResp>({
      method: 'POST',
      url: '/api/auth/forgot-password/change',
      data,
    }),

  refreshToken: (data: RefreshTokenReq) =>
    request<LoginResp>({
      method: 'POST',
      url: '/api/auth/refresh',
      data,
      _nebulaSkipAuthRefresh: true,
    }),

  logout: () =>
    request<void>({
      method: 'POST',
      url: '/api/auth/logout',
    }),

  getCurrentUser: () =>
    request<CurrentUserResp>({
      method: 'GET',
      url: '/api/auth/current-user',
    }),

  prepareGitHubRedirect: (data: GitHubRedirectPrepareReq) =>
    request<GitHubRedirectPrepareResp>({
      method: 'POST',
      url: '/api/auth/github/redirect/prepare',
      data,
    }),

  getGitHubLoginStatus: (loginId: string) =>
    request<GitHubLoginStatusResp>({
      method: 'GET',
      url: '/api/auth/github/status',
      params: { loginId },
    }),

  completeGitHubRedirectCallback: (data: GitHubCallbackReq) =>
    request<GitHubCallbackResp>({
      method: 'POST',
      url: '/api/auth/github/redirect/callback',
      data,
    }),

  prepareWechatWebRedirect: (data: WechatWebPrepareReq) =>
    request<WechatWebPrepareResp>({
      method: 'POST',
      url: '/api/auth/wechat/web/redirect/prepare',
      data,
    }),

  getWechatWebLoginStatus: (loginId: string) =>
    request<WechatWebStatusResp>({
      method: 'GET',
      url: '/api/auth/wechat/web/status',
      params: { loginId },
    }),

  completeWechatWebCallback: (data: WechatWebCallbackReq) =>
    request<WechatWebCallbackResp>({
      method: 'POST',
      url: '/api/auth/wechat/web/callback',
      data,
    }),

  claimWechatWebToken: (data: WechatWebClaimTokenReq) =>
    request<LoginResp>({
      method: 'POST',
      url: '/api/auth/wechat/web/redirect/callback',
      data,
    }),
};
