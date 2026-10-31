/**
 * 认证与会话契约，对应后端 `nebula-auth` 的 Req/Resp。
 *
 * <p>字段与服务端 DTO 严格一致，来源：
 * `LoginResp`、`CurrentUserResp`、`MenuTreeResp`、`LoginReq`、`RegisterReq`、
 * `RefreshTokenReq`、`PhoneLoginReq`、`EmailLoginReq`。</p>
 */

/** 登录响应。 */
export interface LoginResp {
  accessToken?: string;
  refreshToken?: string;
  /** 访问令牌过期时间戳（<b>绝对毫秒</b>，不是剩余秒数）。 */
  accessTokenExpiresIn?: number;
  /** 刷新令牌过期时间戳（<b>绝对毫秒</b>，不是剩余秒数）。 */
  refreshTokenExpiresIn?: number;
  bindingRequired?: boolean;
  bindingReason?: 'NO_LINK' | 'LINK_PENDING' | 'LINK_REVOKED';
  linkStatus?: 'NONE' | 'PENDING' | 'REVOKED';
  pendingApproval?: boolean;
  bindingTicket?: string;
  tenantCode?: string;
  proposedUsername?: string;
  proposedDisplayName?: string;
}

/** 登录后需要完成的平台账号绑定挑战。 */
export interface BindingChallenge {
  bindingTicket?: string;
  bindingReason: 'NO_LINK' | 'LINK_PENDING' | 'LINK_REVOKED';
  linkStatus?: 'NONE' | 'PENDING' | 'REVOKED';
  pendingApproval?: boolean;
  tenantCode?: string;
  proposedUsername?: string;
  proposedDisplayName?: string;
}

export interface CompleteBindingReq {
  bindingTicket: string;
  action: 'CREATE_NEW' | 'BIND_EXISTING';
  username?: string;
  displayName?: string;
  password?: string;
  account?: string;
  credential?: string;
}

export interface PersonSummary {
  id: string;
  username: string;
  displayName?: string;
  status: string;
  platformAdmin?: boolean;
}

export interface PersonTenant {
  tenantId: string;
  code: string;
  name: string;
  status: string;
  logo?: string;
  subdomain?: string;
  linkedAt?: string;
}

export interface PersonLink {
  id: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  userId: string;
  linkStatus: string;
  linkSource?: string;
  verifiedAt?: string;
  revokedAt?: string;
}

export interface TenantSummary {
  id: string;
  code: string;
  name: string;
  status: string;
  logo?: string;
  contactEmail?: string;
  settingsJson?: string;
  subdomain?: string;
  createTime?: string;
}

/** 密码登录请求（用户名或手机号）。 */
export interface LoginReq {
  username: string;
  password: string;
  captcha?: string;
  captchaKey?: string;
}

/** 用户名密码注册请求。 */
export interface RegisterReq {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
  email?: string;
}

/** 刷新 token 请求。refreshToken 单次有效。 */
export interface RefreshTokenReq {
  refreshToken: string;
}

/** 手机验证码登录请求。 */
export interface PhoneLoginReq {
  phone: string;
  code: string;
}

/** 邮箱验证码登录请求。 */
export interface EmailLoginReq {
  email: string;
  code: string;
}

/** 发送手机验证码请求。 */
export interface SendPhoneCodeReq {
  phone: string;
}

/** 发送邮箱验证码请求。 */
export interface SendEmailCodeReq {
  email: string;
}

/** 菜单类型。 */
export type MenuType = 'CATALOG' | 'MENU' | 'IFRAME' | 'EXTERNAL';

/** 菜单树节点，对应后端 `MenuTreeResp`。 */
export interface MenuTreeResp {
  id: string;
  parentId?: string;
  code: string;
  name: string;
  path?: string;
  icon?: string;
  component?: string;
  type?: MenuType | string;
  sort?: number;
  status?: number;
  hidden?: boolean;
  externalUrl?: string;
  visibleInBreadcrumb?: boolean;
  visibleInTab?: boolean;
  activeMenuPath?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
  children?: MenuTreeResp[];
}

/** 当前登录用户，对应后端 `CurrentUserResp`。含权限码与菜单树。 */
export interface CurrentUserResp {
  id: string;
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  personId?: string;
  platformAdmin?: boolean;
  username: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  orgCodeList?: string[];
  roleCodeList?: string[];
  /** 权限码列表，形如 `BUTTON:WMS_X_CREATE:Allow`、`MENU:code:Allow`。 */
  permissionCodeList?: string[];
  menuList?: MenuTreeResp[];
}
