import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { appStorageService } from '@/api/storage-service';
import { request } from '@/request/request';
import { DEFAULT_UPLOAD_POLICY, useUploadPolicyStore } from '@/stores/upload-policy-store';
import type { FrontendUploadConfig } from '@/types/auth';
import { NeImageUpload, NeUpload } from './index';
import type { NeUploadFile } from './types';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

vi.mock('@/api/storage-service', () => ({
  appStorageService: {
    getDownloadLocationsBySource: vi.fn(),
    getDownloadLocation: vi.fn(),
  },
}));

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

/** 组件通过 `App.useApp()` 拿消息实例，测试必须落在 antd App 上下文里。 */
function wrapInApp(ui: ReactElement) {
  return <App>{ui}</App>;
}

function renderWithApp(ui: ReactElement) {
  return render(wrapInApp(ui));
}

/** 上传策略来自 init 缓存，测试里直接落缓存，避免触发补拉。 */
function seedUploadPolicy(overrides: Partial<FrontendUploadConfig> = {}) {
  useUploadPolicyStore.setState({ policy: { ...DEFAULT_UPLOAD_POLICY, ...overrides }, loaded: true });
}

function resetUploadPolicy() {
  useUploadPolicyStore.setState({ policy: DEFAULT_UPLOAD_POLICY, loaded: false });
}

function mockObjectUrl(objectUrl: string) {
  const createObjectURL = vi.fn(() => objectUrl);
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  return { createObjectURL, revokeObjectURL };
}

function createFile(name: string, content = 'hello', type = 'text/plain') {
  return new File([content], name, { type });
}

function getFileInput() {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('file input not found');
  return input;
}

