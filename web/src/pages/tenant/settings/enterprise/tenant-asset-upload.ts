import { uploadFileWithPolicy } from '@/api/storage';
import type { StorageService } from '@/api/storage';
import { ensureUploadPolicy } from '@/stores/upload-policy-store';

export type TenantAssetStorageService = Pick<
  StorageService,
  'uploadSimpleFile' | 'createUploadTask' | 'uploadTaskPart' | 'completeUploadTask' | 'bindUploadTask' | 'getDownloadUrl'
>;

/** 上传企业设置中的图片，并把文件绑定到当前租户资料。 */
export async function uploadTenantAsset(
  storageService: TenantAssetStorageService,
  tenantId: string,
  file: File,
  sourceType: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const policy = await ensureUploadPolicy();
  const task = await uploadFileWithPolicy(storageService, policy, file, { onProgress });
  const fileId = await storageService.bindUploadTask(task.id, {
    sourceEntity: 'tenant-profile',
    sourceId: tenantId,
    sourceType,
  });
  return storageService.getDownloadUrl(fileId, task.fileName || file.name);
}
