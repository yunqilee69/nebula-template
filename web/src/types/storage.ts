export type UploadTaskStatus = 'INIT' | 'UPLOADING' | 'COMPLETED' | 'FAILED';

export interface UploadTaskDetailResp {
  id: string;
  taskMode: string;
  fileName: string;
  fileExtension?: string;
  fileMimeType?: string;
  fileSize?: number;
  fileHash?: string;
  chunkSize?: number | null;
  chunkCount?: number;
  uploadedChunkCount?: number;
  status: UploadTaskStatus;
  uploadUserId?: string;
  lastChunkTime?: string;
  createTime?: string;
  updateTime?: string;
}

export interface CreateUploadTaskReq {
  fileName: string;
  /** 文件总大小（字节） */
  fileSize: number;
  /** 分片大小（字节），必须与参数中心 storage.upload.chunk-size 一致 */
  chunkSize: number;
  /** 分片总数，服务端会按配置重算并覆盖 */
  chunkCount: number;
}

export interface BindUploadTaskReq {
  sourceEntity: string;
  sourceId: string;
  sourceType?: string;
}

export interface ListStorageFilesBySourceReq {
  sourceEntity: string;
  sourceId: string;
  sourceType?: string;
}

export interface StorageFileResp {
  id: string;
  fileName: string;
  fileExtension?: string;
  fileMimeType?: string;
  fileSize?: number;
  sourceEntity?: string;
  sourceId?: string;
  sourceType?: string;
  createTime?: string;
}

export interface StorageFileDetailResp extends StorageFileResp {
  fileHash?: string;
  uploadTaskId?: string;
  uploadUserId?: string;
  updateTime?: string;
}

export interface StorageSignedDownloadResp {
  fileId: string;
  fileName: string;
  expireAtEpochSecond: number;
  maxDownloadCount?: number;
  signature: string;
  url: string;
}
