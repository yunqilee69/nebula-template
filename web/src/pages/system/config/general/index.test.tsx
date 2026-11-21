import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { paramService } from '@/services/param';
import { storageSettingsService } from '@/services/storage-settings';
import { tenantProfileService } from '@/api/tenant-profile';
import { clearAuthForTest, echoAuthAdapter, signInAsAdminForTest } from '@/test/auth-test-helpers';
import { GeneralConfigPage } from './index';

vi.mock('@/services/param', () => ({
  paramService: {
    getGeneralConfig: vi.fn(),
    updateGeneralConfig: vi.fn(),
  },
}));

vi.mock('@/services/storage-settings', () => ({
  storageSettingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

vi.mock('@/services/notify', () => ({
  notifyService: { testEmailNotify: vi.fn() },
}));

vi.mock('@/api/tenant-profile', () => ({
  tenantProfileService: { getProfile: vi.fn(), updateProfile: vi.fn() },
}));

vi.mock('@/api/storage-service', () => ({
  appStorageService: {
    uploadSimpleFile: vi.fn(),
    createUploadTask: vi.fn(),
    uploadTaskPart: vi.fn(),
    completeUploadTask: vi.fn(),
  },
}));

const getGeneralConfig = vi.mocked(paramService.getGeneralConfig);
const getStorageSettings = vi.mocked(storageSettingsService.getSettings);
const getTenantProfile = vi.mocked(tenantProfileService.getProfile);

function renderPage() {
  getGeneralConfig.mockResolvedValue({ usernameRegisterEnabled: true });
  getStorageSettings.mockResolvedValue({
    source: 'APPLICATION',
    mode: 'local',
    installedTypes: ['filesystem', 'db'],
    application: { type: 'db', hasAccessKey: false, hasSecretKey: false, directDownloadExpireSeconds: 300 },
    tenant: { type: 'application' },
    uploadPolicy: { maxFileSize: 100, chunkThreshold: 10, chunkSize: 5, allowedExtensions: '', tempRetentionDays: 14 },
    maxUploadFileSizeMb: 110,
    foreignFileCount: 0,
  });

  getTenantProfile.mockResolvedValue({
    id: 'tenant-1', code: 'ACME', name: 'Acme', shortName: 'Acme', status: 'ACTIVE',
    contactEmail: 'contact@acme.com', domains: [], branding: {}, createTime: '', updateTime: '',
  });
  render(
    <NebulaProvider authAdapter={echoAuthAdapter}>
      <GeneralConfigPage />
    </NebulaProvider>,
  );
}

describe('GeneralConfigPage', () => {
  beforeEach(() => {
    signInAsAdminForTest();
  });

  afterEach(() => {
    clearAuthForTest();
    vi.clearAllMocks();
  });

  it('renders the auth tab with both oauth2 and login policies', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('tab', { name: '认证' }));

    // 同一 tab 内两块不同接口的内容：OAuth2 列表 + 登录/注册参数
    expect(await screen.findByText('新增配置')).toBeInTheDocument();
    expect(await screen.findByText('用户名注册开关')).toBeInTheDocument();
  });

  it('renders the storage tab next to the parameter tabs so storage is configured in one place', async () => {
    const user = userEvent.setup();
    renderPage();

    const storageTab = await screen.findByRole('tab', { name: '存储' });
    await user.click(storageTab);

    // 存储面板挂在同一页：既能选后端，也能改上传策略
    await waitFor(() => expect(screen.getByText('后端存储')).toBeInTheDocument());
    expect(screen.getByText('上传策略')).toBeInTheDocument();
    expect(screen.getByText('application.yml 当前配置')).toBeInTheDocument();
  });

  it('hides the tenant and storage tabs when the user lacks their read permissions', async () => {
    clearAuthForTest();
    renderPage();

    expect(await screen.findByRole('tab', { name: '认证' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '企业信息' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '存储' })).not.toBeInTheDocument();
    // 没有企业资料权限时不应发起读取，避免进页面就看到「加载失败」
    expect(tenantProfileService.getProfile).not.toHaveBeenCalled();
  });

  it('renders the storage panel after entering the storage tab', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('tab', { name: '存储' }));

    // 进入 tab 才加载：面板要能渲染出后端存储与上传策略两块内容
    expect(await screen.findByText('后端存储')).toBeInTheDocument();
    expect(screen.getByText('上传策略')).toBeInTheDocument();
    expect(screen.getByText('application.yml 当前配置')).toBeInTheDocument();
  });

  it('shows a readable error with a retry action when storage settings fail to load', async () => {
    const user = userEvent.setup();
    renderPage();
    // renderPage 会先给一个成功实现；这里覆盖成失败，模拟接口被拒绝
    getStorageSettings.mockRejectedValue(new Error('无权限调用该接口'));

    await user.click(await screen.findByRole('tab', { name: '存储' }));

    // 面板在 tab 内：失败不能只剩空白，必须给出原因与重试入口
    expect(await screen.findByText('存储配置加载失败')).toBeInTheDocument();
    expect(screen.getByText(/无权限调用该接口/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重\s*试/ })).toBeInTheDocument();

    // 重试成功后恢复到正常配置面板
    getStorageSettings.mockResolvedValue({
      source: 'APPLICATION',
      mode: 'local',
      installedTypes: ['filesystem', 'db'],
      application: { type: 'db', hasAccessKey: false, hasSecretKey: false, directDownloadExpireSeconds: 300 },
      tenant: { type: 'application' },
      uploadPolicy: { maxFileSize: 100, chunkThreshold: 10, chunkSize: 5, allowedExtensions: '', tempRetentionDays: 14 },
      maxUploadFileSizeMb: 110,
      foreignFileCount: 0,
    });
    await user.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(await screen.findByText('application.yml 当前配置')).toBeInTheDocument();
  });

  it('keeps the remaining parameter tabs from the general-config DTO', async () => {
    renderPage();

    // 登录与注册已并入「认证」，其余参数 tab 仍按原样渲染
    expect(await screen.findByRole('tab', { name: '认证' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '登录与注册' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '审计' })).toBeInTheDocument();
  });

  it('merges tenant settings into 企业信息 and 认证 tabs', async () => {
    const user = userEvent.setup();
    renderPage();

    // 企业资料、品牌、企业标识合并为一个「企业信息」tab
    expect(await screen.findByRole('tab', { name: '企业信息' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '基础信息' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '品牌与登录页' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '企业标识' })).not.toBeInTheDocument();
    // 登录与安全（OAuth2）与登录/注册参数合并为「认证」
    expect(screen.getByRole('tab', { name: '认证' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '登录与注册' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '登录与安全' })).not.toBeInTheDocument();

    // 企业信息是默认激活的 tab，挂载即拉取企业资料
    await waitFor(() => expect(tenantProfileService.getProfile).toHaveBeenCalled());
    // 同一 tab 内三段都在：资料、品牌、企业标识
    expect((await screen.findAllByDisplayValue('Acme')).length).toBeGreaterThan(0);
    expect(screen.getByText(/自定义企业 Logo/)).toBeInTheDocument();
    expect(screen.getByText('企业代码')).toBeInTheDocument();
  });
});
