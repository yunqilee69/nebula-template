import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { DEFAULT_UPLOAD_POLICY, useUploadPolicyStore } from '@/stores/upload-policy-store';
import { useAuthStore } from '@/stores/auth-store';
import type { TenantProfile } from '@/types/tenant-profile';
import { Tabs } from 'antd';
import { TenantInfoTab, TenantProfileProvider } from './index';
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
    getDownloadLocationsBySource: vi.fn(),
    getDownloadLocation: vi.fn(),
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

/**
 * 当前激活 tab 内的资源位上传框。
 *
 * <p>antd v6 切换后仍保留已渲染面板的 DOM，只有激活面板带 `-active` 标记，
 * 因此按激活容器取，避免拿到上一个 tab 残留的 input。</p>
 */
function getAssetFileInputs(expected: number) {
  const activePane = document.querySelector('.ant-tabs-content-active') ?? document.querySelector('[role="tabpanel"]');
  const inputs = [...(activePane?.querySelectorAll('input[type="file"]') ?? [])];
  if (inputs.length !== expected) throw new Error(`expected ${expected} asset inputs, got ${inputs.length}`);
  return inputs as HTMLInputElement[];
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

/**
 * 与高级配置页同构的测试壳：企业信息是一块页面（资料 + 品牌 + 企业标识），
 * provider 负责共享表单与加载状态。
 */
function renderPage() {
  render(
    <MemoryRouter>
      <NebulaProvider>
        <TenantProfileProvider>
          <Tabs items={[{ key: 'tenant-info', label: '企业信息', children: <TenantInfoTab /> }]} />
        </TenantProfileProvider>
      </NebulaProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useUploadPolicyStore.setState({ policy: DEFAULT_UPLOAD_POLICY, loaded: true });
  vi.mocked(tenantProfileService.getProfile).mockResolvedValue(profile);
  // 资源位组件挂载时会按业务归属解析下载地址；默认没有已保存图片
  vi.mocked(appStorageService.getDownloadLocationsBySource).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  // reset 而不是 clear：mockResolvedValueOnce 的队列会跨用例残留，导致下一个用例拿到上一个的 taskId
  vi.resetAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
  act(() => useAuthStore.getState().clearUser());
});

describe('企业信息 tab 的资源位上传', () => {
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
    vi.mocked(tenantProfileService.updateProfile).mockResolvedValue(profile);
    // 保存成功后组件重新解析下载地址：这里给出服务端最新的一张 Logo
    const reloadedLogo = 'https://cdn.example.com/logo.png';
    vi.mocked(appStorageService.getDownloadLocationsBySource)
      .mockResolvedValueOnce([])  // 首次挂载：还没有图
      .mockResolvedValue([
        { fileId: 'file-logo', fileName: 'logo.png', mode: 'DIRECT', url: reloadedLogo },
      ]);
    mockObjectUrls('blob:logo', 'blob:login-logo', 'blob:favicon', 'blob:login-background');

    renderPage();

    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();

    // 企业信息一块页面里依次上传四个资源位（资料区 1 个 + 品牌区 3 个）
    const inputs = getAssetFileInputs(4);
    await uploadImage(user, inputs[0] as HTMLInputElement, 'logo.png');
    await uploadImage(user, inputs[1] as HTMLInputElement, 'login-logo.png');
    await uploadImage(user, inputs[2] as HTMLInputElement, 'favicon.png');
    await uploadImage(user, inputs[3] as HTMLInputElement, 'login-background.png');
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

    // 保存成功后按业务归属重新解析：图片地址来自下载位置，不再依赖资料响应
    await waitFor(() => {
      expect(appStorageService.getDownloadLocationsBySource).toHaveBeenCalledWith({
        sourceEntity: 'tenant-profile',
        sourceId: 'tenant-1',
        sourceType: 'logo',
      });
    });
    await waitFor(() => expect(screen.getByAltText('企业 Logo')).toHaveAttribute('src', 'https://cdn.example.com/logo.png'));
    expect(screen.queryByText('待保存生效')).not.toBeInTheDocument();
  });

  it('submits the replaced asset file id so the backend can release it', async () => {
    const user = userEvent.setup();
    vi.mocked(appStorageService.uploadSimpleFile).mockResolvedValueOnce({
      id: 'task-logo',
      taskMode: 'simple',
      fileName: 'logo.png',
      fileMimeType: 'image/png',
      status: 'COMPLETED',
    });
    // 该资源位已有一张保存过的图：换图时它必须进 deletedFileIds
    vi.mocked(appStorageService.getDownloadLocationsBySource).mockResolvedValue([
      { fileId: 'file-saved-logo', fileName: 'old-logo.png', mode: 'PROXY', url: '/api/storage/download?fileId=file-saved-logo' },
    ]);
    vi.mocked(tenantProfileService.updateProfile).mockResolvedValue(profile);
    mockObjectUrls('blob:new-logo');

    renderPage();

    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();
    await uploadImage(user, getAssetFileInputs(4)[0] as HTMLInputElement, 'logo.png');
    await waitFor(() => expect(screen.getAllByText('待保存生效')).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(tenantProfileService.updateProfile).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(tenantProfileService.updateProfile).mock.calls[0][0];
    expect(payload.uploadTaskIds).toEqual({ logo: ['task-logo'] });
    // 换图 = 删旧 + 加新：旧文件随同一次保存提交释放
    expect(payload.deletedFileIds).toEqual(['file-saved-logo']);
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
    await uploadImage(user, getAssetFileInputs(4)[0] as HTMLInputElement, 'logo.png');

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
      'getDownloadLocation',
      'getDownloadLocationsBySource',
      'uploadSimpleFile',
      'uploadTaskPart',
    ]);
    expect(appStorageService.createUploadTask).not.toHaveBeenCalled();
    expect(appStorageService.uploadTaskPart).not.toHaveBeenCalled();
    expect(appStorageService.completeUploadTask).not.toHaveBeenCalled();
  });
});
