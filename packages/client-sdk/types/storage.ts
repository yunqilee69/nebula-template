/**
 * 文件存储契约，对应后端 `nebula-storage` 的 Req/Resp。
 *
 * <p>来源：`UploadTaskDetailResp`、`StorageFileResp`、`StorageFileDetailResp`、
 * `StorageUploadPolicyResp`、`CreateUploadTaskReq`、`BindUploadTaskReq`、
 * `GenerateSignedDownloadUrlReq`、`StorageSignedDownloadResp`。</p>
 *
 * <p>关键约束：简单上传与分片上传返回的都是<b>临时 task</b>，只有 bind 之后才产生正式 fileId。</p>
 */

/** 上传任务模式。 */
export type UploadTaskMode = 'SIMPLE' | 'CHUNKED' | string;

/** 上传任务状态。 */
export type UploadTaskStatus = string;

/** 上传任务详情。 */
export interface UploadTaskDetailResp {
  id: string;
  taskMode?: UploadTaskMode;
  fileName?: string;
  fileExtension?: string;
  fileMimeType?: string;
  /** 字节。 */
  fileSize?: number;
  fileHash?: string;
  /** 字节。 */
  chunkSize?: number;
  chunkCount?: number;
  uploadedChunkCount?: number;
  status?: UploadTaskStatus;
  uploadUserId?: string;
  lastChunkTime?: string;
  createTime?: string;
  updateTime?: string;
}

/** 正式文件列表项。 */
export interface StorageFileResp {
  id: string;
  fileName?: string;
  fileExtension?: string;
  fileMimeType?: string;
  fileSize?: number;
  sourceEntity?: string;
  sourceId?: string;
  sourceType?: string;
  createTime?: string;
}

/** 正式文件详情。 */
export interface StorageFileDetailResp extends StorageFileResp {
  fileHash?: string;
  uploadTaskId?: string;
  uploadUserId?: string;
  updateTime?: string;
}

/** 上传策略。单位 MB。 */
export interface StorageUploadPolicy {
  maxFileSize?: number;
  chunkThreshold?: number;
  chunkSize?: number;
  allowedExtensions?: string;
  tempRetentionDays?: number;
}

/** 创建分片上传任务请求。 */
export interface CreateUploadTaskReq {
  fileName: string;
  /** 字节。 */
  fileSize: number;
  /** 字节。 */
  chunkSize?: number;
  chunkCount?: number;
}

/** 绑定上传任务到业务实体请求。 */
export interface BindUploadTaskReq {
  sourceEntity: string;
  sourceId: string;
  /** 默认 `default`。 */
  sourceType?: string;
}

/** 生成签名分享链接请求（默认关闭能力）。 */
export interface GenerateSignedDownloadUrlReq {
  fileId: string;
  filename?: string;
  expireSeconds?: number;
  maxDownloadCount?: number;
}

/** 签名分享链接响应。 */
export interface StorageSignedDownloadResp {
  fileId?: string;
  fileName?: string;
  expireAtEpochSecond?: number;
  maxDownloadCount?: number;
  signature?: string;
  url?: string;
}
