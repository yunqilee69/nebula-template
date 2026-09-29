import type {
  BindUploadTaskReq,
  CreateUploadTaskReq,
  ListStorageFilesBySourceReq,
  StorageFileDetailResp,
  UploadTaskDetailResp,
} from '../types/storage';
import type { FrontendUploadConfig } from '../types/auth';

/** 分片大小与阈值的换算基准：参数中心以 MB 计，接口与浏览器文件 API 以字节计。 */
const BYTES_PER_MEGABYTE = 1024 * 1024;

/** 单个分片上传失败后的最大重试次数（同序号重传在服务端是幂等的）。 */
const MAX_PART_RETRY_TIMES = 2;

export interface UploadProgressEvent {
  loaded: number;
  total?: number;
}

export type UploadProgressHandler = (event: UploadProgressEvent) => void;

export interface StorageRequestConfig {
  url: string;
  method?: 'get' | 'post' | 'delete' | 'put';
  data?: unknown;
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  responseType?: 'blob';
  /** 透传给底层请求客户端的 axios onUploadProgress */
  onUploadProgress?: (event: UploadProgressEvent) => void;
}

export type StorageRequestFn = <T = unknown>(config: StorageRequestConfig) => Promise<T>;

export interface UploadSimpleFileOptions {
  fileName?: string;
  onUploadProgress?: (event: UploadProgressEvent) => void;
}

export interface StorageService {
  uploadSimpleFile: (file: File, options?: UploadSimpleFileOptions) => Promise<UploadTaskDetailResp>;
  createUploadTask: (req: CreateUploadTaskReq) => Promise<string>;
  uploadTaskPart: (
    taskId: string,
    partNumber: number,
    chunk: Blob,
    onUploadProgress?: (event: UploadProgressEvent) => void,
  ) => Promise<UploadTaskDetailResp>;
  completeUploadTask: (taskId: string) => Promise<UploadTaskDetailResp>;
  bindUploadTask: (taskId: string, req: BindUploadTaskReq) => Promise<string>;
  getFileDetail: (fileId: string) => Promise<StorageFileDetailResp>;
  listFilesBySource: (req: ListStorageFilesBySourceReq) => Promise<StorageFileDetailResp[]>;
  deleteFile: (fileId: string) => Promise<void>;
  getDownloadUrl: (fileId: string, filename?: string) => string;
  downloadFile: (fileId: string, filename?: string) => Promise<Blob>;
}

const storageDownloadPath = '/api/storage/download';

function buildStorageDownloadUrl(fileId: string, filename?: string) {
  const searchParams = new URLSearchParams({ fileId });
  if (filename) searchParams.set('filename', filename);
  return `${storageDownloadPath}?${searchParams.toString()}`;
}

