import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useLocaleStore } from '@/stores/locale-store';
import type { StorageFileService } from '@/services/storage-files';
import { StorageFileManagementPage } from './index';

function createService(overrides: Partial<StorageFileService> = {}): StorageFileService {
  return {
    pageFiles: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'file-1',
          fileName: '合同A.pdf',
          fileExtension: 'pdf',
          fileMimeType: 'application/pdf',
          fileSize: 2048,
          sourceEntity: 'contract',
          sourceId: 'c-1',
          sourceType: 'attachment',
          createTime: '2026-11-22 10:00:00',
        },
        {
          id: 'file-2',
          fileName: 'avatar.png',
          fileExtension: 'png',
          fileMimeType: 'image/png',
          fileSize: 1024,
          sourceEntity: 'user-profile',
          sourceId: 'u-1',
          sourceType: 'avatar',
          createTime: '2026-11-21 09:00:00',
        },
      ],
      total: 2,
    }),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    createSignedDownload: vi.fn().mockResolvedValue({
      fileId: 'file-1',
      fileName: '合同A.pdf',
      expireAtEpochSecond: 1_760_000_000,
      signature: 'sig-1',
      url: 'http://localhost/api/storage/download-signed?fileId=file-1&signature=sig-1',
    }),
    downloadFile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function grantDeletePermission() {
  useAuthStore.getState().setUser({
    id: 'user-1',
    name: '管理员',
    username: 'admin',
    roles: ['ADMIN'],
    permissions: ['API:STORAGE_FILE_QUERY:Allow', 'API:STORAGE_FILE_DELETE:Allow'],
  });
}

function renderPage(service: StorageFileService) {
  render(
    <NebulaProvider>
      <StorageFileManagementPage service={service} />
    </NebulaProvider>,
  );
  return service;
}

describe('StorageFileManagementPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useAuthStore.getState().clearUser();
    useLocaleStore.getState().setLocale('zh-CN');
  });

  it('lists the tenant files with size and business source', async () => {
    const service = renderPage(createService());

    expect(await screen.findByText('合同A.pdf')).toBeInTheDocument();
    expect(screen.getByText('avatar.png')).toBeInTheDocument();
    // 大小做人类可读换算，归属三元组拼成一列便于排查
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    expect(screen.getByText('contract / c-1 / attachment')).toBeInTheDocument();
    expect(service.pageFiles).toHaveBeenCalledWith(expect.objectContaining({ pageNum: 1, pageSize: 10 }));
  });

  it('renders labels from the active English locale', async () => {
    useLocaleStore.getState().setLocale('en-US');
    // 中文文案已全部走 i18n 资源：切到英文后标题、列头、操作都应是英文
    renderPage(createService());

    expect(await screen.findByText('Storage')).toBeInTheDocument();
    expect(screen.getAllByText('Business source').length).toBeGreaterThan(0);
    // 两行文件各有一个下载/分享入口；表格数据是异步请求回来的，等它渲染完
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Download/ })).toHaveLength(2));
    expect(screen.getAllByRole('button', { name: /Share/ })).toHaveLength(2);
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
  });

  it('searches by filename and business source', async () => {
    const user = userEvent.setup();
    const service = renderPage(createService());

    await screen.findByText('合同A.pdf');
    await user.type(screen.getByLabelText('文件名'), '合同');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageFiles).toHaveBeenLastCalledWith(
        expect.objectContaining({ pageNum: 1, fileName: '合同' }),
      );
    });
  });

  it('downloads a file through the authenticated client', async () => {
    const user = userEvent.setup();
    const service = renderPage(createService());

    const row = (await screen.findByText('合同A.pdf')).closest('tr');
    if (!row) throw new Error('row not found');
    await user.click(within(row).getByRole('button', { name: /下\s*载/ }));

    // 下载交给注入的服务实现（内部复用存储 API 封装：解析下载位置后落盘）
    await waitFor(() => expect(service.downloadFile).toHaveBeenCalledWith(expect.objectContaining({ id: 'file-1' })));
  });

  it('creates a signed share link and copies it', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const service = renderPage(createService());

    const row = (await screen.findByText('合同A.pdf')).closest('tr');
    if (!row) throw new Error('row not found');
    await user.click(within(row).getByRole('button', { name: /分\s*享/ }));

    await waitFor(() => expect(service.createSignedDownload).toHaveBeenCalledWith({
      fileId: 'file-1',
      filename: '合同A.pdf',
    }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('signature=sig-1')));
  });

  it('deletes a file after confirmation and hides the action without permission', async () => {
    const user = userEvent.setup();
    const service = renderPage(createService());

    await screen.findByText('合同A.pdf');
    // 没有删除权限时不渲染删除入口，避免用户点了必然失败
    expect(screen.queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();

    grantDeletePermission();
    const row = (await screen.findByText('合同A.pdf')).closest('tr');
    if (!row) throw new Error('row not found');
    await user.click(within(row).getByRole('button', { name: /删\s*除/ }));

    // Popconfirm 的确认按钮文案取 common.actions.confirm（'确认'）
    await user.click(await screen.findByRole('button', { name: /确\s*认/ }));

    await waitFor(() => expect(service.deleteFile).toHaveBeenCalledWith('file-1'));
    // 删除后重新拉列表，避免界面停留在已被删掉的行上
    await waitFor(() => expect(service.pageFiles).toHaveBeenCalledTimes(2));
  });
});
