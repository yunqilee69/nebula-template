/** 租户登录页品牌配置。 */
export interface TenantBrandingConfig {
  loginTitle?: string;
  loginSubtitle?: string;
  themeColor?: string;
  favicon?: string;
  loginBackground?: string;
  footerCopyright?: string;
  footerIcp?: string;
  footerContactEmail?: string;
  footerContactPhone?: string;
  footerWebsite?: string;
}

/**
 * 登录页品牌文字项（企业资料接口）。
 *
 * <p>图片资源位（favicon / 背景图）不在资料响应里回传地址：
 * 上传组件按 `sourceEntity=tenant-profile` + `sourceType=<资源位>` 自行解析下载地址。
 * 登录页需要的图片地址由 `/api/frontend/init`（{@link TenantBrandingDto}）提供；
 * 登录页 Logo 直接复用企业 Logo（`auth_tenant.logo`），不再单独配置。</p>
 */
export interface TenantProfileBranding {
  loginTitle?: string;
  loginSubtitle?: string;
  themeColor?: string;
  footerCopyright?: string;
  footerIcp?: string;
  footerContactEmail?: string;
  footerContactPhone?: string;
  footerWebsite?: string;
}

/** 前端初始化下发的租户品牌与只读信息。 */
export interface TenantBranding {
  tenantId?: string;
  code?: string;
  name?: string;
  shortName?: string;
  logo?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  industry?: string;
  description?: string;
  locale?: string;
  timezone?: string;
  branding?: TenantBrandingConfig;
  status?: string;
}

/** 当前租户域名。 */
export interface TenantProfileDomain {
  id: string;
  tenantId: string;
  domain: string;
  primaryDomain?: number;
  status: string;
  verifiedAt?: string;
}

/** 当前租户资料。 */
export interface TenantProfile {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  status: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  industry?: string;
  description?: string;
  locale?: string;
  timezone?: string;
  branding?: TenantProfileBranding;
  domains: TenantProfileDomain[];
  createTime?: string;
  updateTime?: string;
}

/** 企业资料图片资源位标识，与后端 `uploadTaskIds` 的 key 一致。 */
export type TenantAssetSlot = 'logo' | 'favicon' | 'login-background';

/**
 * 企业资料图各资源位待提交的上传任务 id。
 *
 * <p>每个资源位都是单值：每个 key 的数组恰好 1 个元素；图片最终地址由保存接口返回。</p>
 */
export type TenantAssetUploadTaskIds = Partial<Record<TenantAssetSlot, string[]>>;

/** 可提交的租户品牌字段：图片资源位走 `uploadTaskIds`，不提交地址。 */
export type UpdateTenantBrandingReq = TenantProfileBranding;

/** 更新当前租户资料的请求。 */
export interface UpdateTenantProfileReq {
  name: string;
  shortName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  industry?: string;
  description?: string;
  locale?: string;
  timezone?: string;
  branding?: UpdateTenantBrandingReq;
  /** 企业资料图的上传任务；绑定由保存接口完成。 */
  uploadTaskIds?: TenantAssetUploadTaskIds;
  /** 本次要删除（换图后弃用）的正式文件 ID：后端先绑定新图，再释放这些文件的引用。 */
  deletedFileIds?: string[];
}
