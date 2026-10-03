import {
  AUTH_ENDPOINTS,
  type AuthTokenSession,
  type FrontendLoginConfigResp,
  type LoginReq,
  type LoginResp,
} from '../../../packages/client-sdk/index.ts';
import type { RequestConfig } from '../request/types.ts';

/**
 * 登录 / 登出 / 登录配置服务。
 *
 * <p>语义要点：
 * <ul>
 *   <li>登录成功后<b>必须</b>把响应落安全存储（由注入的 `session.save` 负责），
 *       落盘失败（响应缺 token）视为登录失败，不留下半份会话；</li>
 *   <li>登出先尽力调用服务端 `/api/auth/logout`（使服务端失效），
 *       <b>无论成败</b>都清空本地会话——否则用户会卡在「已登出但本地还能用」的状态；</li>
 *   <li>登录页配置来自 `GET /api/auth/get-auth-config`，与 `init.loginConfig` 同构，
 *       便于 `init` 兜底后仍能拿到权威开关。</li>
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

export interface LoginService {
  /** 登录并落盘会话；失败抛错（携带服务端本地化文案）。 */
  login(credentials: LoginCredentials): Promise<AuthTokenSession>;
  /** 登出：服务端失效尽力而为，本地会话必清。 */
  logout(): Promise<void>;
  /** 拉取权威登录开关（含验证码/OAuth2 等）。 */
  fetchAuthConfig(): Promise<FrontendLoginConfigResp | null>;
}

/** 登录表单本地校验结果。 */
export interface LoginInputValidation {
  ok: boolean;
  message?: string;
}

/**
 * 本地校验登录输入：只拦「空」。
 * 长度/复杂度由服务端判定，客户端不重复实现，避免与服务端口径漂移。
 */
export function validateLoginInput(credentials: Partial<LoginCredentials>): LoginInputValidation {
  const username = credentials.username?.trim() ?? '';
  const password = credentials.password ?? '';
  if (!username) return { ok: false, message: '请输入用户名' };
  if (!password) return { ok: false, message: '请输入密码' };
  return { ok: true };
}

/** 该端是否开放用户名密码登录（缺失配置按开放处理，服务端仍会把关）。 */
export function isUsernameLoginEnabled(config: FrontendLoginConfigResp | null | undefined): boolean {
  return config?.usernameEnabled !== false;
}

export function createLoginService(deps: LoginServiceDeps): LoginService {
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

      const session = await deps.session.save(response);
      if (!session) throw new Error('登录响应缺少令牌，请稍后重试');
      return session;
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
