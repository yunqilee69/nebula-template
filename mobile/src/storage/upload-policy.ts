import type {
  FrontendUploadConfigResp,
  StorageUploadPolicy,
} from '../../../packages/client-sdk/index.ts';

/** 1 MB（字节）。上传策略字段单位统一为 MB，这里换算为字节比较。 */
export const MB_BYTES = 1024 * 1024;

/** 内置兜底策略（与 init 兜底一致）。 */
export const DEFAULT_UPLOAD_POLICY = {
  maxFileSizeMB: 100,
  chunkThresholdMB: 5,
  chunkSizeMB: 2,
  allowedExtensions: '',
  tempRetentionDays: 14,
} as const;

/** 归一化后的上传策略（扩展名已拆分为数组，大小单位为 MB）。 */
export interface NormalizedUploadPolicy {
  maxFileSizeMB: number;
  chunkThresholdMB: number;
  chunkSizeMB: number;
  /** 小写扩展名（不含点）。空数组表示不限制。 */
  allowedExtensions: string[];
  tempRetentionDays: number;
}

export interface FileLike {
  name: string;
  /** 字节。 */
  size: number;
}

export type FileRejectionReason = 'FILE_TOO_LARGE' | 'EXTENSION_NOT_ALLOWED';

export interface FileValidation {
  ok: boolean;
  reason?: FileRejectionReason;
  message?: string;
}

/** 解析逗号分隔的扩展名白名单；空表示不限制。 */
export function parseAllowedExtensions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/^\./, ''))
    .filter((item) => item.length > 0);
}

/** 取文件扩展名（小写，不含点）；无扩展名返回空串。 */
export function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  if (index < 0 || index === fileName.length - 1) return '';
  return fileName.slice(index + 1).toLowerCase();
}

/** 归一化上传策略，缺省字段用兜底值。 */
export function normalizeUploadPolicy(
  raw: FrontendUploadConfigResp | StorageUploadPolicy | null | undefined,
): NormalizedUploadPolicy {
  return {
    maxFileSizeMB: raw?.maxFileSize ?? DEFAULT_UPLOAD_POLICY.maxFileSizeMB,
    chunkThresholdMB: raw?.chunkThreshold ?? DEFAULT_UPLOAD_POLICY.chunkThresholdMB,
    chunkSizeMB: raw?.chunkSize ?? DEFAULT_UPLOAD_POLICY.chunkSizeMB,
    allowedExtensions: parseAllowedExtensions(raw?.allowedExtensions ?? DEFAULT_UPLOAD_POLICY.allowedExtensions),
    tempRetentionDays: raw?.tempRetentionDays ?? DEFAULT_UPLOAD_POLICY.tempRetentionDays,
  };
}

/** 客户端本地校验：超限/扩展名不在白名单时先拦，服务端还会再拦一次。 */
export function validateFile(file: FileLike, policy: NormalizedUploadPolicy): FileValidation {
  if (file.size > policy.maxFileSizeMB * MB_BYTES) {
    return {
      ok: false,
      reason: 'FILE_TOO_LARGE',
      message: `文件超过 ${policy.maxFileSizeMB}MB 上限`,
    };
  }
  if (policy.allowedExtensions.length > 0) {
    const extension = getFileExtension(file.name);
    if (!policy.allowedExtensions.includes(extension)) {
      return {
        ok: false,
        reason: 'EXTENSION_NOT_ALLOWED',
        message: '该类型文件不允许上传',
      };
    }
  }
  return { ok: true };
}

export type UploadRoute = 'SIMPLE' | 'CHUNKED';

/**
 * 策略模式：按 `chunkThreshold` 选择简单或分片上传。
 * 超过阈值必须走分片（简单上传端点会直接拒绝）。
 */
export function routeUpload(fileSizeBytes: number, policy: NormalizedUploadPolicy): UploadRoute {
  const thresholdBytes = policy.chunkThresholdMB * MB_BYTES;
  return fileSizeBytes > thresholdBytes ? 'CHUNKED' : 'SIMPLE';
}
