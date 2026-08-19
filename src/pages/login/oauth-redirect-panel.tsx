import { Button, Flex, Typography } from 'antd';
import { useState } from 'react';
import type { AuthService } from '@/api/auth';
import { prepareOAuthRedirect, type OAuthRedirectProvider } from './oauth-redirect';
import { redirectToAuthorizeUrl } from './wechat-redirect-navigation';

interface OAuthRedirectPanelProps {
  readonly authService: AuthService;
  readonly provider: OAuthRedirectProvider;
}

const redirectText: Record<OAuthRedirectProvider, { readonly description: string; readonly error: string; readonly button: string; readonly testId: string }> = {
  github: {
    description: '使用 GitHub 授权页面完成登录。',
    error: 'GitHub 登录发起失败，请稍后重试。',
    button: '跳转 GitHub 授权',
    testId: 'github-redirect-login',
  },
};

export function OAuthRedirectPanel({ authService, provider }: OAuthRedirectPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = redirectText[provider];

  const handleRedirectLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      redirectToAuthorizeUrl(await prepareOAuthRedirect(provider, authService));
    } catch (caught: unknown) {
      if (!(caught instanceof Error)) throw caught;
      setError(text.error);
      setLoading(false);
    }
  };

  return (
    <Flex vertical align="center" gap={12}>
      <Typography.Text type="secondary">{text.description}</Typography.Text>
      {error ? <Typography.Text type="danger" data-testid={`${text.testId}-error`}>{error}</Typography.Text> : null}
      <Button type="primary" block loading={loading} onClick={handleRedirectLogin} data-testid={text.testId}>
        {text.button}
      </Button>
    </Flex>
  );
}
