import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_UPLOAD_POLICY, useUploadPolicyStore } from '@/stores/upload-policy-store';
import type { FrontendUploadConfig } from '@/types/auth';
import { createAvatarUploadAdapter } from './avatar-upload';

const uploadTask = {
  id: 'task-1',
  taskMode: 'simple',
  fileName: 'avatar.png',
  fileMimeType: 'image/png',
  status: 'COMPLETED' as const,
};

const originalCreateObjectURL = URL.createObjectURL;

/** 直接落缓存，避免适配器在测试里真的去补拉 /api/frontend/init。 */
function seedUploadPolicy(overrides: Partial<FrontendUploadConfig> = {}) {
  useUploadPolicyStore.setState({ policy: { ...DEFAULT_UPLOAD_POLICY, ...overrides }, loaded: true });
}

function mockObjectUrl(objectUrl: string) {
  const createObjectURL = vi.fn(() => objectUrl);
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  return createObjectURL;
}

// 不标注 AvatarStorageService 返回类型：需要保留每个方法的 Mock 类型以便断言调用
function createStorageServiceStub() {
  return {
    uploadSimpleFile: vi.fn().mockResolvedValue(uploadTask),
    createUploadTask: vi.fn().mockResolvedValue('task-1'),
    uploadTaskPart: vi.fn().mockResolvedValue(uploadTask),
    completeUploadTask: vi.fn().mockResolvedValue(uploadTask),
  };
}

beforeEach(() => {
  seedUploadPolicy();
});

afterEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL });
});

describe('avatar upload helpers', () => {
  it('uploads the avatar and only returns the temporary task id with a local preview', async () => {
    mockObjectUrl('blob:selected-avatar');
    const storageService = createStorageServiceStub();
    const adapter = createAvatarUploadAdapter(storageService);
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    // 不产生 fileId 或下载地址：绑定由后端资料保存接口按 taskId 完成
    await expect(adapter.uploadAvatar(file)).resolves.toEqual({
      task: uploadTask,
      taskId: 'task-1',
      previewUrl: 'blob:selected-avatar',
    });
    expect(storageService.uploadSimpleFile).toHaveBeenCalledWith(file, { onUploadProgress: expect.any(Function) });
    expect(storageService.createUploadTask).not.toHaveBeenCalled();
  });

  it('forwards the real upload progress to the caller', async () => {
    mockObjectUrl('blob:selected-avatar');
    const storageService = createStorageServiceStub();
    vi.mocked(storageService.uploadSimpleFile).mockImplementation(async (_file, options) => {
      options?.onUploadProgress?.({ loaded: 50, total: 100 });
      return uploadTask;
    });
    const adapter = createAvatarUploadAdapter(storageService);
    const onProgress = vi.fn();

    await adapter.uploadAvatar(new File(['avatar'], 'avatar.png', { type: 'image/png' }), onProgress);

    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it('switches to the chunk path when the avatar exceeds the configured threshold', async () => {
    seedUploadPolicy({ chunkThreshold: 1, chunkSize: 1 });
    mockObjectUrl('blob:selected-avatar');
    const storageService = createStorageServiceStub();
    const adapter = createAvatarUploadAdapter(storageService);
    const file = new File([new Uint8Array(2.5 * 1024 * 1024)], 'avatar.png', { type: 'image/png' });

    await expect(adapter.uploadAvatar(file)).resolves.toEqual({
      task: uploadTask,
      taskId: 'task-1',
      previewUrl: 'blob:selected-avatar',
    });
    expect(storageService.uploadSimpleFile).not.toHaveBeenCalled();
    expect(storageService.createUploadTask).toHaveBeenCalledWith({
      fileName: 'avatar.png',
      fileSize: file.size,
      chunkSize: 1024 * 1024,
      chunkCount: 3,
    });
    expect(storageService.uploadTaskPart.mock.calls.map((call) => call[1])).toEqual([1, 2, 3]);
    expect(storageService.completeUploadTask).toHaveBeenCalledWith('task-1');
  });

  it('rejects an avatar whose extension is outside the configured whitelist', async () => {
    seedUploadPolicy({ allowedExtensions: 'jpg,png' });
    const storageService = createStorageServiceStub();
    const adapter = createAvatarUploadAdapter(storageService);

    await expect(adapter.uploadAvatar(new File(['avatar'], 'avatar.gif', { type: 'image/gif' })))
      .rejects.toThrow('该文件类型不允许上传（允许：jpg、png）');
    expect(storageService.uploadSimpleFile).not.toHaveBeenCalled();
  });
});
