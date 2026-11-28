import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { DEFAULT_UPLOAD_POLICY, useUploadPolicyStore } from '@/stores/upload-policy-store';
import { useAuthStore } from '@/stores/auth-store';
import type { TenantProfile } from '@/types/tenant-profile';
import { TenantProfileProvider, TenantSettingsTabs } from './index';
import { tenantProfileService } from '@/api/tenant-profile';
import { appStorageService } from '@/api/storage-service';
import { useTenantBrandStore } from '@/stores/tenant-brand-store';

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

vi.mock('@/stores/tenant-brand-store', async () => {
  const { create } = await import('zustand');
  return {
    useTenantBrandStore: create(() => ({
      tenant: null,
      loaded: false,
      loading: false,
      load: vi.fn().mockResolvedValue(undefined),
      setTenant: vi.fn(),
    })),
  };
});

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
  branding: { loginTitle: 'Acme Cloud', themeColor: '#0f766e' },
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

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

/** 合并后的品牌页把三个资源位放在同一屏，直接按页面取上传框。 */
function getAssetFileInputs(expected: number) {
  const inputs = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')];
  if (inputs.length !== expected) throw new Error(`expected ${expected} asset inputs, got ${inputs.length}`);
  return inputs;
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
          <TenantSettingsTabs />
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

describe('企业资料与品牌设置', () => {
  it('renders profile and branding in one panel without inner tabs', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    // 内层「企业资料 / 品牌与站点」tab 已合并为同一页
    expect(screen.queryByRole('tab', { name: '企业资料' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '品牌与站点' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('企业名称')).toBeInTheDocument();
    expect(screen.getByLabelText('登录页标题')).toBeInTheDocument();
    expect(getAssetFileInputs(3)).toHaveLength(3);
  });

  it('shows recommended image specs on hover', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();

    const tips = await screen.findAllByRole('img', { name: 'question-circle' });
    expect(tips).toHaveLength(3);

    await user.hover(tips[0] as HTMLElement);
    expect(await screen.findByText(/512×512/)).toBeInTheDocument();
    await user.hover(tips[2] as HTMLElement);
    expect(await screen.findByText(/1920×1080/)).toBeInTheDocument();
  });

  it('keeps the local preview and pending upload in the merged panel', async () => {
    const user = userEvent.setup();
    vi.mocked(appStorageService.uploadSimpleFile).mockResolvedValueOnce({
      id: 'task-logo',
      taskMode: 'simple',
      fileName: 'logo.png',
      fileMimeType: 'image/png',
      status: 'COMPLETED',
    });
    mockObjectUrls('blob:logo-preview');

    renderPage();
    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();
    await uploadImage(user, getAssetFileInputs(3)[0] as HTMLInputElement, 'logo.png');

    expect(await screen.findByAltText('企业 Logo')).toHaveAttribute('src', 'blob:logo-preview');
    expect(screen.getByText('待保存生效')).toBeInTheDocument();
  });

  it('refreshes tenant branding after a successful profile save', async () => {
    const user = userEvent.setup();
    const brandRefresh = deferred<boolean>();
    vi.mocked(tenantProfileService.updateProfile).mockResolvedValue(profile);
    vi.mocked(useTenantBrandStore.getState().load).mockReturnValueOnce(brandRefresh.promise);

    renderPage();
    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(useTenantBrandStore.getState().load).toHaveBeenCalledWith({ force: true });
    });
    expect(screen.queryByText('企业资料已保存')).not.toBeInTheDocument();
    expect(screen.queryByText('刷新企业品牌失败')).not.toBeInTheDocument();
    act(() => brandRefresh.resolve(true));
    expect(await screen.findByText('企业资料已保存')).toBeInTheDocument();
  });

  it('keeps the profile save successful when the brand refresh fails', async () => {
    const user = userEvent.setup();
    vi.mocked(tenantProfileService.updateProfile).mockResolvedValue(profile);
    vi.mocked(useTenantBrandStore.getState().load).mockResolvedValue(false);

    renderPage();
    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    expect(await screen.findByText('企业资料已保存')).toBeInTheDocument();
    expect(await screen.findByText('刷新企业品牌失败')).toBeInTheDocument();
    expect(screen.queryByText('保存企业资料失败')).not.toBeInTheDocument();
  });

  it('keeps the profile save successful when the brand refresh rejects', async () => {
    const user = userEvent.setup();
    vi.mocked(tenantProfileService.updateProfile).mockResolvedValue(profile);
    vi.mocked(useTenantBrandStore.getState().load).mockRejectedValue(new Error('refresh failed'));

    renderPage();
    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    expect(await screen.findByText('刷新企业品牌失败')).toBeInTheDocument();
    expect(await screen.findByText('企业资料已保存')).toBeInTheDocument();
    expect(screen.queryByText('保存企业资料失败')).not.toBeInTheDocument();
  });

  it('aggregates the three asset slots into uploadTaskIds on save', async () => {
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
    mockObjectUrls('blob:logo', 'blob:favicon', 'blob:login-background');

    renderPage();

    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();

    // 三个资源位在同一屏，任务仍聚合到同一份表单。
    const assetInputs = getAssetFileInputs(3);
    await uploadImage(user, assetInputs[0] as HTMLInputElement, 'logo.png');
    await uploadImage(user, assetInputs[1] as HTMLInputElement, 'favicon.png');
    await uploadImage(user, assetInputs[2] as HTMLInputElement, 'login-background.png');
    await waitFor(() => expect(screen.getAllByText('待保存生效')).toHaveLength(3));

    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(tenantProfileService.updateProfile).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(tenantProfileService.updateProfile).mock.calls[0][0];
    expect(payload.uploadTaskIds).toEqual({
      logo: ['t1'],
      favicon: ['t2'],
      'login-background': ['t3'],
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
    await uploadImage(user, getAssetFileInputs(3)[0] as HTMLInputElement, 'logo.png');
    await waitFor(() => expect(screen.getAllByText('待保存生效')).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(tenantProfileService.updateProfile).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(tenantProfileService.updateProfile).mock.calls[0][0];
    expect(payload.uploadTaskIds).toEqual({ logo: ['task-logo'] });
    // 换图 = 删旧 + 加新：旧文件随同一次保存提交释放
    expect(payload.deletedFileIds).toEqual(['file-saved-logo']);
  });

  it('submits an empty theme color after the field is cleared', async () => {
    const user = userEvent.setup();
    vi.mocked(tenantProfileService.updateProfile).mockResolvedValue(profile);

    renderPage();
    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();

    // 清空是可提交的编辑：必须显式传空字符串，后端才会删除已保存的主题色；
    // 省略字段会被后端当成「本次未提交」并保留旧值。
    await user.clear(screen.getByLabelText('主题色'));
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(tenantProfileService.updateProfile).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(tenantProfileService.updateProfile).mock.calls[0][0];
    expect(payload.branding?.themeColor).toBe('');
  });

  it('submits the login footer branding fields', async () => {
    const user = userEvent.setup();
    vi.mocked(tenantProfileService.updateProfile).mockResolvedValue(profile);

    renderPage();
    expect(await screen.findByDisplayValue('Acme 科技')).toBeInTheDocument();
    setAdminUser();

    await user.type(screen.getByLabelText('页脚版权文案'), '© 2026 Acme 科技');
    await user.type(screen.getByLabelText('备案号'), '京ICP备12345678号');
    await user.type(screen.getByLabelText('页脚联系邮箱'), 'support@acme.com');
    await user.type(screen.getByLabelText('页脚联系电话'), '+86 138 0000 0000');
    await user.type(screen.getByLabelText('页脚官网'), 'https://www.acme.com');
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(tenantProfileService.updateProfile).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(tenantProfileService.updateProfile).mock.calls[0][0];
    expect(payload.branding).toMatchObject({
      footerCopyright: '© 2026 Acme 科技',
      footerIcp: '京ICP备12345678号',
      footerContactEmail: 'support@acme.com',
      footerContactPhone: '+86 138 0000 0000',
      footerWebsite: 'https://www.acme.com',
    });
  });

  it('submits empty strings after login footer fields are cleared', async () => {
    const user = userEvent.setup();
    vi.mocked(tenantProfileService.getProfile).mockResolvedValue({
      ...profile,
      branding: {
        ...profile.branding,
        footerCopyright: '© 2026 Acme',
        footerIcp: '京ICP备1号',
        footerContactEmail: 'support@acme.com',
        footerContactPhone: '+86 138 0000 0000',
        footerWebsite: 'https://www.acme.com',
      },
    });
    vi.mocked(tenantProfileService.updateProfile).mockResolvedValue(profile);

    renderPage();
    expect(await screen.findByDisplayValue('© 2026 Acme')).toBeInTheDocument();
    setAdminUser();

    for (const label of ['页脚版权文案', '备案号', '页脚联系邮箱', '页脚联系电话', '页脚官网']) {
      await user.clear(screen.getByLabelText(label));
    }
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(tenantProfileService.updateProfile).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(tenantProfileService.updateProfile).mock.calls[0][0];
    expect(payload.branding).toMatchObject({
      footerCopyright: '',
      footerIcp: '',
      footerContactEmail: '',
      footerContactPhone: '',
      footerWebsite: '',
    });
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
    await uploadImage(user, getAssetFileInputs(3)[0] as HTMLInputElement, 'logo.png');

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