function normalizeOptionalText(value: string | undefined) {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

export function parseStorageDownloadUrl(downloadUrl: string): { readonly fileId: string; readonly filename?: string } | undefined {
  const url = new URL(downloadUrl, 'http://nebula.local');
  if (url.pathname !== storageDownloadPath) return undefined;

  const fileId = normalizeOptionalText(url.searchParams.get('fileId') ?? undefined);
  if (!fileId) return undefined;

  const filename = normalizeOptionalText(url.searchParams.get('filename') ?? undefined);
  return filename ? { fileId, filename } : { fileId };
}

function normalizeSourceReq(req: ListStorageFilesBySourceReq): ListStorageFilesBySourceReq {
  const sourceType = req.sourceType?.trim();
  return sourceType
    ? { sourceEntity: req.sourceEntity, sourceId: req.sourceId, sourceType }
    : { sourceEntity: req.sourceEntity, sourceId: req.sourceId };
}

export function createStorageService(request: StorageRequestFn): StorageService {
  return {
    uploadSimpleFile(file, options) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', options?.fileName ?? file.name);

      return request<UploadTaskDetailResp>({
        url: '/api/storage/upload',
        method: 'post',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: options?.onUploadProgress,
      });
    },

    createUploadTask(req) {
      return request<string>({
        url: '/api/storage/upload-tasks',
        method: 'post',
        data: req,
      });
    },

    uploadTaskPart(taskId, partNumber, chunk, onUploadProgress) {
      const formData = new FormData();
      formData.append('file', chunk, `part-${partNumber}`);

      return request<UploadTaskDetailResp>({
        url: `/api/storage/upload-tasks/${encodeURIComponent(taskId)}/parts/${partNumber}`,
        method: 'put',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      });
    },

    completeUploadTask(taskId) {
      return request<UploadTaskDetailResp>({
        url: `/api/storage/upload-tasks/${encodeURIComponent(taskId)}/complete`,
        method: 'post',
      });
    },

    bindUploadTask(taskId, req) {
      return request<string>({
        url: `/api/storage/upload-tasks/${encodeURIComponent(taskId)}/bind`,
        method: 'post',
        data: req,
      });
    },

    getFileDetail(fileId) {
      return request<StorageFileDetailResp>({
        url: `/api/storage/files/${encodeURIComponent(fileId)}`,
        method: 'get',
      });
    },

    listFilesBySource(req) {
      return request<StorageFileDetailResp[]>({
        url: '/api/storage/files/list-by-source',
        method: 'post',
        data: normalizeSourceReq(req),
      });
    },

    async deleteFile(fileId) {
      await request<void>({
        url: `/api/storage/files/${encodeURIComponent(fileId)}`,
        method: 'delete',
      });
    },

    getDownloadUrl(fileId, filename) {
      return buildStorageDownloadUrl(fileId, filename);
    },

    downloadFile(fileId, filename) {
      return request<Blob>({
        url: buildStorageDownloadUrl(fileId, filename),
        method: 'get',
        responseType: 'blob',
      });
    },
  };
}

/* ------------------------------------------------------------------ */
/*  上传策略（来自 init 缓存）驱动的上传选路                            */
/* ------------------------------------------------------------------ */

/** 解析扩展名白名单：逗号分隔、大小写不敏感、可带或不带前导点。 */
export function parseAllowedExtensions(allowedExtensions: string | undefined): string[] {
  if (!allowedExtensions?.trim()) return [];
  return allowedExtensions
    .split(',')
    .map((item) => item.trim().replace(/^\./, '').toLowerCase())
    .filter((item) => item.length > 0);
}

/** 服务端仍会再校验一次，这里只是提前失败、避免白传流量。 */
export function isExtensionAllowed(allowedExtensions: string | undefined, fileName: string): boolean {
  const allowed = parseAllowedExtensions(allowedExtensions);
  if (allowed.length === 0) return true;
  const dotIndex = fileName.lastIndexOf('.');
  // 无扩展名视为空串参与比较，与白名单中不会出现空条目的事实一起，等价于「拒绝」
  if (dotIndex < 0) return false;
  return allowed.includes(fileName.slice(dotIndex + 1).toLowerCase());
}

/** 把白名单转成 `<input accept>` 表达式；未配置白名单时返回 undefined，交给控件默认行为。 */
export function buildAcceptAttribute(allowedExtensions: string | undefined): string | undefined {
  const allowed = parseAllowedExtensions(allowedExtensions);
  if (allowed.length === 0) return undefined;
  return allowed.map((extension) => `.${extension}`).join(',');
}

export function megabytesToBytes(megabytes: number): number {
  return megabytes * BYTES_PER_MEGABYTE;
}

export interface PolicyUploadOptions {
  /** 0-100 的整体进度 */
  onProgress?: (percent: number) => void;
}

/** 策略选路真正需要的能力集合，便于调用方传入裁剪过的服务实现。 */
export type PolicyUploadService = Pick<
  StorageService,
  'uploadSimpleFile' | 'createUploadTask' | 'uploadTaskPart' | 'completeUploadTask'
>;

