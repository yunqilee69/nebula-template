import { uploadFileWithPolicy } from '@/api/storage';
import type { PolicyUploadService } from '@/api/storage';
import { ensureUploadPolicy } from '@/stores/upload-policy-store';
import type { UploadTaskDetailResp } from '@/types/storage';

/** 企业资料图上传只需要策略选路能力：不包含任何绑定方法。 */
export type TenantAssetStorageService = PolicyUploadService;

/**
 * 上传企业设置中的图片，返回<b>临时上传任务</b>。
 *
 * <p>只负责"把文件传成任务"：绑定由租户资料保存接口完成，本地预览与进度由
 * `NeImageUpload` 统一处理（它保留 `originFileObj` 生成对象 URL）。</p>
 *
 * @param storageService 存储服务（策略选路所需的最小能力集）
 * @param file 用户选择的图片
 * @param onProgress 0-100 的整体进度回调
 * @return 临时上传任务详情
 */
export async function uploadTenantAssetTask(
  storageService: TenantAssetStorageService,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadTaskDetailResp> {
  const policy = await ensureUploadPolicy();
  return uploadFileWithPolicy(storageService, policy, file, { onProgress });
}
