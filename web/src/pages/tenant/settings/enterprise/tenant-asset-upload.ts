import { uploadFileWithPolicy } from '@/api/storage';
import type { PolicyUploadService } from '@/api/storage';
import { ensureUploadPolicy } from '@/stores/upload-policy-store';

/** 企业资料图上传只需要策略选路能力：不再包含任何绑定方法。 */
export type TenantAssetStorageService = PolicyUploadService;

/** 上传产出：只有临时 taskId 与本地预览，绑定由租户资料保存接口完成。 */
export interface TenantAssetUploadOutcome {
  /** 上传任务 id，随租户资料保存以 `uploadTaskIds[资源位]` 提交。 */
  readonly taskId: string;
  /** 本地预览地址（object URL）：保存完成前用它展示所选图片。 */
  readonly previewUrl?: string;
  /** 服务端确认的文件名，便于提示与排查。 */
  readonly fileName?: string;
}

/** 生成所选图片的本地预览地址（object URL）。 */
export function createTenantAssetPreviewUrl(file: File): string | undefined {
  if (typeof URL.createObjectURL !== 'function') return undefined;
  return URL.createObjectURL(file);
}

export function revokeTenantAssetPreviewUrl(previewUrl: string | undefined) {
  if (previewUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(previewUrl);
}

/** 上传企业设置中的图片，返回随资料保存一起提交的上传任务。 */
export async function uploadTenantAsset(
  storageService: TenantAssetStorageService,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<TenantAssetUploadOutcome> {
  const policy = await ensureUploadPolicy();
  const task = await uploadFileWithPolicy(storageService, policy, file, { onProgress });
  return {
    taskId: task.id,
    previewUrl: createTenantAssetPreviewUrl(file),
    fileName: task.fileName || file.name,
  };
}
