/** 存储后端配置视图（脱敏）：凭据只回传「是否已配置」。 */
export interface StorageBackendSettings {
  /** 后端类型；`application` 表示跟随 application.yml */
  type?: string;
  filesystemBaseDir?: string;
  endpoint?: string;
  region?: string;
  bucket?: string;
  hasAccessKey?: boolean;
  hasSecretKey?: boolean;
  createBucketIfMissing?: boolean;
  directDownloadEnabled?: boolean;
  directDownloadExpireSeconds?: number;
}

/** 上传策略，单位统一为 MB。 */
export interface StorageUploadPolicySettings {
  maxFileSize?: number;
  chunkThreshold?: number;
  chunkSize?: number;
  allowedExtensions?: string;
  tempRetentionDays?: number;
}

/** 生效来源：APPLICATION 表示当前正跟随 application.yml。 */
export type StorageSettingsSource = 'APPLICATION' | 'TENANT';

/** 存储配置视图，对应 GET /api/storage/settings。 */
export interface StorageSettings {
  source: StorageSettingsSource;
  mode?: string;
  /** 已安装的后端类型，供下拉选择 */
  installedTypes: string[];
  /** application.yml 里的后端配置（只读） */
  application?: StorageBackendSettings;
  /** 参数中心里的租户后端配置 */
  tenant?: StorageBackendSettings;
  uploadPolicy?: StorageUploadPolicySettings;
  /** 静态传输口径上限（MB），来自 spring.servlet.multipart.max-file-size */
  maxUploadFileSizeMb?: number;
  /** 不属于当前生效后端的正式文件数，用于切换风险提示 */
  foreignFileCount?: number;
}

/**
 * 保存请求，对应 PUT /api/storage/settings。
 *
 * 凭据三态：字段省略表示保持、空串表示清除、非空表示覆盖。
 */
export interface UpdateStorageSettingsRequest {
  backendType: string;
  filesystemBaseDir?: string;
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
  createBucketIfMissing?: boolean;
  directDownloadEnabled?: boolean;
  directDownloadExpireSeconds?: number;
  maxFileSize?: number;
  chunkThreshold?: number;
  chunkSize?: number;
  allowedExtensions?: string;
  tempRetentionDays?: number;
}
