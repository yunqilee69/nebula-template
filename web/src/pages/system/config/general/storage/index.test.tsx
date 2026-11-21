import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { storageSettingsService } from '@/services/storage-settings';
import { clearAuthForTest, echoAuthAdapter, signInAsAdminForTest } from '@/test/auth-test-helpers';
import type { StorageSettings } from '@/types/storage-settings';
import { StorageSettingsPanel } from './index';

vi.mock('@/services/storage-settings', () => ({
  storageSettingsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

const getSettings = vi.mocked(storageSettingsService.getSettings);
const updateSettings = vi.mocked(storageSettingsService.updateSettings);

/** 跟随 application.yml 时的典型视图：在线配置只有哨兵取值，application 层是真实配置。 */
const applicationSourceSettings: StorageSettings = {
  source: 'APPLICATION',
  mode: 'local',
  installedTypes: ['filesystem', 'db', 'minio'],
  application: {
    type: 'db',
    hasAccessKey: false,
    hasSecretKey: false,
    createBucketIfMissing: false,
    directDownloadEnabled: false,
    directDownloadExpireSeconds: 300,
  },
  tenant: { type: 'application' },
  uploadPolicy: { maxFileSize: 100, chunkThreshold: 10, chunkSize: 5, allowedExtensions: '', tempRetentionDays: 14 },
  maxUploadFileSizeMb: 110,
  foreignFileCount: 0,
};

function renderPanel(settings: StorageSettings = applicationSourceSettings) {
  getSettings.mockResolvedValue(settings);
  render(
    <NebulaProvider authAdapter={echoAuthAdapter}>
      <StorageSettingsPanel />
    </NebulaProvider>,
  );
}

/** 定位存储后端下拉框：页面里只有一个 Select，等配置加载完成后再取。 */
async function getBackendSelect(): Promise<HTMLElement> {
  return waitFor(() => {
    const select = document.querySelector('.ant-select');
    if (select instanceof HTMLElement) return select;
    throw new Error('未找到存储后端下拉框');
  });
}

async function pickBackend(user: ReturnType<typeof userEvent.setup>, label: string): Promise<void> {
  await user.click(await getBackendSelect());
  const option = await screen.findByText(label, { selector: '.ant-select-item-option-content' });
  await user.click(option);
}

describe('StorageSettingsPanel', () => {
  beforeEach(() => {
    signInAsAdminForTest();
    updateSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    clearAuthForTest();
    vi.clearAllMocks();
  });

  it('跟随 application.yml 时展示启动配置，而不是让用户误以为在线值生效', async () => {
    renderPanel();

    await screen.findByText('application.yml 当前配置');
    expect(screen.getAllByText('数据库（storage_content 表）').length).toBeGreaterThan(0);
    expect(screen.getByText(/当前生效来源：application\.yml/)).toBeInTheDocument();
    // 跟随模式不渲染对象存储字段
    expect(screen.queryByText('桶名 bucket')).not.toBeInTheDocument();
  });

  it('切到对象存储后按类型展示字段，保存时提交地址与桶名且不覆写未触碰的凭据', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByText('application.yml 当前配置');
    await pickBackend(user, 'MinIO');

    const endpoint = await screen.findByPlaceholderText('http://127.0.0.1:9000');
    await user.type(endpoint, 'http://minio:9000');
    const bucket = await screen.findByPlaceholderText('nebula-storage');
    await user.clear(bucket);
    await user.type(bucket, 'nebula-files');

    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(1));
    const payload = updateSettings.mock.calls[0][0];
    expect(payload.backendType).toBe('minio');
    expect(payload.endpoint).toBe('http://minio:9000');
    expect(payload.bucket).toBe('nebula-files');
    // 未触碰加密字段：保持原值，既不提交新明文也不提交空串
    expect(payload).not.toHaveProperty('accessKey');
    expect(payload).not.toHaveProperty('secretKey');
  });

  it('切回跟随 application.yml 时只提交类型一项', async () => {
    const user = userEvent.setup();
    renderPanel({
      ...applicationSourceSettings,
      source: 'TENANT',
      tenant: { type: 'minio', endpoint: 'http://minio:9000', bucket: 'nebula-files' },
    });

    await pickBackend(user, '跟随 application.yml（默认）');
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(1));
    const payload = updateSettings.mock.calls[0][0];
    expect(payload.backendType).toBe('application');
    expect(payload).not.toHaveProperty('endpoint');
    expect(payload).not.toHaveProperty('bucket');
  });

  it('没有保存权限时保存按钮禁用并提示只读', async () => {
    clearAuthForTest();
    renderPanel();

    await screen.findByText('application.yml 当前配置');
    const saveButton = screen.getByRole('button', { name: /保\s*存/ });
    expect(saveButton).toBeDisabled();
    expect(within(screen.getByText('上传策略').closest('.ant-card') as HTMLElement)
      .getByText(/只读：缺少保存存储配置的权限/)).toBeInTheDocument();
  });
});
