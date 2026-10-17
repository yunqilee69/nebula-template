import {
  AUTH_ENDPOINTS,
  type AuthTokenSession,
  type EmailLoginReq,
  type FrontendLoginConfigResp,
  type LoginReq,
  type LoginResp,
  type PhoneLoginReq,
  type RegisterReq,
  type SendEmailCodeReq,
  type SendPhoneCodeReq,
} from '../../../packages/client-sdk/index.ts';
import type { RequestConfig } from '../request/types.ts';

/**
 * 登录 / 注册 / 登出 / 登录配置服务。
 *
 * <p>语义要点：
 * <ul>
 *   <li>登录成功后<b>必须</b>把响应落安全存储（由注入的 `session.save` 负责），
 *       落盘失败（响应缺 token）视为登录失败，不留下半份会话；</li>
 *   <li>登出先尽力调用服务端 `/api/auth/logout`（使服务端失效），
 *       <b>无论成败</b>都清空本地会话——否则用户会卡在「已登出但本地还能用」的状态；</li>
 *   <li>登录页配置来自 `GET /api/auth/get-auth-config`，与 `init.loginConfig` 同构，
 *       便于 `init` 兜底后仍能拿到权威开关；</li>
 *   <li>手机号 / 邮箱验证码登录在服务端支持「首次登录自动建号」：
 *       `login.phone.allow-register` / `login.email.allow-register` 为 true 时，
 *       未注册的手机号或邮箱验证通过后会直接创建账号，不需要再走注册接口。</li>
 * </ul></p>
 *
 * <p>密码长度类参数（`usernamePasswordMinLength` 等）是<b>注册</b>口径，
 * 不在登录侧做长度校验——否则会拦掉历史遗留的短密码账号。</p>
 */

export interface LoginSessionStore {
  save(response: Partial<LoginResp>): Promise<AuthTokenSession | null>;
  clear(): Promise<void>;
}

export interface LoginServiceDeps {
  request: <T>(config: RequestConfig) => Promise<T>;
  session: LoginSessionStore;
}

export interface LoginCredentials {
  username: string;
  password: string;
  captcha?: string;
  captchaKey?: string;
}

export interface PhoneLoginCredentials {
  phone: string;
  code: string;
}

export interface EmailLoginCredentials {
  email: string;
  code: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
}

/** 注册表单输入：`confirmPassword` 只用于本地一致性校验，不发往服务端。 */
export interface RegisterFormInput {
  username?: string;
  password?: string;
  confirmPassword?: string;
}

export interface LoginService {
  /** 用户名 / 手机号 + 密码登录。 */
  login(credentials: LoginCredentials): Promise<AuthTokenSession>;
  /** 手机号 + 验证码登录（首次登录是否自动建号由服务端开关决定）。 */
  phoneLogin(credentials: PhoneLoginCredentials): Promise<AuthTokenSession>;
  /** 邮箱 + 验证码登录（首次登录是否自动建号由服务端开关决定）。 */
  emailLogin(credentials: EmailLoginCredentials): Promise<AuthTokenSession>;
  /** 发送手机验证码。 */
  sendPhoneCode(phone: string): Promise<void>;
  /** 发送邮箱验证码。 */
  sendEmailCode(email: string): Promise<void>;
  /** 用户名密码注册；返回服务端创建的用户 ID。 */
  register(credentials: RegisterCredentials): Promise<string>;
  /** 登出：服务端失效尽力而为，本地会话必清。 */
  logout(): Promise<void>;
  /** 拉取权威登录开关（含验证码/OAuth2 等）。 */
  fetchAuthConfig(): Promise<FrontendLoginConfigResp | null>;
}

/** 登录/注册表单本地校验结果。 */
export interface LoginInputValidation {
  ok: boolean;
  message?: string;
}

/**
 * 本地校验用户名密码登录：只拦「空」。
 * 长度/复杂度由服务端判定，客户端不重复实现，避免与服务端口径漂移。
 */
export function validateLoginInput(credentials: Partial<LoginCredentials>): LoginInputValidation {
  const username = credentials.username?.trim() ?? '';
  const password = credentials.password ?? '';
  if (!username) return { ok: false, message: '请输入用户名' };
  if (!password) return { ok: false, message: '请输入密码' };
  return { ok: true };
}

