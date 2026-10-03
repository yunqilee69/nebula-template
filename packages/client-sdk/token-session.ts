/**
 * Token 会话<b>规则</b>（不是存储实现）。
 *
 * <p>三条不能被破坏的语义：
 * <ol>
 *   <li>`accessTokenExpiresIn` / `refreshTokenExpiresIn` 是 <b>绝对毫秒时间戳</b>，不是剩余秒数。
 *       按秒数计算会造成 token 提前失效或误判。</li>
 *   <li>`refreshToken` <b>单次有效</b>：刷新必须单飞（single-flight），刷新成功后旧 refreshToken 立即作废。</li>
 *   <li>清理规则：任一步失败都要能原子地清空整份会话，不留下半份 token。</li>
 * </ol>
 *
 * <p>存储实现（iOS Keychain / Android Keystore / localStorage / wx.setStorageSync）由各端各自提供，
 * 本文件只提供序列化与过期判定规则。</p>
 */
import type { LoginResp } from './types/auth.ts';

/** 一份完整会话。两个过期字段都是绝对毫秒时间戳。 */
export interface AuthTokenSession {
  accessToken: string;
  refreshToken: string;
  /** 绝对毫秒时间戳。 */
  accessTokenExpiresIn: number;
  /** 绝对毫秒时间戳。 */
  refreshTokenExpiresIn: number;
}

/** 默认时钟偏移：访问令牌在到期前 30s 即视为「需刷新」。 */
export const DEFAULT_ACCESS_TOKEN_SKEW_MS = 30_000;

function toFiniteNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * 归一化服务端登录响应为会话。
 *
 * <p>过期字段<b>原样当作绝对毫秒时间戳</b>使用，绝不按秒数换算。
 * token 缺失时返回 null（调用方据此判定登录失败）。</p>
 */
export function toAuthTokenSession(resp: Partial<LoginResp> | null | undefined): AuthTokenSession | null {
  if (!resp) return null;
  const accessToken = typeof resp.accessToken === 'string' ? resp.accessToken : '';
  const refreshToken = typeof resp.refreshToken === 'string' ? resp.refreshToken : '';
  if (!accessToken || !refreshToken) return null;
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: toFiniteNumber(resp.accessTokenExpiresIn),
    refreshTokenExpiresIn: toFiniteNumber(resp.refreshTokenExpiresIn),
  };
}

/** 访问令牌是否已过期（含时钟偏移）。 */
export function isAccessTokenExpired(
  session: AuthTokenSession,
  now: number = Date.now(),
  skewMs: number = DEFAULT_ACCESS_TOKEN_SKEW_MS,
): boolean {
  return now + skewMs >= session.accessTokenExpiresIn;
}

/** 刷新令牌是否已过期（不施加偏移，刷新窗口应尽量用满）。 */
export function isRefreshTokenExpired(
  session: AuthTokenSession,
  now: number = Date.now(),
  skewMs = 0,
): boolean {
  return now + skewMs >= session.refreshTokenExpiresIn;
}

/** 是否仍可用于刷新（refreshToken 存在且未过期）。 */
export function canRefreshSession(
  session: AuthTokenSession | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!session || !session.refreshToken) return false;
  return !isRefreshTokenExpired(session, now, 0);
}

/** 是否需要刷新访问令牌（已过期或落入偏移窗口）。 */
export function shouldRefreshAccessToken(
  session: AuthTokenSession | null | undefined,
  now: number = Date.now(),
  skewMs: number = DEFAULT_ACCESS_TOKEN_SKEW_MS,
): boolean {
  if (!session || !session.accessToken) return true;
  return isAccessTokenExpired(session, now, skewMs);
}

/** 会话整体是否仍可用：访问令牌未过期，或刷新令牌仍可刷新。 */
export function isSessionUsable(
  session: AuthTokenSession | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!session) return false;
  if (!isAccessTokenExpired(session, now)) return true;
  return canRefreshSession(session, now);
}

/**
 * 序列化为可持久化字符串（供各端安全存储落盘）。
 * accessToken 属于敏感数据，只允许写入 Keychain/Keystore 等安全存储。
 */
export function serializeAuthTokenSession(session: AuthTokenSession): string {
  return JSON.stringify({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    accessTokenExpiresIn: session.accessTokenExpiresIn,
    refreshTokenExpiresIn: session.refreshTokenExpiresIn,
  });
}

/** 从持久化字符串恢复会话；无法解析或字段缺失返回 null（fail-closed，不产生半份会话）。 */
export function parseAuthTokenSession(raw: string | null | undefined): AuthTokenSession | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const accessToken = typeof record.accessToken === 'string' ? record.accessToken : '';
  const refreshToken = typeof record.refreshToken === 'string' ? record.refreshToken : '';
  if (!accessToken || !refreshToken) return null;
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: toFiniteNumber(record.accessTokenExpiresIn),
    refreshTokenExpiresIn: toFiniteNumber(record.refreshTokenExpiresIn),
  };
}
