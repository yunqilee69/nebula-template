import {
  canRefreshSession,
  isSessionUsable,
  parseAuthTokenSession,
  serializeAuthTokenSession,
  shouldRefreshAccessToken,
  toAuthTokenSession,
  type AuthTokenSession,
  type LoginResp,
} from '../../../packages/client-sdk/index.ts';
import { TOKEN_SESSION_STORAGE_KEY, type SecureTokenStorage } from './secure-storage.ts';

/** 会话管理器。规则来自 `@nebula/client-sdk/token-session`，此处只负责与安全存储交互。 */
export interface SessionManager {
  /** 启动恢复：从安全存储读回会话；无/损坏返回 null。 */
  restore(): Promise<AuthTokenSession | null>;
  get(): AuthTokenSession | null;
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  /** 登录/刷新成功：归一化并落安全存储。token 缺失返回 null 且不落盘。 */
  save(response: Partial<LoginResp>): Promise<AuthTokenSession | null>;
  /** 清理：原子清空内存与存储，不留半份 token。 */
  clear(): Promise<void>;
  isUsable(now?: number): boolean;
  canRefresh(now?: number): boolean;
  shouldRefresh(now?: number): boolean;
}

export function createSessionManager(storage: SecureTokenStorage): SessionManager {
  let session: AuthTokenSession | null = null;

  return {
    async restore() {
      const raw = await storage.getItem(TOKEN_SESSION_STORAGE_KEY);
      session = parseAuthTokenSession(raw);
      return session;
    },
    get() {
      return session;
    },
    getAccessToken() {
      return session?.accessToken ?? null;
    },
    getRefreshToken() {
      return session?.refreshToken ?? null;
    },
    async save(response) {
      const next = toAuthTokenSession(response);
      if (!next) return null;
      session = next;
      await storage.setItem(TOKEN_SESSION_STORAGE_KEY, serializeAuthTokenSession(next));
      return next;
    },
    async clear() {
      session = null;
      await storage.removeItem(TOKEN_SESSION_STORAGE_KEY);
    },
    isUsable(now) {
      return isSessionUsable(session, now);
    },
    canRefresh(now) {
      return canRefreshSession(session, now);
    },
    shouldRefresh(now) {
      return shouldRefreshAccessToken(session, now);
    },
  };
}