/** 本地校验手机号验证码登录：只拦「空」，格式由服务端判定。 */
export function validatePhoneLoginInput(credentials: Partial<PhoneLoginCredentials>): LoginInputValidation {
  if (!credentials.phone?.trim()) return { ok: false, message: '请输入手机号' };
  if (!credentials.code?.trim()) return { ok: false, message: '请输入验证码' };
  return { ok: true };
}

/** 本地校验邮箱验证码登录：只拦「空」，格式由服务端判定。 */
export function validateEmailLoginInput(credentials: Partial<EmailLoginCredentials>): LoginInputValidation {
  if (!credentials.email?.trim()) return { ok: false, message: '请输入邮箱' };
  if (!credentials.code?.trim()) return { ok: false, message: '请输入验证码' };
  return { ok: true };
}

/** 发送手机验证码前的本地校验。 */
export function validateSendPhoneCodeInput(phone: string | undefined | null): LoginInputValidation {
  if (!phone?.trim()) return { ok: false, message: '请输入手机号' };
  return { ok: true };
}

/** 发送邮箱验证码前的本地校验。 */
export function validateSendEmailCodeInput(email: string | undefined | null): LoginInputValidation {
  if (!email?.trim()) return { ok: false, message: '请输入邮箱' };
  return { ok: true };
}

/**
 * 本地校验注册输入。
 *
 * <p>用户名格式由服务端判定；密码长度使用服务端下发的注册口径，
 * 避免用户在提交后才看到长度错误。</p>
 */
export function validateRegisterInput(
  input: RegisterFormInput,
  config?: FrontendLoginConfigResp | null,
): LoginInputValidation {
  const username = input.username?.trim() ?? '';
  const password = input.password ?? '';
  if (!username) return { ok: false, message: '请输入用户名' };
  if (!password) return { ok: false, message: '请输入密码' };
  if (input.confirmPassword !== undefined && password !== input.confirmPassword) {
    return { ok: false, message: '两次密码不一致' };
  }

  const min = config?.usernamePasswordMinLength;
  if (typeof min === 'number' && min > 0 && password.length < min) {
    return { ok: false, message: `密码长度不能少于${min}位` };
  }
  const max = config?.usernamePasswordMaxLength;
  if (typeof max === 'number' && max > 0 && password.length > max) {
    return { ok: false, message: `密码长度不能超过${max}位` };
  }
  return { ok: true };
}

/** 该端是否开放用户名密码登录（缺失配置按开放处理，服务端仍会把关）。 */
export function isUsernameLoginEnabled(config: FrontendLoginConfigResp | null | undefined): boolean {
  return config?.usernameEnabled !== false;
}

/** 该端是否开放手机号验证码登录（缺失配置按关闭处理）。 */
export function isPhoneLoginEnabled(config: FrontendLoginConfigResp | null | undefined): boolean {
  return config?.phoneEnabled === true;
}

/** 该端是否开放邮箱验证码登录（缺失配置按关闭处理）。 */
export function isEmailLoginEnabled(config: FrontendLoginConfigResp | null | undefined): boolean {
  return config?.emailEnabled === true;
}

/** 手机号首次验证码登录是否会自动建号。 */
export function isPhoneRegisterAllowed(config: FrontendLoginConfigResp | null | undefined): boolean {
  return config?.phoneRegisterAllowed === true;
}

/** 邮箱首次验证码登录是否会自动建号。 */
export function isEmailRegisterAllowed(config: FrontendLoginConfigResp | null | undefined): boolean {
  return config?.emailRegisterAllowed === true;
}

/** 是否允许用户名密码自助注册。 */
export function isUsernameRegisterAllowed(config: FrontendLoginConfigResp | null | undefined): boolean {
  return config?.usernameRegisterAllowed === true;
}

/** 登录页表单类登录方式。 */
export type FormLoginMethod = 'phone' | 'username' | 'email';

