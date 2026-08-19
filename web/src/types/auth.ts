import type { ReactNode } from 'react';
import type { AuthService } from '@/api/auth';
import type { BackendMenuItem } from '@/route/types';

export interface CurrentUser {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  avatarPreview?: string;
  roles: string[];
  permissions: string[];
  organizations?: Organization[];
  currentOrganizationId?: string;
  menuList?: BackendMenuItem[];
  preferences?: UserPreferences;
}

export interface Organization {
  id: string;
  name: string;
  code?: string;
}

export interface UserPreferences {
  themeMode?: 'light' | 'dark';
  compactMode?: boolean;
}

export interface AuthAdapter {
  getCurrentUser: () => Promise<CurrentUser | null>;
  onUnauthorized?: () => void;
}

export interface NebulaLoginBadgeContextValue {
  loginPath: string;
  registerPath: string;
  defaultLoginMethods: BuiltInLoginMethodKey[];
  extraLoginBadges: NebulaExtraLoginBadge[];
  authService?: AuthService;
  onLoginSuccess?: (response: LoginResp | GitHubLoginStatusResp) => void | Promise<void>;
  onLogoutSuccess?: () => void | Promise<void>;
  onRegisterSuccess?: () => void | Promise<void>;
}

export interface NebulaExtraLoginBadgeRenderContext {
  onSuccess: (response?: LoginResp | GitHubLoginStatusResp) => void | Promise<void>;
  loginBadge: NebulaLoginBadgeContextValue;
}

export interface NebulaExtraLoginBadge {
  key: string;
  label: string;
  render: (ctx: NebulaExtraLoginBadgeRenderContext) => ReactNode;
}

export interface LoginBadgeOptions {
  loginPath?: string;
  registerPath?: string;
  defaultLoginMethods?: BuiltInLoginMethodKey[];
  extraLoginBadges?: NebulaExtraLoginBadge[];
  authService?: AuthService;
  onLoginSuccess?: (response: LoginResp | GitHubLoginStatusResp) => void | Promise<void>;
  onLogoutSuccess?: () => void | Promise<void>;
  onRegisterSuccess?: () => void | Promise<void>;
}

export interface ApiResult<T> {
  code: string;
  message: string;
  data: T;
}

export interface AuthInitResp {
  usernameEnabled?: boolean;
  phoneEnabled?: boolean;
  emailEnabled?: boolean;
  usernameRegisterAllowed?: boolean;
  usernamePasswordMinLength?: number;
  usernamePasswordMaxLength?: number;
  phoneRegisterAllowed?: boolean;
  phoneCodeExpireMinutes?: number;
  phoneSendIntervalSeconds?: number;
  emailRegisterAllowed?: boolean;
  emailCodeExpireMinutes?: number;
  emailSendIntervalSeconds?: number;
  oauth2Enabled?: boolean;
  oauth2RegisterAllowed?: boolean;
  githubEnabled?: boolean;
}

export interface FrontendConfigResp {
  projectName?: string;
  layoutMode?: string;
  defaultThemeCode?: string;
  defaultLocale?: string;
  localeOptions?: string[];
}

export interface FrontendPreferenceResp {
  localeTag?: string;
  themeCode?: string;
  navigationLayoutCode?: string;
  sidebarLayoutCode?: string;
}

export interface FrontendThemeResp {
  themeCode?: string;
  themeName?: string;
  builtinFlag?: boolean;
  themeConfig?: Record<string, string>;
}

export interface FrontendInitResp {
  frontendConfig?: FrontendConfigResp;
  loginConfig?: AuthInitResp;
  defaultPreference?: FrontendPreferenceResp;
  defaultTheme?: FrontendThemeResp;
}

export interface LoginReq {
  username: string;
  password: string;
  autoLogin?: boolean;
}

export interface LoginResp {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export interface RegisterReq {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
  email?: string;
}

export interface PhoneLoginReq {
  phone: string;
  code: string;
}

export interface EmailLoginReq {
  email: string;
  code: string;
}

export interface SendPhoneCodeReq {
  phone: string;
}

export interface SendEmailCodeReq {
  email: string;
}

export interface ForgotPasswordSendCodeReq {
  identity: string;
}

export interface ForgotPasswordVerifyCodeReq {
  identity: string;
  code: string;
}

export interface ForgotPasswordVerifyCodeResp {
  passwordChangeToken: string;
  expiresInSeconds: number;
}

export interface ForgotPasswordChangeReq {
  passwordChangeToken: string;
  newPassword: string;
}

export interface RefreshTokenReq {
  refreshToken: string;
}

export interface CurrentUserResp {
  id: string;
  username?: string;
  nickname?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  orgCodeList?: string[];
  roleCodeList?: string[];
  permissionCodeList?: string[];
  menuList?: BackendMenuItem[];
}

export type GitHubLoginStatus = 'WAITING' | 'SCANNED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CONSUMED';

export type GitHubCallbackErrorCode =
  | 'missing_callback_parameter'
  | 'invalid_state'
  | 'expired_state'
  | 'replayed_state'
  | 'provider_error';

export interface GitHubRedirectPrepareReq {
  redirectAfterLogin?: string;
}

export interface GitHubRedirectPrepareResp {
  loginId: string;
  state: string;
  status: GitHubLoginStatus;
  authorizeUrl: string;
}

export interface GitHubLoginStatusResp {
  loginId: string;
  status: GitHubLoginStatus;
  state: string;
  loginResult?: LoginResp;
  returnPath?: string;
}

export interface GitHubCallbackReq {
  code: string;
  state: string;
}

export interface GitHubCallbackResp {
  loginId: string;
  status: GitHubLoginStatus;
  returnPath?: string;
  errorCode?: GitHubCallbackErrorCode;
}

export type BuiltInLoginMethodKey = 'password' | 'phone' | 'email' | 'github';
