/**
 * 认证与会话契约，对应后端 `nebula-auth` 的 Req/Resp。
 *
 * <p>字段与服务端 DTO 严格一致，来源：
 * `LoginResp`、`CurrentUserResp`、`MenuTreeResp`、`LoginReq`、`RefreshTokenReq`、
 * `PhoneLoginReq`、`EmailLoginReq`。</p>
 */

/** 登录响应。 */
export interface LoginResp {
  accessToken: string;
  refreshToken: string;
  /** 访问令牌过期时间戳（<b>绝对毫秒</b>，不是剩余秒数）。 */
  accessTokenExpiresIn: number;
  /** 刷新令牌过期时间戳（<b>绝对毫秒</b>，不是剩余秒数）。 */
  refreshTokenExpiresIn: number;
}

/** 密码登录请求（用户名或手机号）。 */
export interface LoginReq {
  username: string;
  password: string;
  captcha?: string;
  captchaKey?: string;
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
