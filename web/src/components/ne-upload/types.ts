import type { CSSProperties, ReactNode } from 'react';
import type { StorageDownloadLocation } from '@/api/storage';
import type { ListStorageFilesBySourceReq, UploadTaskDetailResp } from '../../types/storage';

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
  /**
   * 图片的无障碍名称。默认用文件名；单值资源位（头像、Logo 等）应传资源位名称，
   * 让读屏与测试都能把"这张图是哪个资源位"说清楚。
   */
  imageAlt?: string;
  /** 删除按钮的无障碍名称；默认 `删除 {name}`，业务侧可传本地化文案。 */
  removeLabel?: (file: NeUploadFile) => string;
  /**
   * 是否渲染删除按钮。默认全部可删；
   * 返回 false 时不渲染（例如已保存的正式文件不允许在这里删除，只能撤销"待提交"）。
   */
  removable?: (file: NeUploadFile) => boolean;
  /**
   * 删除方式：
   * - `immediate`（默认）：删除时立即调用 `deleteFile`；
   * - `deferred`：删除只把 `fileId` 记进"待删除"列表，等业务保存时统一提交
   *   （组件不调 `deleteFile`）。`maxCount=1` 换图时被顶掉的已保存文件同样计入。
   */
  removalMode?: 'immediate' | 'deferred';
  /**
   * `removalMode=deferred` 时，待删除的正式文件 ID 变化回调。
   *
   * <p>业务把它放进保存请求（例如 `deletedFileIds`），由后端在保存流程里释放引用；
   * 保存成功后组件重新装载（`downloadLocations`/`refreshToken` 变化）会自动清空该列表。</p>
   */
  onRemovalChange?: (fileIds: string[]) => void;
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
   * 业务直传的下载位置（优先级最高）：有值时组件**不再**向服务端解析，
   * 直接把数组当成初始文件列表。元素与 `GET /api/storage/download-location` 的响应同构，
   * 因此业务自己的聚合接口结果可以原样透传。`url` 必填。
   */
  downloadLocations?: readonly StorageDownloadLocation[];
  /**
   * 外部数据版本：业务保存成功后把它改成新值，可让组件重新解析一次下载位置
   * （例如企业资料换图后，资源位三元组没变但文件变了）。
   */
  refreshToken?: unknown;
  /**
   * 初始文件装载完成回调。`files` 为装载后的完整列表（服务端/业务给定文件 + 本地在途任务），
   * `success` 为 false 表示下载位置解析失败（列表退回上一次的值）。
   *
   * 只有真正发起装载时才会调用：既没有 `downloadLocations`，也没有完整的
   * `sourceEntity` + `sourceId` 时不会调用。
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
  /** 缩略图框高度；默认等于 `thumbnailSize`（正方形）。宽幅资源位（登录页背景图）传它。 */
  thumbnailHeight?: number;
  /** 无预览时的占位内容；默认渲染通用文件图标（头像可用首字母占位）。 */
  placeholder?: ReactNode;
  preview?: boolean;
}
