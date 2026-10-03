import {
  STORAGE_ENDPOINTS,
  type BindUploadTaskReq,
  type UploadTaskDetailResp,
} from '../../../packages/client-sdk/index.ts';
import type { RequestConfig } from '../request/types.ts';
import {
  MB_BYTES,
  getFileExtension,
  normalizeUploadPolicy,
  routeUpload,
  validateFile,
  type FileLike,
  type NormalizedUploadPolicy,
} from './upload-policy.ts';

/** 可读取分片的文件源（由 App 壳用 RN 文件/相册 API 实现）。 */
export interface UploadFileSource extends FileLike {
  mimeType?: string;
  /** RN FormData 需要的本地 uri（简单上传用）；可选。 */
  uri?: string;
  /** 已有 Blob 时优先使用（Web/测试）。 */
  blob?: Blob;
  /** 读取 [offset, offset+length) 的字节。 */
  readPart(offset: number, length: number): Promise<Uint8Array>;
}

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  ratio: number;
}

export interface UploadHandlers {
  onProgress?: (progress: UploadProgress) => void;
}

export interface StorageServiceDeps {
  request: <T>(config: RequestConfig) => Promise<T>;
  policy?: NormalizedUploadPolicy | null;
  /** 分片重试策略。 */
  retry?: { maxAttempts?: number; delayMs?: number };
  sleep?: (ms: number) => Promise<void>;
}

export interface StorageService {
  upload(file: UploadFileSource, handlers?: UploadHandlers): Promise<UploadTaskDetailResp>;
  /** 绑定到业务实体；只有 bind 之后才产生正式 fileId。 */
  bind(taskId: string, request: BindUploadTaskReq): Promise<string>;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 300;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 进度聚合器：只累加「已确认成功」的字节，重试不会让进度回退。 */
export function createProgressTracker(totalBytes: number, onProgress?: (progress: UploadProgress) => void) {
  let uploadedBytes = 0;
  const emit = (): void => {
    if (!onProgress) return;
    onProgress({
      uploadedBytes,
      totalBytes,
      ratio: totalBytes > 0 ? Math.min(1, uploadedBytes / totalBytes) : 1,
    });
  };
  return {
    add(bytes: number): void {
      uploadedBytes += bytes;
      emit();
    },
    snapshot(): UploadProgress {
      return {
        uploadedBytes,
        totalBytes,
        ratio: totalBytes > 0 ? Math.min(1, uploadedBytes / totalBytes) : 1,
      };
    },
  };
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  delayMs: number,
  sleep: (ms: number) => Promise<void>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await sleep(delayMs * attempt);
    }
  }
  throw lastError;
}

/**
 * 文件服务：策略路由（简单/分片）、分片重试、聚合进度、bind 产出正式 fileId。
 *
 * <p>幂等/重放由上层 `offline` 队列负责，本服务只负责单次上传的可靠性。</p>
 */
export function createStorageService(deps: StorageServiceDeps): StorageService {
  const policy = deps.policy ?? normalizeUploadPolicy(null);
  const maxAttempts = deps.retry?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const delayMs = deps.retry?.delayMs ?? DEFAULT_RETRY_DELAY_MS;
  const sleep = deps.sleep ?? defaultSleep;

  async function uploadSimple(file: UploadFileSource, handlers?: UploadHandlers): Promise<UploadTaskDetailResp> {
    const bytes = await file.readPart(0, file.size);
    // RN 必须发 { uri, name, type } 文件对象；transport 识别该形态并原样交给 FormData。
    // 若回退成字符串，服务端收到的"文件"只是一段 URI 文本而不是文件内容。
    const fileField = file.blob
      ?? (file.uri
        ? { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' }
        : new Blob([new Uint8Array(bytes)], { type: file.mimeType ?? 'application/octet-stream' }));
    const task = await deps.request<UploadTaskDetailResp>({
      method: 'POST',
      url: STORAGE_ENDPOINTS.upload,
      formData: {
        fileName: file.name,
        file: fileField,
      },
    });
    handlers?.onProgress?.({ uploadedBytes: file.size, totalBytes: file.size, ratio: 1 });
    return task;
  }

  async function uploadChunked(file: UploadFileSource, handlers?: UploadHandlers): Promise<UploadTaskDetailResp> {
    const chunkSizeBytes = policy.chunkSizeMB > 0 ? policy.chunkSizeMB * MB_BYTES : file.size || 1;
    const chunkCount = Math.max(1, Math.ceil(file.size / chunkSizeBytes));
    const tracker = createProgressTracker(file.size, handlers?.onProgress);

    const taskId = await deps.request<string>({
      method: 'POST',
      url: STORAGE_ENDPOINTS.uploadTasks,
      data: {
        fileName: file.name,
        fileSize: file.size,
        chunkSize: chunkSizeBytes,
        chunkCount,
      },
    });

    for (let partNo = 1; partNo <= chunkCount; partNo += 1) {
      const offset = (partNo - 1) * chunkSizeBytes;
      const length = Math.min(chunkSizeBytes, file.size - offset);
      const bytes = await file.readPart(offset, length);
      await withRetry(
        () =>
          deps.request({
            method: 'PUT',
            url: STORAGE_ENDPOINTS.uploadTaskPart(taskId, partNo),
            binaryBody: bytes,
            headers: { 'Content-Type': 'application/octet-stream' },
          }),
        maxAttempts,
        delayMs,
        sleep,
      );
      tracker.add(length);
    }

    return deps.request<UploadTaskDetailResp>({
      method: 'POST',
      url: STORAGE_ENDPOINTS.completeUploadTask(taskId),
    });
  }

  return {
    async upload(file, handlers) {
      const validation = validateFile(file, policy);
      if (!validation.ok) {
        throw new Error(validation.message ?? '文件校验失败');
      }
      const route = routeUpload(file.size, policy);
      return route === 'CHUNKED' ? uploadChunked(file, handlers) : uploadSimple(file, handlers);
    },
    bind(taskId, request) {
      return deps.request<string>({
        method: 'POST',
        url: STORAGE_ENDPOINTS.bindUploadTask(taskId),
        data: {
          sourceEntity: request.sourceEntity,
          sourceId: request.sourceId,
          sourceType: request.sourceType ?? 'default',
        },
      });
    },
  };
}

/** 便于业务侧构造 UploadFileSource 时复用扩展名校验。 */
export { getFileExtension };
