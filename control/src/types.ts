export interface PageResult<T> {
  data: T[];
  total: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresIn?: number;
  refreshTokenExpiresIn?: number;
  bindingRequired?: boolean;
  bindingReason?: string;
  linkStatus?: string;
  pendingApproval?: boolean;
  bindingTicket?: string;
  tenantCode?: string;
}

export interface CurrentUser {
  id?: string;
  sessionType?: string;
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  personId?: string;
  platformAdmin?: boolean;
  username?: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  roleCodeList?: string[];
}

export interface TenantBrandingConfig {
  loginLogo?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  themeColor?: string;
  favicon?: string;
  loginBackground?: string;
}

export interface Tenant {
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
  settingsJson?: string;
  createTime?: string;
  updateTime?: string;
}

export interface TenantDomain {
  id: string;
  tenantId: string;
  domain: string;
  primaryDomain?: number;
  status: string;
  verifiedAt?: string;
}

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email?: string;
  phone?: string;
  roleId?: string;
  orgId?: string;
  status: string;
  expiresAt?: string;
  acceptedAt?: string;
  token?: string;
}

export interface PersonTenant {
  tenantId: string;
  code: string;
  name: string;
  status: string;
  logo?: string;
  subdomain?: string;
  linkedAt?: string;
  linkStatus?: string;
  userId?: string;
  username?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  userStatus?: number;
  roleNames?: string[];
  orgNames?: string[];
}

export interface PlatformPerson {
  id: string;
  username: string;
  displayName?: string;
  status: string;
  platformAdmin?: boolean;
  lastLoginTime?: string;
  createTime?: string;
  tenantCount?: number;
  tenants?: PersonTenant[];
}
