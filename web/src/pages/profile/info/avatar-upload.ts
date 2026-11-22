import { uploadFileWithPolicy } from '@/api/storage';
import type { PolicyUploadService } from '@/api/storage';
import { ensureUploadPolicy } from '@/stores/upload-policy-store';
import type { UploadTaskDetailResp } from '@/types/storage';

/** 头像上传产出：只有临时 taskId 与本地预览，绑定由后端资料保存接口完成。 */
export interface AvatarUploadOutcome {
  readonly task: UploadTaskDetailResp;
  /** 上传任务 id，随资料保存以 `uploadTaskIds.avatar` 提交。 */
  readonly taskId: string;
  /** 本地预览地址（object URL）：保存完成前用它展示所选图片。 */
  readonly previewUrl?: string;
}

/** 上传并自动保存的最终结果，供页面决定是否保留本地预览与写回全局用户态。 */
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
