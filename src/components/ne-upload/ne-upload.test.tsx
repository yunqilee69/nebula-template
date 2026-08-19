import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { request } from '@/request/request';
import { NeImageUpload, NeUpload } from './index';
import type { NeUploadFile } from './types';

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

    render(<NeUpload uploadRequest={uploadRequest} onChange={onChange} />);

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

    const { rerender } = render(<NeUpload uploadRequest={uploadRequest} onChange={onChange} value={[]} maxCount={1} />);

    await userEvent.upload(getFileInput(), createFile('a.txt'));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ taskId: 'task-1' })]));

    const firstValue = onChange.mock.calls.at(-1)?.[0] as NeUploadFile[];
    rerender(<NeUpload uploadRequest={uploadRequest} onChange={onChange} value={firstValue} maxCount={1} />);

    await userEvent.upload(getFileInput(), createFile('b.txt'));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ name: 'b.txt', taskId: 'task-2' })]));
    expect((onChange.mock.calls.at(-1)?.[0] as NeUploadFile[])).toHaveLength(1);
  });

  it('blocks overflow files when maxCount is reached', async () => {
    const uploadRequest = vi.fn();
    const onLimitExceeded = vi.fn();

    render(
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

    render(<NeUpload uploadRequest={uploadRequest} onChange={onChange} maxCount={3} />);

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

    render(
      <NeUpload
        maxCount={3}
        value={[{ uid: 'f1', name: 'keep.txt', status: 'done' }, { uid: 'f2', name: 'remove.txt', status: 'done' }]}
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

    render(<NeUpload uploadRequest={uploadRequest} onChange={onChange} />);

    await userEvent.upload(getFileInput(), createFile('bad.txt'));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('网络错误');
    });
  });

  it('disables delete button and skips deleteFile/onChange when disabled', async () => {
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const onChange = vi.fn();

    render(
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

    render(
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
    render(<NeUpload />);

    await userEvent.upload(getFileInput(), createFile('nope.txt'));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('未配置上传方法');
    });
  });

  it('backfills files by source without sourceType when sourceType is empty', async () => {
    const listBySource = vi.fn().mockResolvedValue([
      { id: 'file-1', fileName: 'one.pdf', fileMimeType: 'application/pdf', fileSize: 10 },
      { id: 'file-2', fileName: 'two.pdf', fileMimeType: 'application/pdf', fileSize: 20 },
    ]);
    const onChange = vi.fn();

    render(
      <NeUpload
        sourceEntity="contract"
        sourceId="c-1"
        sourceType=""
        maxCount={1}
        listBySource={listBySource}
        onChange={onChange}
      />,
    );

    await waitFor(() => expect(listBySource).toHaveBeenCalledWith({ sourceEntity: 'contract', sourceId: 'c-1' }));
    await waitFor(() => expect(screen.getByText('one.pdf')).toBeInTheDocument());
    expect(screen.queryByText('two.pdf')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ fileId: 'file-1', name: 'one.pdf' })]);
  });

  it('backfills files by a specific sourceType when provided', async () => {
    const listBySource = vi.fn().mockResolvedValue([{ id: 'file-1', fileName: 'main.pdf' }]);

    render(<NeUpload sourceEntity="contract" sourceId="c-1" sourceType="main" listBySource={listBySource} />);

    await waitFor(() => expect(listBySource).toHaveBeenCalledWith({ sourceEntity: 'contract', sourceId: 'c-1', sourceType: 'main' }));
  });
});

describe('NeImageUpload', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
  });

  it('renders a single image upload control by default', () => {
    render(<NeImageUpload />);

    expect(screen.getByLabelText('上传图片')).toBeInTheDocument();
  });

  it('renders a thumbnail and hides add control at the max count', () => {
    render(
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

    render(
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
    const { rerender } = render(
      <NeImageUpload
        value={[{ uid: 'local-upload', name: 'local-avatar.png', status: 'done' }]}
        onChange={onChange}
      />,
    );

    rerender(
      <NeImageUpload
        value={[{ uid: 'server-avatar', name: 'server-avatar.png', status: 'done', thumbUrl: '/server-avatar.png' }]}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByLabelText('删除 server-avatar.png'));

    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
