import { parseStorageDownloadUrl, uploadFileWithPolicy } from '@/api/storage';
import type { PolicyUploadService } from '@/api/storage';
import { ensureUploadPolicy } from '@/stores/upload-policy-store';
import type { NeUploadFile } from '@/components/ne-upload';
import type { UploadTaskDetailResp } from '@/types/storage';

const avatarFileUid = 'profile-avatar';
const avatarFallbackName = 'avatar';
const avatarPreviewPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

/** 头像上传产出：只有临时 taskId 与本地预览，绑定由后端资料保存接口完成。 */
export interface AvatarUploadOutcome {
  readonly task: UploadTaskDetailResp;
  /** 上传任务 id，随资料保存以 `uploadTaskIds.avatar` 提交。 */
  readonly taskId: string;
  /** 本地预览地址（object URL）：保存完成前用它展示所选图片。 */
  readonly previewUrl?: string;
}

/** 上传并自动保存的最终结果，供头像卡片决定是否保留本地预览。 */
export interface AvatarUploadResult extends AvatarUploadOutcome {
  /** 资料保存是否成功；`false` 表示 taskId 待重试、绑定尚未发生。 */
  readonly saved: boolean;
  /** 保存成功后的正式头像地址（取自保存响应）。 */
  readonly avatarUrl?: string;
}

export interface AvatarUploadAdapter {
  readonly uploadAvatar: (file: File, onProgress?: (percent: number) => void) => Promise<AvatarUploadOutcome>;
}

/** 头像上传只需要策略选路能力：不再包含任何绑定方法。 */
export type AvatarStorageService = PolicyUploadService;

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

/** 生成所选图片的本地预览地址（object URL）。 */
export function createAvatarPreviewUrl(file: File): string | undefined {
  if (typeof URL.createObjectURL !== 'function') return undefined;
  return URL.createObjectURL(file);
}

export function revokeAvatarPreviewUrl(avatarPreviewUrl: string | undefined) {
  if (avatarPreviewUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(avatarPreviewUrl);
}

export function createAvatarUploadAdapter(storageService: AvatarStorageService): AvatarUploadAdapter {
  return {
    async uploadAvatar(file, onProgress) {
      // 走策略选路：超过分片阈值的头像自动切片上传，避免大图在传输口径处被 413 拦掉
      const policy = await ensureUploadPolicy();
      const task = await uploadFileWithPolicy(storageService, policy, file, { onProgress });
      return { task, taskId: task.id, previewUrl: createAvatarPreviewUrl(file) };
    },
  };
}
