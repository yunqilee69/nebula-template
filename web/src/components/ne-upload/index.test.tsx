import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { request } from '@/request/request';
import { DEFAULT_UPLOAD_POLICY, useUploadPolicyStore } from '@/stores/upload-policy-store';
import { NeImageUpload, NeUpload } from './index';
import type { NeUploadFile } from './types';

vi.mock('@/request/request', () => ({
  request: vi.fn(),
}));

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

function wrapInApp(ui: ReactElement) {
  return <App>{ui}</App>;
}

function renderWithApp(ui: ReactElement) {
  return render(wrapInApp(ui));
}

function mockObjectUrl(objectUrl: string) {
  const createObjectURL = vi.fn(() => objectUrl);
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  return { createObjectURL, revokeObjectURL };
}

function restoreObjectUrl() {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL });
}

function createImage(name: string) {
  return new File(['image-bytes'], name, { type: 'image/png' });
}

function getFileInput() {
  const input = document.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) throw new Error('file input not found');
  return input;
}

describe('NeImageUpload 上传态与交互', () => {
  beforeEach(() => {
    useUploadPolicyStore.setState({ policy: DEFAULT_UPLOAD_POLICY, loaded: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useUploadPolicyStore.setState({ policy: DEFAULT_UPLOAD_POLICY, loaded: false });
    restoreObjectUrl();
  });

  it('图片上传中显示进度条与实时进度', async () => {
    let reportProgress: ((percent: number) => void) | undefined;
    const onChange = vi.fn();
    const uploadRequest = vi.fn().mockImplementation((_file: File, onProgress?: (percent: number) => void) => {
      reportProgress = onProgress;
      return new Promise(() => {});
    });

    renderWithApp(<NeImageUpload uploadRequest={uploadRequest} onChange={onChange} />);

    await userEvent.upload(getFileInput(), createImage('photo.png'));
    await waitFor(() => expect(uploadRequest).toHaveBeenCalledTimes(1));

    act(() => reportProgress?.(42));

    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0][0]).toMatchObject({ status: 'uploading', percent: 42 });
    });
    // 图片列表此前只有缩略图，没有进度；进度条必须真的渲染出来
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('图片上传失败时显示错误文案', async () => {
    const uploadRequest = vi.fn().mockRejectedValue(new Error('网络错误'));

    renderWithApp(<NeImageUpload uploadRequest={uploadRequest} onChange={vi.fn()} />);

    await userEvent.upload(getFileInput(), createImage('broken.png'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('网络错误');
    });
  });

  it('图片上传失败时可从错误态重试并成功', async () => {
    const onChange = vi.fn();
    const uploadRequest = vi
      .fn()
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce({ id: 'task-1', taskMode: 'simple', fileName: 'retry.png', fileMimeType: 'image/png', status: 'COMPLETED' });

    renderWithApp(<NeImageUpload uploadRequest={uploadRequest} onChange={onChange} />);

    await userEvent.upload(getFileInput(), createImage('retry.png'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('网络错误'));

    await userEvent.click(screen.getByRole('button', { name: '重试' }));

    await waitFor(() => expect(uploadRequest).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(onChange.mock.calls.at(-1)?.[0]).toEqual([
        expect.objectContaining({ status: 'done', taskId: 'task-1' }),
      ]);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('有 taskId 无 fileId 的本地未绑定图片可直接预览且不请求后端', async () => {
    const { createObjectURL } = mockObjectUrl('blob:local-preview');
    const originFileObj = createImage('draft.png');

    renderWithApp(
      <NeImageUpload
        value={[{ uid: 'local-1', name: 'draft.png', status: 'done', taskId: 'task-1', originFileObj }]}
      />,
    );

    await waitFor(() => expect(screen.getByAltText('draft.png')).toHaveAttribute('src', 'blob:local-preview'));
    expect(createObjectURL).toHaveBeenCalledWith(originFileObj);
    // 本地预览完全由对象 URL 提供，不能因为缺 URL 就去请求下载地址
    expect(request).not.toHaveBeenCalled();
  });

  it('本地未绑定图片被移除后释放对象 URL', async () => {
    const { revokeObjectURL } = mockObjectUrl('blob:local-preview');
    const onChange = vi.fn();

    const { rerender } = renderWithApp(
      <NeImageUpload
        value={[{ uid: 'local-1', name: 'draft.png', status: 'done', taskId: 'task-1', originFileObj: createImage('draft.png') }]}
        onChange={onChange}
      />,
    );

    await waitFor(() => expect(screen.getByAltText('draft.png')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('删除 draft.png'));

    expect(onChange).toHaveBeenLastCalledWith([]);
    rerender(
      wrapInApp(
        <NeImageUpload
          value={onChange.mock.calls.at(-1)?.[0] as NeUploadFile[]}
          onChange={onChange}
        />,
      ),
    );

    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:local-preview'));
  });

  it('移除未绑定文件只清本地状态，不调用正式文件删除接口', async () => {
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const onChange = vi.fn();

    renderWithApp(
      <NeUpload
        maxCount={3}
        value={[
          { uid: 'local-1', fileId: 'file-1', name: 'bound.txt', status: 'done' },
          { uid: 'local-2', name: 'unbound.txt', status: 'done', taskId: 'task-2' },
        ]}
        deleteFile={deleteFile}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByLabelText('删除 unbound.txt'));

    expect(deleteFile).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ uid: 'local-1' })]);
  });

  it('onRemove 返回的 Promise 拒绝时提示可读错误，而不是静默失败', async () => {
    const onRemove = vi.fn().mockRejectedValue(new Error('移除未生效'));
    const onChange = vi.fn();

    renderWithApp(
      <NeUpload
        maxCount={3}
        value={[{ uid: 'f1', fileId: 'file-1', name: 'a.txt', status: 'done' }]}
        onRemove={onRemove}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByLabelText('删除 a.txt'));

    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('移除未生效')).toBeInTheDocument();
  });

  it('deleteFile 失败时保留文件并提示失败', async () => {
    const deleteFile = vi.fn().mockRejectedValue(new Error('删除失败原因'));
    const onChange = vi.fn();

    renderWithApp(
      <NeUpload
        maxCount={3}
        value={[{ uid: 'f1', fileId: 'file-1', name: 'a.txt', status: 'done' }]}
        deleteFile={deleteFile}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByLabelText('删除 a.txt'));

    expect(await screen.findByText('删除失败原因')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('a.txt')).toBeInTheDocument();
  });

  it('上传按钮的无障碍名称跟随自定义 uploadText', () => {
    renderWithApp(<NeImageUpload uploadText="上传头像" />);

    expect(screen.getByLabelText('上传头像')).toBeInTheDocument();
    expect(screen.queryByLabelText('上传图片')).not.toBeInTheDocument();
  });

  it('未绑定的图片没有可预览来源时渲染占位并带有 role=img', () => {
    renderWithApp(
      <NeImageUpload value={[{ uid: 'local-1', name: 'empty.png', status: 'done', taskId: 'task-1' }]} />,
    );

    const placeholder = screen.getByRole('img', { name: '文件占位: empty.png' });
    expect(placeholder).toBeInTheDocument();
  });
});
