import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

import { request } from '@/request/request';
import { profileService } from './profile';
import type {
  BindOAuth2Req,
  LoginRecordPageReq,
  LoginRecordResp,
  OAuth2BindingListResp,
  PageResp,
  PrepareBindOAuth2Req,
  ProfileResp,
  UpdateProfileReq,
} from '@/types/profile';

const mockedRequest = vi.mocked(request);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('profileService', () => {
  it('getProfile calls GET /api/auth/profile', async () => {
    const profile: ProfileResp = {
      id: 'user-1',
      username: 'yunqi',
      nickname: '云起',
      avatar: 'https://example.com/avatar.png',
      email: 'yunqi@cludix.com',
      phone: '13800000001',
      status: 1,
      createTime: '2026-06-06 10:00:00',
    };
    mockedRequest.mockResolvedValueOnce(profile);

    const result = await profileService.getProfile();

    expect(result).toBe(profile);
    expect(mockedRequest).toHaveBeenCalledWith({ method: 'GET', url: '/api/auth/profile' });
  });

  it('updateProfile calls PUT /api/auth/profile with editable profile fields', async () => {
    const data: UpdateProfileReq = {
      nickname: '新昵称',
      avatar: 'https://example.com/new.png',
      email: 'new@cludix.com',
      phone: '13900000001',
    };
    const updated: ProfileResp = { id: 'user-1', username: 'yunqi', status: 1, ...data };
    mockedRequest.mockResolvedValueOnce(updated);

    const result = await profileService.updateProfile(data);

    expect(result).toBe(updated);
    expect(mockedRequest).toHaveBeenCalledWith({ method: 'PUT', url: '/api/auth/profile', data });
  });

  it('changePassword calls PUT /api/auth/profile/password with password fields', async () => {
    const data = { oldPassword: 'old-secret', newPassword: 'new-secret' };
    mockedRequest.mockResolvedValueOnce(undefined);

    await profileService.changePassword(data);

    expect(mockedRequest).toHaveBeenCalledWith({ method: 'PUT', url: '/api/auth/profile/password', data });
  });

  it('listOAuth2Bindings calls GET /api/auth/profile/oauth2/bindings', async () => {
    const bindings: OAuth2BindingListResp = {
      providers: [
        {
          providerId: 'github',
          providerName: 'GitHub',
          bound: true,
          providerUserId: 'github-user-1',
          displayName: 'Octo Cat',
          linkedAt: '2026-06-06 11:00:00',
        },
      ],
    };
    mockedRequest.mockResolvedValueOnce(bindings);

    const result = await profileService.listOAuth2Bindings();

    expect(result).toBe(bindings);
    expect(mockedRequest).toHaveBeenCalledWith({ method: 'GET', url: '/api/auth/profile/oauth2/bindings' });
  });

  it('bindOAuth2 calls POST /api/auth/profile/oauth2/bindings with provider auth data', async () => {
    const data: BindOAuth2Req = { providerId: 'github', code: 'auth-code', state: 'state-token', takeover: true };
    const bindResult = { bindingId: 'binding-1', status: 'BOUND' as const };
    mockedRequest.mockResolvedValueOnce(bindResult);

    const result = await profileService.bindOAuth2(data);

    expect(result).toBe(bindResult);
    expect(mockedRequest).toHaveBeenCalledWith({ method: 'POST', url: '/api/auth/profile/oauth2/bindings', data });
  });

  it('prepareOAuth2Bind calls POST /api/auth/profile/oauth2/bindings/prepare with provider id', async () => {
    const data: PrepareBindOAuth2Req = { providerId: 'github' };
    const prepareResult = { providerId: 'github', state: 'state-token', authorizeUrl: 'https://github.com/login/oauth/authorize?state=state-token' };
    mockedRequest.mockResolvedValueOnce(prepareResult);

    const result = await profileService.prepareOAuth2Bind(data);

    expect(result).toBe(prepareResult);
    expect(mockedRequest).toHaveBeenCalledWith({ method: 'POST', url: '/api/auth/profile/oauth2/bindings/prepare', data });
  });

  it('unbindOAuth2 calls DELETE /api/auth/profile/oauth2/bindings/{providerId}', async () => {
    mockedRequest.mockResolvedValueOnce(true);

    const result = await profileService.unbindOAuth2('github');

    expect(result).toBe(true);
    expect(mockedRequest).toHaveBeenCalledWith({ method: 'DELETE', url: '/api/auth/profile/oauth2/bindings/github' });
  });

  it('pageLoginRecords calls POST /api/auth/profile/login-records/page with backend pagination data', async () => {
    const data: LoginRecordPageReq = { pageNum: 2, pageSize: 20 };
    const page: PageResp<LoginRecordResp> = {
      data: [
        {
          loginAccount: 'yunqi',
          loginType: 'PASSWORD',
          loginIp: '127.0.0.1',
          deviceInfo: 'Chrome / Mac',
          loginTime: '2026-06-06 12:00:00',
          loginResult: 'SUCCESS',
        },
      ],
      total: 1,
    };
    mockedRequest.mockResolvedValueOnce(page);

    const result = await profileService.pageLoginRecords(data);

    expect(result).toBe(page);
    expect(mockedRequest).toHaveBeenCalledWith({ method: 'POST', url: '/api/auth/profile/login-records/page', data });
  });
});
