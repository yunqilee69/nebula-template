import { appStorageService } from '@/api/storage-service';
import { request } from '@/request/request';
import type { StorageFileResp } from '@/types/storage';

/** 正式文件分页查询条件；字段名与 `POST /api/storage/files/page` 的请求体一致。 */
export interface StorageFilePageQuery {
  pageNum: number;
  pageSize: number;
  fileName?: string;
  sourceEntity?: string;
  sourceId?: string;
  sourceType?: string;
  uploadUserId?: string;
}

export interface StorageFilePage {
  readonly data: StorageFileResp[];
  readonly total: number;
}

/** 分享链接申请参数。 */
export interface StorageSignedDownloadRequest {
  fileId: string;
  filename?: string;
  expireSeconds?: number;
  maxDownloadCount?: number;
}

export interface StorageSignedDownload {
  fileId: string;
  fileName: string;
  expireAtEpochSecond: number;
  maxDownloadCount?: number;
  signature: string;
  /** 可直接发给第三方的短时分享地址。 */
  url: string;
}

/** 存储管理页用到的接口集合。 */
export interface StorageFileService {
  /** 分页查询当前租户的正式文件。 */
  pageFiles: (query: StorageFilePageQuery) => Promise<StorageFilePage>;
  /** 删除正式文件（只删记录，内容按引用计数回收）。 */
  deleteFile: (fileId: string) => Promise<void>;
  /** 申请签名分享链接。 */
  createSignedDownload: (payload: StorageSignedDownloadRequest) => Promise<StorageSignedDownload>;
  /** 下载并触发浏览器保存。 */
  downloadFile: (file: StorageFileResp) => Promise<void>;
}

/**
 * 触发浏览器保存 Blob。
 *
 * <p>对象 URL 不能点完立即 revoke：下载是异步发起的，提前失效会让浏览器直接中断这次下载
 * （表现为"点了没反应"）。这里把 `<a>` 挂到文档上点击后延迟释放。</p>
 */
export function saveBlobAsFile(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export const storageFileService: StorageFileService = {
  pageFiles: (query) => request<StorageFilePage>({ method: 'POST', url: '/api/storage/files/page', data: query }),

  deleteFile: async (fileId) => {
    await request<void>({ method: 'DELETE', url: `/api/storage/files/${encodeURIComponent(fileId)}` });
  },

  createSignedDownload: (payload) =>
    request<StorageSignedDownload>({ method: 'POST', url: '/api/storage/generate-signed-url', data: payload }),

  // 复用存储 API 的封装：先解析下载位置，DIRECT 取直链、PROXY 走带鉴权的代理
  downloadFile: async (file) => {
    const blob = await appStorageService.downloadFile(file.id, file.fileName);
    saveBlobAsFile(blob, file.fileName);
  },
};
