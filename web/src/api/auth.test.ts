import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { authService } from './auth';
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
  GitHubRedirectPrepareResp,
  GitHubLoginStatusResp,
  GitHubCallbackResp,
} from '@/types/auth';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService', () => {
  it('getAuthConfig calls GET /api/frontend/init and returns loginConfig', async () => {
    const loginConfig: AuthInitResp = {
      usernameEnabled: true,
      phoneEnabled: false,
      emailEnabled: true,
      githubEnabled: false,
    };
    const mockResp: FrontendInitResp = {
      loginConfig,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.getAuthConfig();

    expect(result).toBe(loginConfig);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/frontend/init',
    });
  });

  it('login calls POST /api/auth/login and returns accessToken/refreshToken with expiry', async () => {
    const mockResp: LoginResp = {
      accessToken: 'access-t',
      refreshToken: 'refresh-rt',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const data: LoginReq = { username: 'admin', password: '123456' };
    const result = await authService.login(data);

    expect(result).toBe(mockResp);
    expect(result.accessToken).toBe('access-t');
    expect(result.refreshToken).toBe('refresh-rt');
    expect(result.accessTokenExpiresIn).toBe(7200);
    expect(result.refreshTokenExpiresIn).toBe(604800);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/login',
      data,
    });
  });

  it('phoneLogin calls POST /api/auth/phone-login and returns LoginResp', async () => {
    const mockResp: LoginResp = {
      accessToken: 'phone-access',
      refreshToken: 'phone-refresh',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const data: PhoneLoginReq = { phone: '13800000000', code: '1234' };
    const result = await authService.phoneLogin(data);

    expect(result).toBe(mockResp);
    expect(result.accessToken).toBe('phone-access');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/phone-login',
      data,
    });
  });

  it('emailLogin calls POST /api/auth/email-login and returns LoginResp', async () => {
    const mockResp: LoginResp = {
      accessToken: 'email-access',
      refreshToken: 'email-refresh',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const data: EmailLoginReq = { email: 'a@b.com', code: '5678' };
    const result = await authService.emailLogin(data);

    expect(result).toBe(mockResp);
    expect(result.accessToken).toBe('email-access');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/email-login',
      data,
    });
  });

  it('register calls POST /api/auth/register with registration data including optional nickname', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    const data: RegisterReq = { username: 'newuser', password: 'pass123', nickname: 'New User' };
    await authService.register(data);

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/register',
      data,
    });
  });

  it('sendPhoneCode calls POST /api/auth/send-phone-code with phone', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    const data: SendPhoneCodeReq = { phone: '13800000000' };
    await authService.sendPhoneCode(data);

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/send-phone-code',
      data,
    });
  });

  it('sendEmailCode calls POST /api/auth/send-email-code with email', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    const data: SendEmailCodeReq = { email: 'a@b.com' };
    await authService.sendEmailCode(data);

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/send-email-code',
      data,
    });
  });

  it('sendForgotPasswordCode calls POST /api/auth/forgot-password/send-code with identity', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    const data: ForgotPasswordSendCodeReq = { identity: 'alice@example.com' };
    await authService.sendForgotPasswordCode(data);

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/forgot-password/send-code',
      data,
    });
  });

  it('verifyForgotPasswordCode calls POST /api/auth/forgot-password/verify-code and returns change token', async () => {
    const mockResp: ForgotPasswordVerifyCodeResp = {
      passwordChangeToken: 'change-token-1',
      expiresInSeconds: 600,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const data: ForgotPasswordVerifyCodeReq = { identity: 'alice@example.com', code: '123456' };
    const result = await authService.verifyForgotPasswordCode(data);

    expect(result).toBe(mockResp);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/forgot-password/verify-code',
      data,
    });
  });

  it('changeForgottenPassword calls POST /api/auth/forgot-password/change with password change token', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    const data: ForgotPasswordChangeReq = { passwordChangeToken: 'change-token-1', newPassword: 'newSecret' };
    await authService.changeForgottenPassword(data);

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/forgot-password/change',
      data,
    });
  });

  it('refreshToken calls POST /api/auth/refresh with skip auth refresh flag', async () => {
    const mockResp: LoginResp = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      accessTokenExpiresIn: 7200,
      refreshTokenExpiresIn: 604800,
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const data: RefreshTokenReq = { refreshToken: 'old-rt' };
    const result = await authService.refreshToken(data);

    expect(result).toBe(mockResp);
    expect(result.accessToken).toBe('new-access');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/refresh',
      data,
      _nebulaSkipAuthRefresh: true,
    });
  });

  it('logout calls POST /api/auth/logout', async () => {
    mockedRequest.mockResolvedValueOnce(undefined);

    await authService.logout();

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/logout',
    });
  });

  it('getCurrentUser calls GET /api/auth/current-user', async () => {
    const mockResp: CurrentUserResp = {
      id: '1',
      nickname: 'Admin',
      roleCodeList: ['admin'],
      permissionCodeList: ['read'],
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.getCurrentUser();

    expect(result).toBe(mockResp);
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/auth/current-user',
    });
  });

  it('prepareGitHubRedirect calls POST /api/auth/github/redirect/prepare with redirectAfterLogin body', async () => {
    const mockResp: GitHubRedirectPrepareResp = {
      loginId: 'redirect-login-id',
      state: 'redirect-state',
      status: 'WAITING',
      authorizeUrl: 'https://github.com/login/oauth/authorize?state=redirect-state',
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.prepareGitHubRedirect({ redirectAfterLogin: '/workspace' });

    expect(result).toBe(mockResp);
    expect(result.authorizeUrl).toContain('redirect-state');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/github/redirect/prepare',
      data: { redirectAfterLogin: '/workspace' },
    });
  });

  it('getGitHubLoginStatus calls GET /api/auth/github/status with loginId param', async () => {
    const mockResp: GitHubLoginStatusResp = {
      loginId: 'test-login-id',
      status: 'SUCCESS',
      state: 'state-value',
      loginResult: {
        accessToken: 'github-access',
        refreshToken: 'github-refresh',
        accessTokenExpiresIn: 7200,
        refreshTokenExpiresIn: 604800,
      },
      returnPath: '/dashboard',
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.getGitHubLoginStatus('test-login-id');

    expect(result).toBe(mockResp);
    expect(result.loginResult?.accessToken).toBe('github-access');
    expect(result.loginId).toBe('test-login-id');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/auth/github/status',
      params: { loginId: 'test-login-id' },
    });
  });

  it('completeGitHubRedirectCallback calls POST /api/auth/github/redirect/callback without token fields', async () => {
    const mockResp: GitHubCallbackResp = {
      loginId: 'redirect-login-id',
      status: 'SUCCESS',
      returnPath: '/workspace',
    };
    mockedRequest.mockResolvedValueOnce(mockResp);

    const result = await authService.completeGitHubRedirectCallback({ code: 'github-code', state: 'redirect-state' });

    expect(result).toBe(mockResp);
    expect(result.returnPath).toBe('/workspace');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/auth/github/redirect/callback',
      data: { code: 'github-code', state: 'redirect-state' },
    });
  });
});
