import { describe, expect, it, vi } from 'vitest';
import type { NeUploadFile } from '@/components/ne-upload';
import { createAvatarUploadAdapter, avatarUrlToFiles, filesToAvatarUrl } from './avatar-upload';
import type { AvatarStorageService } from './avatar-upload';

const uploadTask = {
  id: 'task-1',
  taskMode: 'simple',
  fileName: 'avatar.png',
  fileMimeType: 'image/png',
  status: 'COMPLETED' as const,
};

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
    const storageService: AvatarStorageService = {
      uploadSimpleFile: vi.fn().mockResolvedValue(uploadTask),
      bindUploadTask: vi.fn().mockResolvedValue('file-1'),
      getDownloadUrl: vi.fn((fileId: string, filename?: string) => `/api/storage/download?fileId=${fileId}&filename=${filename ?? ''}`),
    };
    const adapter = createAvatarUploadAdapter(storageService, 'user-1');
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await expect(adapter.uploadAvatar(file)).resolves.toEqual({
      task: uploadTask,
      avatarUrl: '/api/storage/download?fileId=file-1&filename=avatar.png',
    });
    expect(storageService.uploadSimpleFile).toHaveBeenCalledWith(file);
    expect(storageService.bindUploadTask).toHaveBeenCalledWith('task-1', { sourceEntity: 'user-profile', sourceId: 'user-1', sourceType: 'avatar' });
    expect(storageService.getDownloadUrl).toHaveBeenCalledWith('file-1', 'avatar.png');
  });
});
