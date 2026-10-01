import { Alert, Button, Flex, Spin, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthService } from '@/api/auth';
import type { WechatWebStatusResp } from '@/types/auth';
import { getCurrentAuthReturnPath } from './auth-return-path';
import { WECHAT_WEB_POLL_INTERVAL_MS, WECHAT_WEB_TOTAL_WAIT_MS, nextWechatWebPollDecision } from './wechat-web-polling';

interface WechatWebPanelProps {
  readonly authService: AuthService;
  readonly onSuccess: (result: WechatWebStatusResp) => void | Promise<void>;
}

type PanelStatus = 'preparing' | 'scanning' | 'success' | 'error';

/**
 * 微信扫码登录面板。
 *
 * prepare 返回的 qrconnect 授权页整页即二维码，直接嵌入 iframe（与微信 WxLogin
 * JS SDK 的内嵌形态等价），主页面按 loginId 轮询 /web/status 等待登录结果。
 */
export function WechatWebPanel({ authService, onSuccess }: WechatWebPanelProps) {
  const [panelStatus, setPanelStatus] = useState<PanelStatus>('preparing');
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loginIdRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    authService
      .prepareWechatWebRedirect({ redirectAfterLogin: getCurrentAuthReturnPath() })
      .then((result) => {
        if (cancelled) return;
        loginIdRef.current = result.loginId;
        setAuthorizeUrl(result.authorizeUrl);
        setPanelStatus('scanning');
      })
      .catch(() => {
        if (cancelled) return;
        setPanelStatus('error');
        setErrorText('微信登录发起失败，请稍后重试。');
      });

    return () => {
      cancelled = true;
    };
  }, [authService, reloadKey]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    if (panelStatus !== 'scanning' || !authorizeUrl) {
      return;
    }

    let active = true;
    const startedAt = Date.now();

    const poll = async () => {
      try {
        const result = await authService.getWechatWebLoginStatus(loginIdRef.current);
        if (!active) return;
        const elapsed = Date.now() - startedAt;
        const decision = nextWechatWebPollDecision(result.status, elapsed);
        if (decision === 'continue') return;
        stopPolling();
        if (decision === 'stop-success' && result.loginResult) {
          setPanelStatus('success');
          await onSuccess(result);
          return;
        }
        setPanelStatus('error');
        setErrorText(decision === 'stop-failed' ? '微信授权失败，请重新扫码。' : '微信登录已过期，请重新扫码。');
      } catch {
        // 单次轮询失败不终止流程，等待下一轮；超过总时长由 nextWechatWebPollDecision 收口
        if (Date.now() - startedAt >= WECHAT_WEB_TOTAL_WAIT_MS) {
          stopPolling();
          if (active) {
            setPanelStatus('error');
            setErrorText('微信登录状态查询失败，请重新扫码。');
          }
        }
      }
    };

    pollTimerRef.current = setInterval(() => {
      void poll();
    }, WECHAT_WEB_POLL_INTERVAL_MS);

    return () => {
      active = false;
      stopPolling();
    };
  }, [authService, authorizeUrl, onSuccess, panelStatus, stopPolling]);

  const handleRetry = () => {
    setPanelStatus('preparing');
    setAuthorizeUrl(null);
    setErrorText(null);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <Flex vertical align="center" gap={12} data-testid="wechat-web-panel">
      {panelStatus === 'preparing' ? <Spin data-testid="wechat-web-preparing" /> : null}
      {panelStatus === 'error' ? (
        <>
          <Typography.Text type="danger" data-testid="wechat-web-error">{errorText}</Typography.Text>
          <Button type="primary" onClick={handleRetry} data-testid="wechat-web-retry">
            重新扫码
          </Button>
        </>
      ) : null}
      {panelStatus === 'scanning' && authorizeUrl ? (
        <>
          <Alert type="info" showIcon title="请使用微信扫描二维码完成登录" data-testid="wechat-web-scanning" />
          <iframe
            title="微信扫码登录"
            src={authorizeUrl}
            data-testid="wechat-web-iframe"
            style={{ width: 300, height: 400, border: 'none', borderRadius: 8 }}
          />
        </>
      ) : null}
      {panelStatus === 'success' ? <Alert type="success" showIcon title="微信登录成功" data-testid="wechat-web-success" /> : null}
    </Flex>
  );
}