describe('NeUpload', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    resetUploadPolicy();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
  });

  it('uploads a file and emits the normalized task value', async () => {
    const onChange = vi.fn();
    const uploadRequest = vi.fn().mockResolvedValue({
      id: 'task-1',
      taskMode: 'simple',
      fileName: 'a.txt',
      fileExtension: 'txt',
      fileMimeType: 'text/plain',
      fileSize: 5,
      fileHash: 'hash-1',
      status: 'COMPLETED',
    });

    renderWithApp(<NeUpload uploadRequest={uploadRequest} onChange={onChange} />);

    await userEvent.upload(getFileInput(), createFile('a.txt'));

    await waitFor(() => expect(uploadRequest).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ name: 'a.txt', taskId: 'task-1', status: 'done', percent: 100 }),
      ]);
    });
  });

  it('replaces the current file when maxCount is one', async () => {
    const onChange = vi.fn();
    const uploadRequest = vi
      .fn()
      .mockResolvedValueOnce({ id: 'task-1', taskMode: 'simple', fileName: 'a.txt', status: 'COMPLETED' })
      .mockResolvedValueOnce({ id: 'task-2', taskMode: 'simple', fileName: 'b.txt', status: 'COMPLETED' });

    const { rerender } = renderWithApp(<NeUpload uploadRequest={uploadRequest} onChange={onChange} value={[]} maxCount={1} />);

    await userEvent.upload(getFileInput(), createFile('a.txt'));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ taskId: 'task-1' })]));

    const firstValue = onChange.mock.calls.at(-1)?.[0] as NeUploadFile[];
    rerender(wrapInApp(<NeUpload uploadRequest={uploadRequest} onChange={onChange} value={firstValue} maxCount={1} />));

    await userEvent.upload(getFileInput(), createFile('b.txt'));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ name: 'b.txt', taskId: 'task-2' })]));
    expect((onChange.mock.calls.at(-1)?.[0] as NeUploadFile[])).toHaveLength(1);
  });

  it('blocks overflow files when maxCount is reached', async () => {
    const uploadRequest = vi.fn();
    const onLimitExceeded = vi.fn();

    renderWithApp(
      <NeUpload
        maxCount={1}
        value={[{ uid: 'existing', name: 'existing.txt', status: 'done' }]}
        uploadRequest={uploadRequest}
        onLimitExceeded={onLimitExceeded}
      />,
    );

    expect(screen.queryByLabelText('上传附件')).not.toBeInTheDocument();
    expect(uploadRequest).not.toHaveBeenCalled();
  });

  it('preserves all files after multiple concurrent uploads resolve', async () => {
    const onChange = vi.fn();
    let resolveFirst: (value: unknown) => void;
    let resolveSecond: (value: unknown) => void;

    const uploadRequest = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

    renderWithApp(<NeUpload uploadRequest={uploadRequest} onChange={onChange} maxCount={3} />);

    const fileInput = getFileInput();
    await userEvent.upload(fileInput, [createFile('a.txt'), createFile('b.txt')]);

    await waitFor(() => expect(uploadRequest).toHaveBeenCalledTimes(2));

    resolveFirst!({ id: 'task-1', taskMode: 'simple', fileName: 'a.txt', status: 'COMPLETED' });
    resolveSecond!({ id: 'task-2', taskMode: 'simple', fileName: 'b.txt', status: 'COMPLETED' });

    await waitFor(() => {
      const lastCall = onChange.mock.calls.at(-1)?.[0] as NeUploadFile[] | undefined;
      const doneFiles = lastCall?.filter((f) => f.status === 'done') ?? [];
      expect(doneFiles).toHaveLength(2);
    });
  });

  it('calls deleteFile and removes the item on delete', async () => {
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const onChange = vi.fn();

    // 只有已绑定正式文件（有 fileId）的条目才走服务端删除；未绑定任务只清本地状态
    renderWithApp(
      <NeUpload
        maxCount={3}
        value={[
          { uid: 'f1', fileId: 'file-1', name: 'keep.txt', status: 'done' },
          { uid: 'f2', fileId: 'file-2', name: 'remove.txt', status: 'done' },
        ]}
        deleteFile={deleteFile}
        onChange={onChange}
      />,
    );

    const deleteButton = screen.getByLabelText('删除 remove.txt');
    await userEvent.click(deleteButton);

    await waitFor(() => expect(deleteFile).toHaveBeenCalledTimes(1));
    expect(deleteFile).toHaveBeenCalledWith(expect.objectContaining({ uid: 'f2', name: 'remove.txt' }));
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ uid: 'f1', name: 'keep.txt' })]);
  });

  it('renders upload error message with role=alert', async () => {
    const onChange = vi.fn();
    const uploadRequest = vi.fn().mockRejectedValue(new Error('网络错误'));

    renderWithApp(<NeUpload uploadRequest={uploadRequest} onChange={onChange} />);

    await userEvent.upload(getFileInput(), createFile('bad.txt'));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('网络错误');
    });
  });

  it('disables delete button and skips deleteFile/onChange when disabled', async () => {
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const onChange = vi.fn();

    renderWithApp(
      <NeUpload
        disabled
        maxCount={3}
        value={[{ uid: 'f1', name: 'locked.txt', status: 'done' }]}
        deleteFile={deleteFile}
        onChange={onChange}
      />,
    );

    const deleteButton = screen.getByLabelText('删除 locked.txt');
    expect(deleteButton).toBeDisabled();
    await userEvent.click(deleteButton);
    expect(deleteFile).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onLimitExceeded once per batch when multiple files overflow', async () => {
    const onLimitExceeded = vi.fn();
    const uploadRequest = vi.fn().mockResolvedValue({ id: 't-1', taskMode: 'simple', fileName: 'a.txt', status: 'COMPLETED' });

    renderWithApp(
      <NeUpload
        maxCount={2}
        uploadRequest={uploadRequest}
        onLimitExceeded={onLimitExceeded}
      />,
    );

    await userEvent.upload(getFileInput(), [createFile('a.txt'), createFile('b.txt'), createFile('c.txt'), createFile('d.txt')]);

    await waitFor(() => expect(uploadRequest).toHaveBeenCalledTimes(2));
    expect(onLimitExceeded).toHaveBeenCalledTimes(1);
    expect(onLimitExceeded).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(File), expect.any(File)]),
      2,
    );
  });

  it('renders 未配置上传方法 error with role=alert when uploadRequest is missing', async () => {
    renderWithApp(<NeUpload />);

    await userEvent.upload(getFileInput(), createFile('nope.txt'));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('未配置上传方法');
    });
  });

  it('loads files from download-location by source without sourceType when sourceType is empty', async () => {
    vi.mocked(appStorageService.getDownloadLocationsBySource).mockResolvedValue([
      { fileId: 'file-1', fileName: 'one.pdf', fileMimeType: 'application/pdf', fileSize: 10, mode: 'PROXY', url: '/api/storage/download?fileId=file-1' },
      { fileId: 'file-2', fileName: 'two.pdf', fileMimeType: 'application/pdf', fileSize: 20, mode: 'PROXY', url: '/api/storage/download?fileId=file-2' },
    ]);
    const onChange = vi.fn();

    renderWithApp(
      <NeUpload sourceEntity="contract" sourceId="c-1" sourceType="" maxCount={1} onChange={onChange} />,
    );

    await waitFor(() => {
      expect(appStorageService.getDownloadLocationsBySource).toHaveBeenCalledWith({
        sourceEntity: 'contract',
        sourceId: 'c-1',
      });
    });
    // maxCount 截断：服务端按 create_time DESC 返回，首条即最新
    await waitFor(() => expect(screen.getByText('one.pdf')).toBeInTheDocument());
    expect(screen.queryByText('two.pdf')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ fileId: 'file-1', name: 'one.pdf' })]);
  });

  it('loads files by a specific sourceType when provided', async () => {
    vi.mocked(appStorageService.getDownloadLocationsBySource).mockResolvedValue([
      { fileId: 'file-1', fileName: 'main.pdf', mode: 'PROXY', url: '/api/storage/download?fileId=file-1' },
    ]);

    renderWithApp(<NeUpload sourceEntity="contract" sourceId="c-1" sourceType="main" />);

    await waitFor(() => {
      expect(appStorageService.getDownloadLocationsBySource).toHaveBeenCalledWith({
        sourceEntity: 'contract',
        sourceId: 'c-1',
        sourceType: 'main',
      });
    });
  });

  it('reports a successful load with the merged file list', async () => {
    vi.mocked(appStorageService.getDownloadLocationsBySource).mockResolvedValue([
      { fileId: 'file-1', fileName: 'one.pdf', mode: 'PROXY', url: '/api/storage/download?fileId=file-1' },
    ]);
    const onBackfillComplete = vi.fn();

    renderWithApp(
      <NeUpload sourceEntity="contract" sourceId="c-1" onBackfillComplete={onBackfillComplete} />,
    );

    await waitFor(() => {
      expect(onBackfillComplete).toHaveBeenCalledWith(
        [expect.objectContaining({ fileId: 'file-1', name: 'one.pdf' })],
        true,
      );
    });
  });

  it('reports a failed load and keeps the current files', async () => {
    vi.mocked(appStorageService.getDownloadLocationsBySource).mockRejectedValue(new Error('网络错误'));
    const onBackfillComplete = vi.fn();

    renderWithApp(
      <NeUpload
        value={[{ uid: 'local', name: 'local.txt', status: 'done', taskId: 'task-1' }]}
        sourceEntity="contract"
        sourceId="c-1"
        onBackfillComplete={onBackfillComplete}
      />,
    );

    await waitFor(() => {
      expect(onBackfillComplete).toHaveBeenCalledWith([expect.objectContaining({ uid: 'local' })], false);
    });
  });

  it('keeps an upload that finishes while the load request is still in flight', async () => {
    let resolveLocations: ((items: unknown[]) => void) | undefined;
    vi.mocked(appStorageService.getDownloadLocationsBySource).mockImplementation(
      () => new Promise((resolve) => { resolveLocations = resolve; }) as never,
    );
    const uploadRequest = vi.fn().mockResolvedValue({
      id: 'task-local',
      taskMode: 'simple',
      fileName: 'local.txt',
      status: 'COMPLETED',
    });
    const onChange = vi.fn();

    renderWithApp(
      <NeUpload
        maxCount={3}
        sourceEntity="contract"
        sourceId="c-1"
        uploadRequest={uploadRequest}
        onChange={onChange}
      />,
    );

    await userEvent.upload(getFileInput(), createFile('local.txt'));
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ taskId: 'task-local', status: 'done' })]);
    });

    act(() => resolveLocations?.([{ fileId: 'file-1', fileName: 'server.txt', mode: 'PROXY', url: '/api/storage/download?fileId=file-1' }]));

    // 有 taskId、无 fileId 表示上传完成但还没 bind，装载结果不能把它当成旧数据丢掉
    await waitFor(() => {
      const merged = onChange.mock.calls.at(-1)?.[0] as NeUploadFile[];
      expect(merged.map((file) => file.fileId ?? file.taskId)).toEqual(
        expect.arrayContaining(['file-1', 'task-local']),
      );
    });
  });

  it('uses the supplied download locations without querying the server', async () => {
    const onChange = vi.fn();

    renderWithApp(
      <NeUpload
        sourceEntity="contract"
        sourceId="c-1"
        downloadLocations={[
          { fileId: 'file-9', fileName: 'given.pdf', mode: 'DIRECT', url: 'https://oss.example.com/a.pdf?sig=1' },
        ]}
        onChange={onChange}
      />,
    );

    await act(async () => {});
    // 业务直传优先：即使给了业务归属也不发请求
    expect(appStorageService.getDownloadLocationsBySource).not.toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ fileId: 'file-9' })]));
  });

  it('reports nothing when neither download locations nor a source are configured', async () => {
    const onBackfillComplete = vi.fn();

    renderWithApp(<NeUpload onBackfillComplete={onBackfillComplete} />);

    await act(async () => {});
    expect(appStorageService.getDownloadLocationsBySource).not.toHaveBeenCalled();
    expect(onBackfillComplete).not.toHaveBeenCalled();
  });

  it('defers removal: reports the fileId without calling the delete API', async () => {
    const deleteFile = vi.fn();
    const onRemovalChange = vi.fn();
    const onChange = vi.fn();

    renderWithApp(
      <NeUpload
        removalMode="deferred"
        deleteFile={deleteFile}
        onRemovalChange={onRemovalChange}
        onChange={onChange}
        value={[
          { uid: 'file-1', name: 'saved.pdf', status: 'done', fileId: 'file-1', url: '/api/storage/download?fileId=file-1' },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '删除 saved.pdf' }));

    await waitFor(() => expect(onRemovalChange).toHaveBeenLastCalledWith(['file-1']));
    // 延迟删除：不调接口，由业务保存时统一释放
    expect(deleteFile).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(await screen.findByText(/已标记删除 1 个文件/)).toBeInTheDocument();
  });

  it('restores deferred removals when the user undoes', async () => {
    const onRemovalChange = vi.fn();
    const onChange = vi.fn();

    renderWithApp(
      <NeUpload
        removalMode="deferred"
        onRemovalChange={onRemovalChange}
        onChange={onChange}
        value={[
          { uid: 'file-1', name: 'saved.pdf', status: 'done', fileId: 'file-1', url: '/api/storage/download?fileId=file-1' },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '删除 saved.pdf' }));
    await waitFor(() => expect(screen.getByText(/已标记删除/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: '撤销' }));

    await waitFor(() => expect(onRemovalChange).toHaveBeenLastCalledWith([]));
    expect(screen.getByText('saved.pdf')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ fileId: 'file-1' })]);
  });

  it('records the displaced saved file when a single-value slot is replaced', async () => {
    const uploadRequest = vi.fn().mockResolvedValue({
      id: 'task-new', taskMode: 'simple', fileName: 'new.png', status: 'COMPLETED',
    });
    const onRemovalChange = vi.fn();
    // 已保存图片的预览走位置决议（直连时直接用裸 URL）
    vi.mocked(request).mockResolvedValue([
      { mode: 'DIRECT', url: 'https://oss.example.com/old.png?sig=1' },
    ]);

    renderWithApp(
      <NeImageUpload
        removalMode="deferred"
        maxCount={1}
        replaceable
        uploadRequest={uploadRequest}
        onRemovalChange={onRemovalChange}
        downloadLocations={[
          { fileId: 'file-old', fileName: 'old.png', mode: 'PROXY', url: '/api/storage/download?fileId=file-old' },
        ]}
      />,
    );

    await waitFor(() => expect(screen.getByRole('img', { name: 'old.png' })).toBeInTheDocument());

    await userEvent.upload(getFileInput(), createFile('new.png', 'data', 'image/png'));

    // 换图 = 删旧 + 加新：旧文件必须进待删除列表，否则旧记录永久残留
    await waitFor(() => expect(onRemovalChange).toHaveBeenLastCalledWith(['file-old']));
  });

  it('clears deferred removals once the source is reloaded', async () => {
    const onRemovalChange = vi.fn();
    const { rerender } = renderWithApp(
      <NeUpload
        removalMode="deferred"
        onRemovalChange={onRemovalChange}
        value={[
          { uid: 'file-1', name: 'saved.pdf', status: 'done', fileId: 'file-1', url: '/api/storage/download?fileId=file-1' },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '删除 saved.pdf' }));
    await waitFor(() => expect(onRemovalChange).toHaveBeenLastCalledWith(['file-1']));

    rerender(
      wrapInApp(
        <NeUpload
          removalMode="deferred"
          onRemovalChange={onRemovalChange}
          value={[]}
          downloadLocations={[
            { fileId: 'file-9', fileName: 'fresh.pdf', mode: 'PROXY', url: '/api/storage/download?fileId=file-9' },
          ]}
        />,
      ),
    );

    // 重新装载说明服务端已刷新（通常是保存成功）：待删除列表必须清空，防止重复提交
    await waitFor(() => expect(onRemovalChange).toHaveBeenLastCalledWith([]));
  });

  it('renders the real progress reported by the upload implementation', async () => {
    let reportProgress: ((percent: number) => void) | undefined;
    let finishUpload: ((task: unknown) => void) | undefined;
    const onChange = vi.fn();
    const uploadRequest = vi.fn().mockImplementation((_file: File, onProgress?: (percent: number) => void) => {
      reportProgress = onProgress;
      return new Promise((resolve) => {
        finishUpload = resolve;
      });
    });

    renderWithApp(<NeUpload uploadRequest={uploadRequest} onChange={onChange} />);

    await userEvent.upload(getFileInput(), createFile('a.txt'));
    await waitFor(() => expect(uploadRequest).toHaveBeenCalledTimes(1));

    act(() => reportProgress?.(42));

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0][0]).toMatchObject({ status: 'uploading', percent: 42 });
    });

    act(() => finishUpload?.({ id: 'task-1', taskMode: 'simple', fileName: 'a.txt', status: 'COMPLETED' }));

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0][0]).toMatchObject({ status: 'done', percent: 100 });
    });
  });

  it('derives the accept attribute from the cached storage.upload whitelist', () => {
    seedUploadPolicy({ allowedExtensions: 'jpg,.PNG' });

    renderWithApp(<NeUpload />);

    expect(getFileInput()).toHaveAttribute('accept', '.jpg,.png');
  });

  it('prefers an explicit accept prop over the cached whitelist', () => {
    seedUploadPolicy({ allowedExtensions: 'jpg,png' });

    renderWithApp(<NeUpload accept=".pdf" />);

    expect(getFileInput()).toHaveAttribute('accept', '.pdf');
  });

  it('rejects files outside the cached whitelist even when the picker hints are bypassed', async () => {
    seedUploadPolicy({ allowedExtensions: 'jpg,png' });
    const uploadRequest = vi.fn();
    const onChange = vi.fn();

    renderWithApp(<NeUpload uploadRequest={uploadRequest} onChange={onChange} />);

    // applyAccept: false 模拟拖拽/改后缀绕过 accept 提示的场景，此时只能靠组件内校验兜住
    await userEvent.setup({ applyAccept: false }).upload(getFileInput(), createFile('a.gif', 'x', 'image/gif'));

    await waitFor(() => expect(screen.getByText('该文件类型不允许上传（允许：jpg、png）')).toBeInTheDocument());
    expect(uploadRequest).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses a DIRECT download location as-is instead of re-resolving it', async () => {
    const onChange = vi.fn();

    renderWithApp(
      <NeImageUpload
        downloadLocations={[
          { fileId: 'file-img', fileName: 'avatar.png', fileMimeType: 'image/png', mode: 'DIRECT', url: 'https://oss.example.com/a.png?sig=1' },
        ]}
        onChange={onChange}
      />,
    );

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    // 直链即凭据：客户端原样使用，不再走一次位置决议
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ fileId: 'file-img', url: 'https://oss.example.com/a.png?sig=1' }),
    ]);
  });
});

