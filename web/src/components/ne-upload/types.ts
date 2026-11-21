import type { CSSProperties, ReactNode } from 'react';
import type { ListStorageFilesBySourceReq, StorageFileDetailResp, UploadTaskDetailResp } from '../../types/storage';

export type NeUploadStatus = 'ready' | 'uploading' | 'done' | 'error';

export interface NeUploadFile {
  uid: string;
  name: string;
  size?: number;
  mimeType?: string;
  extension?: string;
  status: NeUploadStatus;
  percent?: number;
  taskId?: string;
  fileId?: string;
  url?: string;
  thumbUrl?: string;
  hash?: string;
  errorMessage?: string;
  /**
   * 用户选择的原始文件。上传后仍保留，用于「有 taskId 无 fileId」的本地未绑定图片预览；
   * 组件只在内存中使用它生成对象 URL，不会发送到后端。
   */
  originFileObj?: File;
}

export interface NeUploadProps {
  value?: NeUploadFile[];
  defaultValue?: NeUploadFile[];
  maxCount?: number;
  replaceable?: boolean;
  accept?: string;
  disabled?: boolean;
  sourceEntity?: string;
  sourceId?: string;
  sourceType?: string;
  uploadText?: ReactNode;
  helperText?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /**
   * 上传实现。第二个入参为进度回调（0-100），分片上传下由实现方按整体进度回传；
   * 不回调时列表只展示不确定态进度。
   */
  uploadRequest?: (file: File, onProgress?: (percent: number) => void) => Promise<UploadTaskDetailResp>;
  /**
   * 回填查询实现。与 `sourceEntity`、`sourceId` 同时提供时，组件在挂载/源变化时回填已有文件。
   * 仅负责读取，不涉及下载地址决议（下载 URL 由组件内部按 `buildStorageDownloadUrl` 生成）。
   */
  listBySource?: (req: ListStorageFilesBySourceReq) => Promise<StorageFileDetailResp[]>;
  /**
   * 回填结束回调。`files` 为回填后的完整列表（服务端文件 + 本地未绑定任务），
   * `success` 为 false 表示 `listBySource` 查询失败。
   *
   * 只有真正发起回填查询时才会调用；未提供 `listBySource` 或缺少 `sourceEntity`/`sourceId` 时不会调用。
   */
  onBackfillComplete?: (files: NeUploadFile[], success: boolean) => void;
  deleteFile?: (file: NeUploadFile) => Promise<void>;
  onChange?: (files: NeUploadFile[]) => void;
  onUploadSuccess?: (file: NeUploadFile, task: UploadTaskDetailResp) => void;
  onUploadError?: (file: NeUploadFile, error: unknown) => void;
  /**
   * 文件移除后回调。允许返回 Promise：拒绝时组件会提示失败原因，不会静默失败。
   */
  onRemove?: (file: NeUploadFile) => void | Promise<void>;
  onLimitExceeded?: (files: File[], maxCount: number) => void;
}

export interface NeImageUploadProps extends Omit<NeUploadProps, 'accept'> {
  accept?: string;
  shape?: 'square' | 'circle';
  thumbnailSize?: number;
  preview?: boolean;
}
