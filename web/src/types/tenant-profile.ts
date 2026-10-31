/** 租户登录页品牌配置。 */
export interface TenantBrandingConfig {
  loginLogo?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  themeColor?: string;
  favicon?: string;
  loginBackground?: string;
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
  domains: TenantProfileDomain[];
  createTime?: string;
  updateTime?: string;
}

/** 更新当前租户资料的请求。 */
export interface UpdateTenantProfileReq {
  name: string;
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
}