export interface PolicyUploadRequest {
  (file: File, onProgress?: (percent: number) => void): Promise<UploadTaskDetailResp>;
}

/** 上传前本地校验：与服务端同源规则，仅用于提前给出反馈。 */
function assertUploadAllowed(policy: FrontendUploadConfig, file: File) {
  if (!isExtensionAllowed(policy.allowedExtensions, file.name)) {
    const allowed = parseAllowedExtensions(policy.allowedExtensions).join('、');
    throw new Error(`该文件类型不允许上传（允许：${allowed}）`);
  }
  if (policy.maxFileSize && file.size > megabytesToBytes(policy.maxFileSize)) {
    throw new Error(`文件大小超出上限（最大 ${policy.maxFileSize}MB）`);
  }
}

function isRetryableUploadError(error: unknown): boolean {
  // 业务错误（code != 0）由请求层抛出的普通 Error 表示，重试没有意义；
  // 只有网络/超时错误（无 response）与 5xx/408/429 才重试。
  if (typeof error !== 'object' || error === null || !('isAxiosError' in error)) return false;
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === undefined || status >= 500 || status === 408 || status === 429;
}

async function withRetry<T>(action: () => Promise<T>, retryTimes: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retryTimes; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt === retryTimes || !isRetryableUploadError(error)) throw error;
    }
  }
  throw lastError;
}

/**
 * 按策略上传：大于分片阈值走分片流程（切片 → 逐片上传 → 合并），否则整文件直传。
 *
 * 分片串行上传（顺序可控、进度单调），单片失败按需重试——
 * 同序号重传在服务端幂等（内容一致直接返回，内容不一致报 PART_HASH_MISMATCH）。
 * 仅返回临时任务详情，bind 仍由调用方决定（与整文件上传保持同一契约）。
 */
export async function uploadFileWithPolicy(
  service: PolicyUploadService,
  policy: FrontendUploadConfig,
  file: File,
  options: PolicyUploadOptions = {},
): Promise<UploadTaskDetailResp> {
  assertUploadAllowed(policy, file);

  const chunkThresholdBytes = megabytesToBytes(policy.chunkThreshold ?? 0);
  if (!chunkThresholdBytes || file.size <= chunkThresholdBytes) {
    return service.uploadSimpleFile(file, {
      onUploadProgress: (event) => options.onProgress?.(toPercent(event.loaded, event.total ?? file.size)),
    });
  }

  const chunkSizeBytes = megabytesToBytes(policy.chunkSize ?? 0);
  if (chunkSizeBytes <= 0) {
    throw new Error('分片大小配置不合法，无法进行分片上传');
  }

  const chunkCount = Math.max(1, Math.ceil(file.size / chunkSizeBytes));
  const taskId = await service.createUploadTask({
    fileName: file.name,
    fileSize: file.size,
    chunkSize: chunkSizeBytes,
    chunkCount,
  });

  for (let partNumber = 1; partNumber <= chunkCount; partNumber += 1) {
    const start = (partNumber - 1) * chunkSizeBytes;
    const chunk = file.slice(start, Math.min(start + chunkSizeBytes, file.size));
    await withRetry(
      () => service.uploadTaskPart(taskId, partNumber, chunk, (event) => {
        const withinPart = toPercent(event.loaded, event.total ?? chunk.size) / 100;
        options.onProgress?.(((partNumber - 1) + withinPart) / chunkCount * 100);
      }),
      MAX_PART_RETRY_TIMES,
    );
  }

  options.onProgress?.(100);
  return service.completeUploadTask(taskId);
}

/** 把 {@link uploadFileWithPolicy} 适配成上传控件需要的 `(file, onProgress)` 签名。 */
export function createPolicyUploadRequest(
  service: PolicyUploadService,
  policy: FrontendUploadConfig,
): PolicyUploadRequest {
  return (file, onProgress) => uploadFileWithPolicy(service, policy, file, { onProgress });
}

function toPercent(loaded: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (loaded / total) * 100));
}

