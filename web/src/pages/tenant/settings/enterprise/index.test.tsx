import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { DEFAULT_UPLOAD_POLICY, useUploadPolicyStore } from '@/stores/upload-policy-store';
import { useAuthStore } from '@/stores/auth-store';
import type { TenantProfile } from '@/types/tenant-profile';
import { TenantEnterpriseSettingsPage } from './index';
import { tenantProfileService } from '@/api/tenant-profile';
import { appStorageService } from '@/api/storage-service';

vi.mock('@/api/tenant-profile', () => ({
  tenantProfileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock('@/api/storage-service', () => ({
  appStorageService: {
    uploadSimpleFile: vi.fn(),
    createUploadTask: vi.fn(),
    uploadTaskPart: vi.fn(),
    completeUploadTask: vi.fn(),
  },
}));

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

const profile: TenantProfile = {
  id: 'tenant-1',
  code: 'ACME',
  name: 'Acme 科技',
  shortName: 'Acme',
  status: 'ACTIVE',
  contactEmail: 'contact@acme.com',
  domains: [],
  branding: {},
};

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

/** 四个资源位按页面渲染顺序排列：企业 Logo、登录页 Logo、Favicon、登录页背景图。 */
function getAssetFileInputs() {
  const inputs = [...document.querySelectorAll('input[type="file"]')];
  if (inputs.length !== 4) throw new Error(`expected 4 asset inputs, got ${inputs.length}`);
  return {
    logo: inputs[0] as HTMLInputElement,
    loginLogo: inputs[1] as HTMLInputElement,
    favicon: inputs[2] as HTMLInputElement,
    loginBackground: inputs[3] as HTMLInputElement,
  };
}

async function uploadImage(user: ReturnType<typeof userEvent.setup>, input: HTMLInputElement, name: string) {
  await user.upload(input, new File(['image'], name, { type: 'image/png' }));
}

/** 页面挂载时 NebulaProvider 会用 authAdapter 刷新用户；权限要在挂载后再写入。 */
function setAdminUser() {
  act(() => {
    useAuthStore.getState().setUser({
      id: 'user-1',
      name: '管理员',
      username: 'admin',
      roles: ['ADMIN'],
      permissions: ['BUTTON:TENANT_PROFILE_UPDATE:Allow'],
    });
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <NebulaProvider>
        <TenantEnterpriseSettingsPage />
      </NebulaProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useUploadPolicyStore.setState({ policy: DEFAULT_UPLOAD_POLICY, loaded: true });
  vi.mocked(tenantProfileService.getProfile).mockResolvedValue(profile);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
  act(() => useAuthStore.getState().clearUser());
});

describe('TenantEnterpriseSettingsPage asset uploads', () => {
  it('aggregates the four asset slots into uploadTaskIds on save', async () => {
    const user = userEvent.setup();
    const taskIds = ['t1', 't2', 't3', 't4'];
    const uploadSimpleFile = vi.mocked(appStorageService.uploadSimpleFile);
    taskIds.forEach((taskId, index) => {
      uploadSimpleFile.mockResolvedValueOnce({
        id: taskId,
        taskMode: 'simple',
        fileName: `${taskId}.png`,
        fileMimeType: 'image/png',
        status: 'COMPLETED',
      });
    });
    vi.mocked(tenantProfileService.updateProfile).mockResolvedValue({
      ...profile,
      logo: 'https://cdn.example.com/logo.png',
    });
    mockObjectUrls('blob:logo', 'blob:login-logo', 'blob:favicon', 'blob:login-background');

    renderPage();

    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();
    const inputs = getAssetFileInputs();
    await uploadImage(user, inputs.logo, 'logo.png');
    await waitFor(() => expect(screen.getByText('待保存生效')).toBeInTheDocument());
    await uploadImage(user, inputs.loginLogo, 'login-logo.png');
    await uploadImage(user, inputs.favicon, 'favicon.png');
    await uploadImage(user, inputs.loginBackground, 'login-background.png');
    await waitFor(() => expect(screen.getAllByText('待保存生效')).toHaveLength(4));

    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(tenantProfileService.updateProfile).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(tenantProfileService.updateProfile).mock.calls[0][0];
    expect(payload.uploadTaskIds).toEqual({
      logo: ['t1'],
      'login-logo': ['t2'],
      favicon: ['t3'],
      'login-background': ['t4'],
    });
    // 图片地址不再随请求提交：绑定由后端保存接口完成，地址只在响应里返回
    expect(payload).not.toHaveProperty('logo');
    expect(payload.branding).not.toHaveProperty('loginLogo');
    expect(payload.branding).not.toHaveProperty('favicon');
    expect(payload.branding).not.toHaveProperty('loginBackground');

    await waitFor(() => expect(screen.getByAltText('企业 Logo')).toHaveAttribute('src', 'https://cdn.example.com/logo.png'));
    expect(screen.queryByText('待保存生效')).not.toBeInTheDocument();
  });

  it('keeps the pending task and local preview when the save fails', async () => {
    const user = userEvent.setup();
    vi.mocked(appStorageService.uploadSimpleFile).mockResolvedValueOnce({
      id: 'task-logo',
      taskMode: 'simple',
      fileName: 'logo.png',
      fileMimeType: 'image/png',
      status: 'COMPLETED',
    });
    vi.mocked(tenantProfileService.updateProfile).mockRejectedValue(new Error('save failed'));
    mockObjectUrls('blob:logo-preview');

    renderPage();

    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();
    await uploadImage(user, getAssetFileInputs().logo, 'logo.png');

    // 上传只产生待提交任务：提示必须写明「保存后生效」，不能宣称已生效
    expect(await screen.findByText('图片已上传，保存后生效')).toBeInTheDocument();
    expect(screen.queryByText('图片已上传')).not.toBeInTheDocument();
    expect(screen.getByAltText('企业 Logo')).toHaveAttribute('src', 'blob:logo-preview');
    expect(screen.getByText('待保存生效')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    expect(await screen.findByText('保存企业资料失败')).toBeInTheDocument();
    expect(vi.mocked(tenantProfileService.updateProfile).mock.calls[0][0].uploadTaskIds).toEqual({ logo: ['task-logo'] });
    // 保存失败：本地预览与待提交提示都保留，重试仍会用同一个 taskId
    expect(screen.getByAltText('企业 Logo')).toHaveAttribute('src', 'blob:logo-preview');
    expect(screen.getByText('待保存生效')).toBeInTheDocument();
    // 前端不发起任何绑定请求：存储服务只被用于上传
    expect(Object.keys(appStorageService).sort()).toEqual([
      'completeUploadTask',
      'createUploadTask',
      'uploadSimpleFile',
      'uploadTaskPart',
    ]);
    expect(appStorageService.createUploadTask).not.toHaveBeenCalled();
    expect(appStorageService.uploadTaskPart).not.toHaveBeenCalled();
    expect(appStorageService.completeUploadTask).not.toHaveBeenCalled();
  });
});
