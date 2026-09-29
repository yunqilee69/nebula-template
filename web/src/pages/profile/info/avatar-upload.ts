import { parseStorageDownloadUrl, uploadFileWithPolicy } from '@/api/storage';
import type { StorageService } from '@/api/storage';
import { ensureUploadPolicy } from '@/stores/upload-policy-store';
import type { NeUploadFile } from '@/components/ne-upload';
import type { UploadTaskDetailResp } from '@/types/storage';

const avatarFileUid = 'profile-avatar';
const avatarFallbackName = 'avatar';
const avatarSourceEntity = 'user-profile';
const avatarSourceType = 'avatar';
const avatarPreviewPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export interface AvatarUploadResult {
  readonly task: UploadTaskDetailResp;
  readonly avatarUrl: string;
}

export interface AvatarUploadAdapter {
  readonly uploadAvatar: (file: File, onProgress?: (percent: number) => void) => Promise<AvatarUploadResult>;
}

export type AvatarStorageService = Pick<
  StorageService,
  'uploadSimpleFile' | 'createUploadTask' | 'uploadTaskPart' | 'completeUploadTask' | 'bindUploadTask' | 'getDownloadUrl'
>;

function normalizeOptionalText(value: string | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

function getAvatarFileName(avatarUrl: string) {
  const url = new URL(avatarUrl, window.location.origin);
  const filename = normalizeOptionalText(url.searchParams.get('filename') ?? undefined);
  if (filename) return filename;

  const segments = url.pathname.split('/').filter(Boolean);
  return normalizeOptionalText(segments[segments.length - 1]) ?? avatarFallbackName;
}

function getAvatarThumbnailUrl(avatarUrl: string, previewUrl: string | undefined) {
  const normalizedPreviewUrl = normalizeOptionalText(previewUrl);
  if (normalizedPreviewUrl) return normalizedPreviewUrl;
  return parseStorageDownloadUrl(avatarUrl) ? avatarPreviewPlaceholder : avatarUrl;
}

export function avatarUrlToFiles(avatar: string | undefined, previewUrl?: string): NeUploadFile[] {
  const avatarUrl = normalizeOptionalText(avatar);
  if (!avatarUrl) return [];

  return [{
    uid: avatarFileUid,
    name: getAvatarFileName(avatarUrl),
    status: 'done',
    url: avatarUrl,
    thumbUrl: getAvatarThumbnailUrl(avatarUrl, previewUrl),
  }];
}

export function filesToAvatarUrl(files: readonly NeUploadFile[]) {
  const file = files.find((item) => item.status !== 'error' && (item.url || item.thumbUrl));
  return normalizeOptionalText(file?.url ?? file?.thumbUrl);
}

export function createAvatarUploadAdapter(storageService: AvatarStorageService, profileId: string): AvatarUploadAdapter {
  return {
    async uploadAvatar(file, onProgress) {
      // 走策略选路：超过分片阈值的头像自动切片上传，避免大图在传输口径处被 413 拦掉
      const policy = await ensureUploadPolicy();
      const task = await uploadFileWithPolicy(storageService, policy, file, { onProgress });
      const fileId = await storageService.bindUploadTask(task.id, {
        sourceEntity: avatarSourceEntity,
        sourceId: profileId,
        sourceType: avatarSourceType,
      });
      return {
        task,
        avatarUrl: storageService.getDownloadUrl(fileId, task.fileName || file.name),
      };
    },
  };
}
