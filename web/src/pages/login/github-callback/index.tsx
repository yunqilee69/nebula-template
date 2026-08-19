import { Alert, Button, Flex, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '@/layouts/auth-shell';
import { useNebulaLoginBadge } from '@/providers/login-badge-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { GitHubCallbackErrorCode, GitHubLoginStatusResp } from '@/types/auth';
import { toCurrentUser } from '@/utils/auth/current-user';
import { saveAuthTokens } from '@/utils/auth/token-session';
import { normalizeAuthReturnPath } from '../auth-return-path';

const callbackErrorMessages: Record<GitHubCallbackErrorCode, string> = {
  missing_callback_parameter: 'GitHub 回调参数缺失，请重新发起登录。',
  invalid_state: 'GitHub 登录状态无效，请重新发起登录。',
  expired_state: 'GitHub 登录已过期，请重新发起登录。',
  replayed_state: 'GitHub 登录结果已被领取，请重新发起登录。',
  provider_error: 'GitHub 授权失败，请稍后重试。',
};

function isCallbackErrorCode(value: string): value is GitHubCallbackErrorCode {
  return Object.prototype.hasOwnProperty.call(callbackErrorMessages, value);
}

function getFragmentSearch(hash: string): string {
  const queryStart = hash.indexOf('?');
  return queryStart >= 0 ? hash.slice(queryStart) : '';
}

function createCallbackSearchParams(location: ReturnType<typeof useLocation>): URLSearchParams {
  const search = location.search || getFragmentSearch(location.hash);
  return new URLSearchParams(search);
}

function getCallbackError(value: string | null): GitHubCallbackErrorCode | null {
  if (!value) return null;
  return isCallbackErrorCode(value) ? value : 'invalid_state';
}

export function GitHubCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const loginBadge = useNebulaLoginBadge();
  const { authService, onLoginSuccess } = loginBadge;
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在完成 GitHub 登录');

  const callbackParams = useMemo(() => createCallbackSearchParams(location), [location]);
  const loginId = callbackParams.get('loginId');
  const callbackError = getCallbackError(callbackParams.get('error'));

  const recoverLogin = useCallback(async (claimedStatus: GitHubLoginStatusResp) => {
    saveAuthTokens(claimedStatus);
    if (onLoginSuccess) {
      await onLoginSuccess(claimedStatus);
      setStatus('success');
      setMessage('GitHub 登录已完成');
      return;
    }

    if (authService) {
      const currentUser = await authService.getCurrentUser();
      setUser(toCurrentUser(currentUser));
    }
    navigate(normalizeAuthReturnPath(claimedStatus.returnPath), { replace: true });
  }, [authService, navigate, onLoginSuccess, setUser]);

  useEffect(() => {
    if (callbackError) {
      setStatus('error');
      setMessage(callbackErrorMessages[callbackError]);
      return;
    }

    if (!loginId) {
      setStatus('error');
      setMessage('GitHub 登录编号缺失，请重新发起登录。');
      return;
    }

    if (!authService) {
      setStatus('error');
      setMessage('当前认证服务不可用，请稍后重试。');
      return;
    }

    let active = true;

    authService.getGitHubLoginStatus(loginId)
      .then(async (result) => {
        if (!active) return;
        switch (result.status) {
          case 'SUCCESS':
            await recoverLogin(result);
            return;
          case 'WAITING':
          case 'SCANNED':
          case 'PROCESSING':
            setStatus('loading');
            setMessage('GitHub 授权已收到，正在等待登录结果');
            return;
          case 'FAILED':
            setStatus('error');
            setMessage('GitHub 登录失败，请重新发起登录。');
            return;
          case 'EXPIRED':
            setStatus('error');
            setMessage('GitHub 登录已过期，请重新发起登录。');
            return;
          case 'CONSUMED':
            setStatus('error');
            setMessage('GitHub 登录结果已被领取，请重新发起登录。');
            return;
        }
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (!(caught instanceof Error)) throw caught;
        setStatus('error');
        setMessage('GitHub 登录状态查询失败，请重新发起登录。');
      });

    return () => {
      active = false;
    };
  }, [authService, callbackError, loginId, recoverLogin]);

  return (
    <AuthShell>
      <Flex vertical align="center" gap={16}>
        {status === 'loading' ? (
          <Spin description={message}>
            <div data-testid="github-callback-loading" />
          </Spin>
        ) : null}
        {status === 'success' ? (
          <Alert type="success" showIcon title="GitHub 登录成功" description={message} data-testid="github-callback-success" />
        ) : null}
        {status === 'error' ? (
          <Alert type="error" showIcon title="GitHub 登录未完成" description={message} data-testid="github-callback-error" />
        ) : null}
        <Typography.Text type="secondary">没有收到登录结果时，可以返回登录页重新授权。</Typography.Text>
        <Button type="primary">
          <Link to="/login">返回登录页</Link>
        </Button>
      </Flex>
    </AuthShell>
  );
}
