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
  uploadRequest?: (file: File) => Promise<UploadTaskDetailResp>;
  listBySource?: (req: ListStorageFilesBySourceReq) => Promise<StorageFileDetailResp[]>;
  deleteFile?: (file: NeUploadFile) => Promise<void>;
  onChange?: (files: NeUploadFile[]) => void;
  onUploadSuccess?: (file: NeUploadFile, task: UploadTaskDetailResp) => void;
  onUploadError?: (file: NeUploadFile, error: unknown) => void;
  onRemove?: (file: NeUploadFile) => void;
  onLimitExceeded?: (files: File[], maxCount: number) => void;
}

export interface NeImageUploadProps extends Omit<NeUploadProps, 'accept'> {
  accept?: string;
  shape?: 'square' | 'circle';
  thumbnailSize?: number;
  preview?: boolean;
}
