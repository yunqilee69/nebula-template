import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useLocaleStore } from '@/stores/locale-store';
import type { StorageFileService } from '@/services/storage-files';
import type { StorageUploadTaskService } from '@/services/storage-upload-tasks';
import { appStorageService } from '@/api/storage-service';
import { DEFAULT_UPLOAD_POLICY, useUploadPolicyStore } from '@/stores/upload-policy-store';
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

function createUploadTaskService(overrides: Partial<StorageUploadTaskService> = {}): StorageUploadTaskService {
  return {
    pageUploadTasks: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'task-1',
          bound: false,
          taskMode: 'simple',
          fileName: 'pending-contract.pdf',
          fileExtension: 'pdf',
          fileMimeType: 'application/pdf',
          fileSize: 4096,
          fileHash: 'sha256-task-1',
          chunkCount: 1,
          uploadedChunkCount: 1,
          status: 'COMPLETED',
          uploadUserId: 'user-1',
          lastChunkTime: '2026-11-22 11:00:02',
          createTime: '2026-11-22 11:00:00',
          updateTime: '2026-11-22 11:00:01',
        },
      ],
      total: 1,
    }),
    deleteUploadTask: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function grantDeletePermission() {
  useAuthStore.getState().setUser({
    id: 'user-1',
    name: '管理员',
    username: 'admin',
    roles: ['USER'],
    permissions: ['API:STORAGE_FILE_QUERY:Allow', 'API:STORAGE_FILE_DELETE:Allow'],
  });
}

function grantUploadPermission() {
  useAuthStore.getState().setUser({
    id: 'user-1',
    name: '管理员',
    username: 'admin',
    roles: ['USER'],
    permissions: ['API:STORAGE_UPLOAD:Allow'],
  });
}

function renderPage(service: StorageFileService, uploadTaskService = createUploadTaskService()) {
  render(
    <NebulaProvider>
      <StorageFileManagementPage service={service} uploadTaskService={uploadTaskService} />
    </NebulaProvider>,
  );
  return { service, uploadTaskService };
}

describe('StorageFileManagementPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useAuthStore.getState().clearUser();
    useLocaleStore.getState().setLocale('zh-CN');
    useUploadPolicyStore.setState({ policy: DEFAULT_UPLOAD_POLICY, loaded: false });
  });

  it('lists the tenant files with size and business source', async () => {
    const { service } = renderPage(createService());

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
    const { service } = renderPage(createService());

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
    const { service } = renderPage(createService());

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
    const { service } = renderPage(createService());

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
    const { service } = renderPage(createService());

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

  it('shows temporary-task metadata and applies task filters', async () => {
    const user = userEvent.setup();
    const { uploadTaskService } = renderPage(createService());

    await user.click(await screen.findByRole('tab', { name: /临时上传任务/ }));
    expect(await screen.findByText('pending-contract.pdf')).toBeInTheDocument();
    expect(screen.getByText('4.0 KB')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('task-1')).toBeInTheDocument();
    expect(screen.getByText('sha256-task-1')).toBeInTheDocument();
    expect(screen.getByText('2026-11-22 11:00:02')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /下载/ })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('文件名'), '合同');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => expect(uploadTaskService.pageUploadTasks).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageNum: 1, fileName: '合同' }),
    ));
  });

  it('uploads through the existing policy upload service and refreshes temporary tasks', async () => {
    const user = userEvent.setup();
    useUploadPolicyStore.setState({ policy: DEFAULT_UPLOAD_POLICY, loaded: true });
    const upload = vi.spyOn(appStorageService, 'uploadSimpleFile').mockResolvedValue({
      id: 'task-uploaded',
      taskMode: 'simple',
      fileName: 'new.txt',
      status: 'COMPLETED',
    });
    const { uploadTaskService } = renderPage(createService());
    act(() => grantUploadPermission());

    await user.click(await screen.findByRole('tab', { name: /临时上传任务/ }));
    const uploadButton = await screen.findByRole('button', { name: '上传临时文件' });
    const input = uploadButton.closest('.ant-upload-wrapper')?.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('upload input not found');
    await user.upload(input, new File(['new'], 'new.txt', { type: 'text/plain' }));

    await waitFor(() => expect(upload).toHaveBeenCalledWith(expect.any(File), { onUploadProgress: expect.any(Function) }));
    expect(await screen.findByText('临时文件上传成功')).toBeInTheDocument();
    await waitFor(() => expect(uploadTaskService.pageUploadTasks).toHaveBeenCalledTimes(2));
  });

  it('deletes a temporary task only after permission and confirmation', async () => {
    const user = userEvent.setup();
    const { uploadTaskService } = renderPage(createService());

    await user.click(await screen.findByRole('tab', { name: /临时上传任务/ }));
    await screen.findByText('pending-contract.pdf');
    expect(screen.queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();

    useAuthStore.getState().setUser({
      id: 'user-1',
      name: '管理员',
      username: 'admin',
      roles: ['USER'],
      permissions: ['API:STORAGE_UPLOAD_TASK_DELETE:Allow'],
    });
    const row = screen.getByText('pending-contract.pdf').closest('tr');
    if (!row) throw new Error('row not found');
    await user.click(await within(row).findByRole('button', { name: /删\s*除/ }));
    await user.click(await screen.findByRole('button', { name: /确\s*认/ }));
    expect(screen.getByText(/删除临时上传任务.*临时内容.*不会删除或影响已绑定的正式文件/)).toBeInTheDocument();

    await waitFor(() => expect(uploadTaskService.deleteUploadTask).toHaveBeenCalledWith('task-1'));
    await waitFor(() => expect(uploadTaskService.pageUploadTasks).toHaveBeenCalledTimes(2));
  });
});
