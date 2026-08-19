import type {
  BindUploadTaskReq,
  ListStorageFilesBySourceReq,
  StorageFileDetailResp,
  UploadTaskDetailResp,
} from '../types/storage';

export interface StorageRequestConfig {
  url: string;
  method?: 'get' | 'post' | 'delete';
  data?: unknown;
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  responseType?: 'blob';
}

export type StorageRequestFn = <T = unknown>(config: StorageRequestConfig) => Promise<T>;

export interface UploadSimpleFileOptions {
  fileName?: string;
}

export interface StorageService {
  uploadSimpleFile: (file: File, options?: UploadSimpleFileOptions) => Promise<UploadTaskDetailResp>;
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