describe('NeImageUpload', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    resetUploadPolicy();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
  });

  it('renders a single image upload control by default', () => {
    renderWithApp(<NeImageUpload />);

    expect(screen.getByLabelText('上传图片')).toBeInTheDocument();
  });

  it('falls back to image/* when no extension whitelist is configured', () => {
    renderWithApp(<NeImageUpload />);

    expect(getFileInput()).toHaveAttribute('accept', 'image/*');
  });

  it('renders a thumbnail and hides add control at the max count', () => {
    renderWithApp(
      <NeImageUpload
        maxCount={1}
        value={[{ uid: 'img-1', name: 'avatar.png', status: 'done', thumbUrl: '/avatar.png' }]}
      />,
    );

    expect(screen.getByAltText('avatar.png')).toBeInTheDocument();
    expect(screen.queryByLabelText('上传图片')).not.toBeInTheDocument();
  });

  it('loads protected storage thumbnails through the authenticated request client', async () => {
    const storageUrl = '/api/storage/download?fileId=avatar-file&filename=avatar.png';
    const avatarBlob = new Blob(['avatar'], { type: 'image/png' });
    vi.mocked(request).mockResolvedValue(avatarBlob);
    const { createObjectURL } = mockObjectUrl('blob:storage-avatar');

    renderWithApp(
      <NeImageUpload
        maxCount={1}
        value={[{ uid: 'img-1', name: 'avatar.png', status: 'done', thumbUrl: storageUrl }]}
      />,
    );

    expect(document.querySelector('img[src*="/api/storage/download"]')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByAltText('avatar.png')).toHaveAttribute('src', 'blob:storage-avatar'));
    expect(createObjectURL).toHaveBeenCalledWith(avatarBlob);
    expect(request).toHaveBeenCalledWith({
      url: storageUrl,
      method: 'GET',
      responseType: 'blob',
    });
  });

  it('removes the latest controlled image value after parent rerender', async () => {
    const onChange = vi.fn();
    const { rerender } = renderWithApp(
      <NeImageUpload
        value={[{ uid: 'local-upload', name: 'local-avatar.png', status: 'done' }]}
        onChange={onChange}
      />,
    );

    rerender(wrapInApp(
      <NeImageUpload
        value={[{ uid: 'server-avatar', name: 'server-avatar.png', status: 'done', thumbUrl: '/server-avatar.png' }]}
        onChange={onChange}
      />,
    ));

    await userEvent.click(screen.getByLabelText('删除 server-avatar.png'));

    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
