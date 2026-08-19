import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { ProfileService } from '@/api/profile';
import { request } from '@/request/request';
import { useAuthStore } from '@/stores/auth-store';
import { useLocaleStore } from '@/stores/locale-store';
import type { CurrentUser } from '@/types/auth';
import type { LoginRecordResp, PageResp, ProfileResp } from '@/types/profile';
import type { AvatarUploadResult } from './avatar-upload';
import { redirectToAuthorizeUrl } from '@/pages/login/wechat-redirect-navigation';
import { ProfileInfoPage } from './index';

vi.mock('@/pages/login/wechat-redirect-navigation', () => ({
  redirectToAuthorizeUrl: vi.fn(),
}));

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function mockObjectUrl(objectUrl: string) {
  const createObjectURL = vi.fn(() => objectUrl);
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  return { createObjectURL, revokeObjectURL };
}

function mockObjectUrls(...urls: readonly string[]) {
  const objectUrls = [...urls];
  const createObjectURL = vi.fn(() => {
    const objectUrl = objectUrls.shift();
    if (!objectUrl) throw new Error('Missing object URL mock');
    return objectUrl;
  });
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  return { createObjectURL, revokeObjectURL };
}

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

const loginRecords: PageResp<LoginRecordResp> = {
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

const uploadedAvatarTask: AvatarUploadResult['task'] = {
  id: 'task-avatar-1',
  taskMode: 'simple',
  fileName: 'new-avatar.png',
  fileMimeType: 'image/png',
  status: 'COMPLETED',
};

function createService(overrides: Partial<ProfileService> = {}): ProfileService {
  return {
    getProfile: vi.fn().mockResolvedValue(profile),
    updateProfile: vi.fn().mockResolvedValue(profile),
    listOAuth2Bindings: vi.fn().mockResolvedValue({
      providers: [
        { providerId: 'github', providerName: 'GitHub', bound: true, providerUserId: 'github-user-1', displayName: 'Octo Cat', linkedAt: '2026-06-06 11:00:00' },
        { providerId: 'sso', providerName: '企业 SSO', bound: false },
      ],
    }),
    prepareOAuth2Bind: vi.fn().mockResolvedValue({
      providerId: 'sso',
      state: 'state-token',
      authorizeUrl: 'https://sso.example.com/oauth/authorize?state=state-token',
    }),
    bindOAuth2: vi.fn().mockResolvedValue({ bindingId: 'binding-1', status: 'BOUND' }),
    unbindOAuth2: vi.fn().mockResolvedValue(true),
    changePassword: vi.fn().mockResolvedValue(undefined),
    pageLoginRecords: vi.fn().mockResolvedValue(loginRecords),
    ...overrides,
  };
}

function setStoredUser(overrides: Partial<CurrentUser> = {}) {
  act(() => {
    useAuthStore.getState().setUser({
      id: profile.id,
      name: profile.nickname ?? profile.username ?? profile.id,
      username: profile.username,
      avatar: profile.avatar,
      roles: ['admin'],
      permissions: ['profile:update'],
      ...overrides,
    });
  });
}

function renderPage(service = createService(), props: Partial<Parameters<typeof ProfileInfoPage>[0]> = {}) {
  render(
    <NebulaProvider>
      <ProfileInfoPage service={service} {...props} />
    </NebulaProvider>,
  );
  return service;
}

describe('ProfileInfoPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
      useAuthStore.getState().clearUser();
    });
  });

  it('loads profile, OAuth2 bindings, and login records', async () => {
    const service = renderPage();

    expect(await screen.findByDisplayValue('云起')).toBeInTheDocument();
    expect(screen.getByDisplayValue('yunqi@cludix.com')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Octo Cat')).toBeInTheDocument();
    expect(screen.queryByText('github-user-1')).not.toBeInTheDocument();
    expect(screen.getByText('已绑定')).toBeInTheDocument();
    expect(await screen.findByText('127.0.0.1')).toBeInTheDocument();
    expect(screen.getByText('Chrome / Mac')).toBeInTheDocument();
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.queryByText('失败')).not.toBeInTheDocument();
    expect(screen.getAllByText('账号')).not.toHaveLength(0);
    expect(screen.getByText('显示名称')).toBeInTheDocument();
    expect(service.getProfile).toHaveBeenCalledTimes(1);
    expect(service.listOAuth2Bindings).toHaveBeenCalledTimes(1);
    expect(service.pageLoginRecords).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 });
  });

  it('falls back to provider user id when OAuth2 display name is unavailable', async () => {
    const service = createService({
      listOAuth2Bindings: vi.fn().mockResolvedValue({
        providers: [
          { providerId: 'github', providerName: 'GitHub', bound: true, providerUserId: 'github-user-1', linkedAt: '2026-06-06 11:00:00' },
        ],
      }),
    });

    renderPage(service);

    expect(await screen.findByText('github-user-1')).toBeInTheDocument();
  });

  it('submits editable profile fields through the service', async () => {
    const user = userEvent.setup();
    const service = createService({
      updateProfile: vi.fn().mockResolvedValue({ ...profile, nickname: '新昵称' }),
    });
    renderPage(service);

    const nickname = await screen.findByLabelText('昵称');
    setStoredUser();
    await user.clear(nickname);
    await user.type(nickname, '新昵称');
    await user.click(screen.getByRole('button', { name: /保存资料/ }));

    await waitFor(() => {
      expect(service.updateProfile).toHaveBeenCalledWith({
        nickname: '新昵称',
        avatar: 'https://example.com/avatar.png',
        email: 'yunqi@cludix.com',
        phone: '13800000001',
      });
    });
    await waitFor(() => {
      expect(useAuthStore.getState().user).toMatchObject({
        id: 'user-1',
        name: '新昵称',
        username: 'yunqi',
        avatar: 'https://example.com/avatar.png',
        roles: ['admin'],
        permissions: ['profile:update'],
      });
    });
  });

  it('loads protected storage avatar previews through the authenticated request client', async () => {
    const storageAvatarUrl = '/api/storage/download?fileId=file-avatar&filename=avatar.png';
    const service = createService({
      getProfile: vi.fn().mockResolvedValue({ ...profile, avatar: storageAvatarUrl }),
    });
    const avatarBlob = new Blob(['avatar'], { type: 'image/png' });
    vi.mocked(request).mockResolvedValue(avatarBlob);
    const { createObjectURL } = mockObjectUrl('blob:avatar-preview');

    renderPage(service);

    const image = await screen.findByAltText('头像');
    await waitFor(() => expect(image).toHaveAttribute('src', 'blob:avatar-preview'));
    expect(createObjectURL).toHaveBeenCalledWith(avatarBlob);
    expect(request).toHaveBeenCalledWith({
      url: storageAvatarUrl,
      method: 'GET',
      responseType: 'blob',
    });
  });

  it('auto-saves the profile after uploading an avatar', async () => {
    const user = userEvent.setup();
    const service = createService();
    let resolveUpload: (value: AvatarUploadResult) => void;
    const uploadAvatar = vi.fn<(file: File) => Promise<AvatarUploadResult>>().mockImplementation(
      () => new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const { createObjectURL } = mockObjectUrl('blob:selected-avatar');
    renderPage(service, { uploadAvatar });

    const avatarButton = await screen.findByRole('button', { name: '上传头像' });
    setStoredUser();
    expect(avatarButton).toBeInTheDocument();
    expect(screen.getByText('点击头像上传新图片')).toBeInTheDocument();
    expect(screen.queryByLabelText('头像地址')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('https://example.com/avatar.png')).not.toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('avatar file input was not rendered');

    const file = new File(['avatar'], 'new-avatar.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(uploadAvatar).toHaveBeenCalledWith(file);
      expect(screen.getByAltText('头像')).toHaveAttribute('src', 'blob:selected-avatar');
    });
    expect(createObjectURL).toHaveBeenCalledWith(file);

    act(() => {
      resolveUpload({
        task: uploadedAvatarTask,
        avatarUrl: 'https://example.com/new-avatar.png',
      });
    });

    await waitFor(() => {
      expect(screen.getByAltText('头像')).toHaveAttribute('src', 'blob:selected-avatar');
    });
    await waitFor(() => {
      expect(service.updateProfile).toHaveBeenCalledWith({
        nickname: '云起',
        avatar: 'https://example.com/new-avatar.png',
        email: 'yunqi@cludix.com',
        phone: '13800000001',
      });
    });
    await waitFor(() => {
      expect(useAuthStore.getState().user).toMatchObject({
        id: 'user-1',
        name: '云起',
        username: 'yunqi',
        avatar: 'https://example.com/new-avatar.png',
        roles: ['admin'],
        permissions: ['profile:update'],
      });
    });
  });

  it('does not render an avatar delete action', async () => {
    const service = renderPage();

    expect(await screen.findByAltText('头像')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除头像' })).not.toBeInTheDocument();
    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  it('keeps the selected avatar preview while the protected upload preview is loading', async () => {
    const user = userEvent.setup();
    const oldAvatarUrl = '/api/storage/download?fileId=old-avatar&filename=old-avatar.png';
    const newAvatarUrl = '/api/storage/download?fileId=new-avatar&filename=new-avatar.png';
    let resolveNewPreview: (value: Blob) => void = () => {};
    const service = createService({
      getProfile: vi.fn().mockResolvedValue({ ...profile, avatar: oldAvatarUrl }),
    });
    vi.mocked(request)
      .mockResolvedValueOnce(new Blob(['old-avatar'], { type: 'image/png' }))
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveNewPreview = resolve;
      }));
    const uploadAvatar = vi.fn<(file: File) => Promise<AvatarUploadResult>>().mockResolvedValue({
      task: uploadedAvatarTask,
      avatarUrl: newAvatarUrl,
    });
    mockObjectUrls('blob:old-avatar-preview', 'blob:selected-avatar-preview', 'blob:new-avatar-preview');

    renderPage(service, { uploadAvatar });

    await waitFor(() => expect(screen.getByAltText('头像')).toHaveAttribute('src', 'blob:old-avatar-preview'));
    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('avatar file input was not rendered');

    const file = new File(['avatar'], 'new-avatar.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    await waitFor(() => expect(request).toHaveBeenCalledWith({
      url: newAvatarUrl,
      method: 'GET',
      responseType: 'blob',
    }));
    expect(screen.getByAltText('头像')).toHaveAttribute('src', 'blob:selected-avatar-preview');

    act(() => {
      resolveNewPreview(new Blob(['new-avatar'], { type: 'image/png' }));
    });

    await waitFor(() => {
      expect(screen.getByAltText('头像')).toHaveAttribute('src', 'blob:selected-avatar-preview');
    });
  });

  it('unbinds a bound OAuth2 provider and refreshes binding status', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('GitHub');
    const providerCard = screen.getByTestId('oauth2-provider-github');

    await user.click(within(providerCard).getByRole('button', { name: /解\s*绑/ }));
    await user.click(await screen.findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => {
      expect(service.unbindOAuth2).toHaveBeenCalledWith('github');
      expect(service.listOAuth2Bindings).toHaveBeenCalledTimes(2);
    });
  });

  it('starts provider authorization when binding an unbound OAuth2 provider', async () => {
    const user = userEvent.setup();
    const service = createService();
    renderPage(service);

    await screen.findByText('企业 SSO');
    const providerCard = screen.getByTestId('oauth2-provider-sso');
    await user.click(within(providerCard).getByRole('button', { name: /绑\s*定/ }));

    await waitFor(() => {
      expect(service.prepareOAuth2Bind).toHaveBeenCalledWith({ providerId: 'sso' });
      expect(redirectToAuthorizeUrl).toHaveBeenCalledWith('https://sso.example.com/oauth/authorize?state=state-token');
    });
  });

  it('submits password changes through the service', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByRole('button', { name: /修改密码/ });
    await user.type(screen.getByLabelText('原密码'), 'old-secret');
    await user.type(screen.getByLabelText('新密码'), 'new-secret');
    await user.type(screen.getByLabelText('确认新密码'), 'new-secret');
    await user.click(screen.getByRole('button', { name: /修改密码/ }));

    await waitFor(() => {
      expect(service.changePassword).toHaveBeenCalledWith({ oldPassword: 'old-secret', newPassword: 'new-secret' });
    });
  });

  it('renders page labels from the active English locale', async () => {
    act(() => {
      useLocaleStore.getState().setLocale('en-US');
    });

    renderPage();

    expect(await screen.findByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Profile/ })).toBeInTheDocument();
    expect(screen.getAllByText('Account')).not.toHaveLength(0);
    expect(screen.getByText('Display Name')).toBeInTheDocument();
    expect(await screen.findByText('127.0.0.1')).toBeInTheDocument();
  });
});
