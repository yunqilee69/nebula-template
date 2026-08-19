import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProfileService } from '@/api/profile';
import { HeaderUserMenu } from '@/layouts/components/header-user-menu';
import { NebulaProvider } from '@/providers/nebula-provider';
import { request } from '@/request/request';
import { useAuthStore } from '@/stores/auth-store';
import type { CurrentUser } from '@/types/auth';
import type { LoginRecordResp, PageResp, ProfileResp } from '@/types/profile';
import type { AvatarUploadResult } from './avatar-upload';
import { ProfileInfoPage } from './index';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

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

const loginRecords: PageResp<LoginRecordResp> = { data: [], total: 0 };

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
    listOAuth2Bindings: vi.fn().mockResolvedValue({ providers: [] }),
    prepareOAuth2Bind: vi.fn().mockResolvedValue({ providerId: 'sso', state: 'state-token', authorizeUrl: 'https://sso.example.com/oauth/authorize' }),
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

function renderProfileWithHeader(service: ProfileService, uploadAvatar: (file: File) => Promise<AvatarUploadResult>) {
  render(
    <MemoryRouter>
      <NebulaProvider>
        <HeaderUserMenu onOpenProfile={vi.fn()} />
        <ProfileInfoPage service={service} uploadAvatar={uploadAvatar} />
      </NebulaProvider>
    </MemoryRouter>,
  );
}

describe('ProfileInfoPage avatar previews', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
    act(() => useAuthStore.getState().clearUser());
  });

  it('keeps uploaded avatar images visible on the page and Header when protected preview loading fails', async () => {
    const user = userEvent.setup();
    const uploadedAvatarUrl = '/api/storage/download?fileId=new-avatar&filename=new-avatar.png';
    const service = createService();
    const uploadAvatar = vi.fn<(file: File) => Promise<AvatarUploadResult>>().mockResolvedValue({
      task: uploadedAvatarTask,
      avatarUrl: uploadedAvatarUrl,
    });
    vi.mocked(request).mockRejectedValue(new Error('download failed'));
    mockObjectUrls('blob:selected-avatar', 'blob:header-avatar');

    renderProfileWithHeader(service, uploadAvatar);

    await screen.findByRole('button', { name: '上传头像' });
    setStoredUser();
    const fileInput = document.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('avatar file input was not rendered');

    const file = new File(['avatar'], 'new-avatar.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    await waitFor(() => expect(service.updateProfile).toHaveBeenCalledWith({
      nickname: '云起',
      avatar: uploadedAvatarUrl,
      email: 'yunqi@cludix.com',
      phone: '13800000001',
    }));
    await waitFor(() => expect(request).toHaveBeenCalledWith({
      url: uploadedAvatarUrl,
      method: 'GET',
      responseType: 'blob',
    }));

    expect(screen.getByAltText('头像')).toHaveAttribute('src', 'blob:selected-avatar');
    const headerButton = screen.getByRole('button', { name: '云起' });
    expect(within(headerButton).getByAltText('云起')).toHaveAttribute('src', 'blob:header-avatar');
    expect(useAuthStore.getState().user).toMatchObject({
      avatar: uploadedAvatarUrl,
      avatarPreview: 'blob:header-avatar',
    });
  });
});
