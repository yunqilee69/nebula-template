import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NeUploadFile } from '@/components/ne-upload';
import { DEFAULT_UPLOAD_POLICY, useUploadPolicyStore } from '@/stores/upload-policy-store';
import type { FrontendUploadConfig } from '@/types/auth';
import { createAvatarUploadAdapter, avatarUrlToFiles, filesToAvatarUrl } from './avatar-upload';

const uploadTask = {
  id: 'task-1',
  taskMode: 'simple',
  fileName: 'avatar.png',
  fileMimeType: 'image/png',
  status: 'COMPLETED' as const,
};

/** 直接落缓存，避免适配器在测试里真的去补拉 /api/frontend/init。 */
function seedUploadPolicy(overrides: Partial<FrontendUploadConfig> = {}) {
  useUploadPolicyStore.setState({ policy: { ...DEFAULT_UPLOAD_POLICY, ...overrides }, loaded: true });
}

// 不标注 AvatarStorageService 返回类型：需要保留每个方法的 Mock 类型以便断言调用
function createStorageServiceStub() {
  return {
    uploadSimpleFile: vi.fn().mockResolvedValue(uploadTask),
    createUploadTask: vi.fn().mockResolvedValue('task-1'),
    uploadTaskPart: vi.fn().mockResolvedValue(uploadTask),
    completeUploadTask: vi.fn().mockResolvedValue(uploadTask),
    bindUploadTask: vi.fn().mockResolvedValue('file-1'),
    getDownloadUrl: vi.fn((fileId: string, filename?: string) => `/api/storage/download?fileId=${fileId}&filename=${filename ?? ''}`),
  };
}

beforeEach(() => {
  seedUploadPolicy();
});

describe('avatar upload helpers', () => {
  it('maps a stored avatar URL to a single image upload file', () => {
    expect(avatarUrlToFiles('  https://example.com/avatar.png  ')).toEqual([
      {
        uid: 'profile-avatar',
        name: 'avatar.png',
        status: 'done',
        url: 'https://example.com/avatar.png',
        thumbUrl: 'https://example.com/avatar.png',
      },
    ]);
  });

  it('keeps protected storage avatar URLs out of image thumbnail src values until a preview is available', () => {
    const files = avatarUrlToFiles('/api/storage/download?fileId=file-avatar&filename=avatar.png');

    expect(files).toEqual([
      {
        uid: 'profile-avatar',
        name: 'avatar.png',
        status: 'done',
        url: '/api/storage/download?fileId=file-avatar&filename=avatar.png',
        thumbUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      },
    ]);
  });

  it('uses the authenticated blob preview as the protected storage avatar thumbnail when available', () => {
    const files = avatarUrlToFiles('/api/storage/download?fileId=file-avatar&filename=avatar.png', 'blob:avatar-preview');

    expect(files[0]?.url).toBe('/api/storage/download?fileId=file-avatar&filename=avatar.png');
    expect(files[0]?.thumbUrl).toBe('blob:avatar-preview');
  });

  it('returns the first image URL and clears it when no image remains', () => {
    const files: NeUploadFile[] = [
      {
        uid: 'profile-avatar',
        name: 'avatar.png',
        status: 'done',
        url: 'https://example.com/avatar.png',
      },
    ];

    expect(filesToAvatarUrl(files)).toBe('https://example.com/avatar.png');
    expect(filesToAvatarUrl([])).toBeUndefined();
  });

  it('uploads and binds an avatar before returning its download URL', async () => {
    const storageService = createStorageServiceStub();
    const adapter = createAvatarUploadAdapter(storageService, 'user-1');
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await expect(adapter.uploadAvatar(file)).resolves.toEqual({
      task: uploadTask,
      avatarUrl: '/api/storage/download?fileId=file-1&filename=avatar.png',
    });
    expect(storageService.uploadSimpleFile).toHaveBeenCalledWith(file, { onUploadProgress: expect.any(Function) });
    expect(storageService.bindUploadTask).toHaveBeenCalledWith('task-1', { sourceEntity: 'user-profile', sourceId: 'user-1', sourceType: 'avatar' });
    expect(storageService.getDownloadUrl).toHaveBeenCalledWith('file-1', 'avatar.png');
  });

  it('forwards the real upload progress to the caller', async () => {
    const storageService = createStorageServiceStub();
    vi.mocked(storageService.uploadSimpleFile).mockImplementation(async (_file, options) => {
      options?.onUploadProgress?.({ loaded: 50, total: 100 });
      return uploadTask;
    });
    const adapter = createAvatarUploadAdapter(storageService, 'user-1');
    const onProgress = vi.fn();

    await adapter.uploadAvatar(new File(['avatar'], 'avatar.png', { type: 'image/png' }), onProgress);

    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it('switches to the chunk path when the avatar exceeds the configured threshold', async () => {
    seedUploadPolicy({ chunkThreshold: 1, chunkSize: 1 });
    const storageService = createStorageServiceStub();
    const adapter = createAvatarUploadAdapter(storageService, 'user-1');
    const file = new File([new Uint8Array(2.5 * 1024 * 1024)], 'avatar.png', { type: 'image/png' });

    await adapter.uploadAvatar(file);

    expect(storageService.uploadSimpleFile).not.toHaveBeenCalled();
    expect(storageService.createUploadTask).toHaveBeenCalledWith({
      fileName: 'avatar.png',
      fileSize: file.size,
      chunkSize: 1024 * 1024,
      chunkCount: 3,
    });
    expect(storageService.uploadTaskPart.mock.calls.map((call) => call[1])).toEqual([1, 2, 3]);
    expect(storageService.completeUploadTask).toHaveBeenCalledWith('task-1');
    expect(storageService.bindUploadTask).toHaveBeenCalledWith('task-1', { sourceEntity: 'user-profile', sourceId: 'user-1', sourceType: 'avatar' });
  });

  it('rejects an avatar whose extension is outside the configured whitelist', async () => {
    seedUploadPolicy({ allowedExtensions: 'jpg,png' });
    const storageService = createStorageServiceStub();
    const adapter = createAvatarUploadAdapter(storageService, 'user-1');

    await expect(adapter.uploadAvatar(new File(['avatar'], 'avatar.gif', { type: 'image/gif' })))
      .rejects.toThrow('该文件类型不允许上传（允许：jpg、png）');
    expect(storageService.uploadSimpleFile).not.toHaveBeenCalled();
  });
});
