import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '@/api/auth';
import { ControlApiError, setUnauthorizedHandler } from '@/lib/http';
import { clearTokens, getStoredAccessToken, getStoredRefreshToken, saveTokens } from '@/lib/token';
import type { CurrentUser, LoginRequest } from '@/types';

type AuthStatus = 'booting' | 'anonymous' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  login: (values: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function isSuperAdmin(user: CurrentUser | null): boolean {
  return user?.sessionType === 'PLATFORM' && Boolean(user.platformAdmin);
}

async function loadAuthorizedUser(): Promise<CurrentUser> {
  const user = await authApi.currentUser();
  if (!isSuperAdmin(user)) {
    throw new ControlApiError('该账号不是超级管理员，无权登录控制台。', 'SUPERADMIN_REQUIRED');
  }
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [user, setUser] = useState<CurrentUser | null>(null);

  const clearSession = useCallback(() => {
    clearTokens();
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hasToken = Boolean(getStoredAccessToken() || getStoredRefreshToken());
    if (!hasToken) {
      setStatus('anonymous');
      return;
    }

    void (async () => {
      try {
        const current = await loadAuthorizedUser();
        if (!cancelled) {
          setUser(current);
          setStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          try {
            if (getStoredAccessToken()) {
              await authApi.logout();
            }
          } catch {
            // 令牌可能已失效，忽略退出失败，仍然清空本地会话。
          }
          clearSession();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(async (values: LoginRequest) => {
    const result = await authApi.login(values);

    if (result.bindingRequired) {
      throw new ControlApiError('该账号尚未完成平台账号绑定，无法登录控制台。', 'PERSON_BINDING_REQUIRED');
    }
    if (!result.accessToken) {
      throw new ControlApiError('登录失败，请检查账号或密码。', 'LOGIN_FAILED');
    }

    saveTokens(result);

    try {
      const current = await loadAuthorizedUser();
      setUser(current);
      setStatus('authenticated');
    } catch (error) {
      // 非超级管理员即使认证成功也必须立即退出，避免留下可用的控制平面会话。
      try {
        await authApi.logout();
      } catch {
        // 忽略退出失败，下面仍会清空本地令牌。
      }
      clearTokens();
      setUser(null);
      setStatus('anonymous');
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getStoredAccessToken()) {
        await authApi.logout();
      }
    } catch {
      // 退出接口失败也必须清空本地会话，避免控制台停留在半登录状态。
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout }),
    [login, logout, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}

export { getStoredAccessToken, getStoredRefreshToken };