/**
 * 按服务端开关计算可用表单登录方式。
 *
 * <p>顺序即优先级：手机号 → 账号密码 → 邮箱。配置缺失时只保留用户名密码，
 * 与 `createFallbackLoginConfig()` 的保守兜底一致。</p>
 */
export function getEnabledFormLoginMethods(
  config: FrontendLoginConfigResp | null | undefined,
): FormLoginMethod[] {
  const methods: FormLoginMethod[] = [];
  if (isPhoneLoginEnabled(config)) methods.push('phone');
  if (isUsernameLoginEnabled(config)) methods.push('username');
  if (isEmailLoginEnabled(config)) methods.push('email');
  return methods;
}

export function createLoginService(deps: LoginServiceDeps): LoginService {
  async function persistLogin(response: LoginResp): Promise<AuthTokenSession> {
    const session = await deps.session.save(response);
    if (!session) throw new Error('登录响应缺少令牌，请稍后重试');
    return session;
  }

  return {
    async login(credentials) {
      const validation = validateLoginInput(credentials);
      if (!validation.ok) throw new Error(validation.message ?? '登录参数不完整');

      const body: LoginReq = {
        username: credentials.username.trim(),
        password: credentials.password,
      };
      if (credentials.captcha !== undefined) body.captcha = credentials.captcha;
      if (credentials.captchaKey !== undefined) body.captchaKey = credentials.captchaKey;

      const response = await deps.request<LoginResp>({
        method: 'POST',
        url: AUTH_ENDPOINTS.login,
        data: body,
      });

      return persistLogin(response);
    },

    async phoneLogin(credentials) {
      const validation = validatePhoneLoginInput(credentials);
      if (!validation.ok) throw new Error(validation.message ?? '登录参数不完整');

      const body: PhoneLoginReq = {
        phone: credentials.phone.trim(),
        code: credentials.code.trim(),
      };
      const response = await deps.request<LoginResp>({
        method: 'POST',
        url: AUTH_ENDPOINTS.phoneLogin,
        data: body,
      });

      return persistLogin(response);
    },

    async emailLogin(credentials) {
      const validation = validateEmailLoginInput(credentials);
      if (!validation.ok) throw new Error(validation.message ?? '登录参数不完整');

      const body: EmailLoginReq = {
        email: credentials.email.trim(),
        code: credentials.code.trim(),
      };
      const response = await deps.request<LoginResp>({
        method: 'POST',
        url: AUTH_ENDPOINTS.emailLogin,
        data: body,
      });

      return persistLogin(response);
    },

    async sendPhoneCode(phone) {
      const validation = validateSendPhoneCodeInput(phone);
      if (!validation.ok) throw new Error(validation.message ?? '请输入手机号');

      const body: SendPhoneCodeReq = { phone: phone.trim() };
      await deps.request<void>({
        method: 'POST',
        url: AUTH_ENDPOINTS.sendPhoneCode,
        data: body,
      });
    },

    async sendEmailCode(email) {
      const validation = validateSendEmailCodeInput(email);
      if (!validation.ok) throw new Error(validation.message ?? '请输入邮箱');

      const body: SendEmailCodeReq = { email: email.trim() };
      await deps.request<void>({
        method: 'POST',
        url: AUTH_ENDPOINTS.sendEmailCode,
        data: body,
      });
    },

    async register(credentials) {
      const validation = validateRegisterInput(credentials);
      if (!validation.ok) throw new Error(validation.message ?? '注册参数不完整');

      const body: RegisterReq = {
        username: credentials.username.trim(),
        password: credentials.password,
      };
      return deps.request<string>({
        method: 'POST',
        url: AUTH_ENDPOINTS.register,
        data: body,
      });
    },

    async logout() {
      try {
        await deps.request<void>({ method: 'POST', url: AUTH_ENDPOINTS.logout });
      } catch {
        // 服务端登出失败不阻塞本地登出：token 过期/网络异常时用户仍必须能退出。
      } finally {
        await deps.session.clear();
      }
    },

    fetchAuthConfig() {
      return deps.request<FrontendLoginConfigResp>({
        method: 'GET',
        url: AUTH_ENDPOINTS.getAuthConfig,
      });
    },
  };
}
