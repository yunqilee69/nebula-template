import { Alert, App, Button, Flex, Spin, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthShell } from '@/layouts/auth-shell';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { profileService as defaultProfileService } from '@/api/profile';
import { redirectToAuthorizeUrl } from '@/pages/login/wechat-redirect-navigation';
import type { ProfileService } from '@/api/profile';
import type { BindOAuth2Req, BindOAuth2Resp } from '@/types/profile';

export interface ProfileBindCallbackPageProps {
  service?: ProfileService;
}

const bindRequestPromises = new WeakMap<ProfileService, Map<string, Promise<BindOAuth2Resp>>>();

function createBindRequestKey(request: BindOAuth2Req): string {
  return `${encodeURIComponent(request.providerId)}:${encodeURIComponent(request.code)}:${encodeURIComponent(request.state)}`;
}

function getBindRequestPromise(service: ProfileService, request: BindOAuth2Req): Promise<BindOAuth2Resp> {
  let serviceRequests = bindRequestPromises.get(service);
  if (!serviceRequests) {
    serviceRequests = new Map<string, Promise<BindOAuth2Resp>>();
    bindRequestPromises.set(service, serviceRequests);
  }

  const requestKey = createBindRequestKey(request);
  const existingRequest = serviceRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const bindRequest = service.bindOAuth2(request);
  serviceRequests.set(requestKey, bindRequest);
  return bindRequest;
}

const useStyles = createStyles(({ token }) => ({
  content: {
    width: '100%',
    textAlign: 'center' as const,
  },
  loadingState: {
    minHeight: 88,
    paddingBlock: token.paddingSM,
  },
  message: {
    maxWidth: 320,
  },
  action: {
    minWidth: 136,
  },
  secondaryAction: {
    paddingInline: 0,
  },
}));

function getFragmentSearch(hash: string): string {
  const queryStart = hash.indexOf('?');
  return queryStart >= 0 ? hash.slice(queryStart) : '';
}

function createCallbackSearchParams(location: ReturnType<typeof useLocation>): URLSearchParams {
  const search = location.search || getFragmentSearch(location.hash);
  return new URLSearchParams(search);
}

export function ProfileBindCallbackPage({ service: serviceProp }: ProfileBindCallbackPageProps) {
  const service = serviceProp ?? defaultProfileService;
  const { styles } = useStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const { modal } = App.useApp();
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState(t('auth.profileInfo.bindCallback.loading'));
  const [retrying, setRetrying] = useState(false);

  const callbackParams = useMemo(() => createCallbackSearchParams(location), [location]);
  const providerId = callbackParams.get('provider');
  const code = callbackParams.get('code');
  const state = callbackParams.get('state');
  const callbackError = callbackParams.get('error');

  const finishSuccess = useCallback(() => {
    notice.success(t('auth.profileInfo.feedback.bindSuccess'));
    setStatus('success');
    setMessage(t('auth.profileInfo.bindCallback.successMessage'));
    navigate('/profile/info', { replace: true });
  }, [navigate, notice, t]);

  const backToProfile = useCallback(() => {
    navigate('/profile/info');
  }, [navigate]);

  const retryBind = useCallback(async () => {
    if (!providerId) {
      backToProfile();
      return;
    }
    setRetrying(true);
    try {
      const prepareResult = await service.prepareOAuth2Bind({ providerId });
      redirectToAuthorizeUrl(prepareResult.authorizeUrl);
    } catch (error: unknown) {
      setRetrying(false);
      if (!(error instanceof Error)) throw error;
      notice.error(t('auth.profileInfo.feedback.bindFailed'));
      setMessage(t('auth.profileInfo.bindCallback.failed'));
      console.error('OAuth2 bind retry failed', error.message);
    }
  }, [backToProfile, notice, providerId, service, t]);

  const handleBindResult = useCallback((request: BindOAuth2Req, result: BindOAuth2Resp) => {
    if (result.status === 'TAKEOVER_CONFIRMATION_REQUIRED') {
      setMessage(t('auth.profileInfo.bindCallback.confirming'));
      modal.confirm({
        title: t('auth.profileInfo.confirm.takeoverTitle'),
        content: t('auth.profileInfo.confirm.takeoverContent'),
        okText: t('common.actions.confirm'),
        cancelText: t('common.actions.cancel'),
        onOk: async () => {
          const takeoverResult = await service.bindOAuth2({ ...request, takeover: true });
          if (takeoverResult.status === 'BOUND') {
            finishSuccess();
          }
        },
        onCancel: () => {
          setStatus('error');
          setMessage(t('auth.profileInfo.bindCallback.cancelled'));
        },
      });
      return;
    }
    finishSuccess();
  }, [finishSuccess, modal, service, t]);

  useEffect(() => {
    if (callbackError) {
      setStatus('error');
      setMessage(t('auth.profileInfo.bindCallback.providerError'));
      return;
    }
    if (!providerId || !code || !state) {
      setStatus('error');
      setMessage(t('auth.profileInfo.bindCallback.missingParams'));
      return;
    }

    const request = { providerId, code, state };
    let active = true;
    getBindRequestPromise(service, request)
      .then((result) => {
        if (!active) return;
        handleBindResult(request, result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (!(error instanceof Error)) throw error;
        notice.error(t('auth.profileInfo.feedback.bindFailed'));
        setStatus('error');
        setMessage(t('auth.profileInfo.bindCallback.failed'));
        console.error('OAuth2 bind callback failed', error.message);
      });

    return () => {
      active = false;
    };
  }, [callbackError, code, handleBindResult, notice, providerId, service, state, t]);

  return (
    <AuthShell>
      <Flex vertical align="center" gap={16} className={styles.content}>
        {status === 'loading' ? (
          <Flex vertical align="center" justify="center" gap={12} className={styles.loadingState} data-testid="profile-bind-callback-loading">
            <Spin />
            <Typography.Text type="secondary" className={styles.message}>{message}</Typography.Text>
          </Flex>
        ) : null}
        {status === 'success' ? (
          <Alert type="success" showIcon title={t('auth.profileInfo.bindCallback.successTitle')} description={message} data-testid="profile-bind-callback-success" />
        ) : null}
        {status === 'error' ? (
          <Alert type="error" showIcon title={t('auth.profileInfo.bindCallback.errorTitle')} description={message} data-testid="profile-bind-callback-error" />
        ) : null}
        {status === 'error' && providerId ? (
          <Flex vertical align="center" gap={4}>
            <Button type="primary" className={styles.action} loading={retrying} onClick={() => void retryBind()}>
              {t('auth.profileInfo.bindCallback.retryBind')}
            </Button>
            <Button type="link" className={styles.secondaryAction} onClick={backToProfile}>
              {t('auth.profileInfo.bindCallback.backToProfile')}
            </Button>
          </Flex>
        ) : (
          <Button type="primary" className={styles.action} onClick={backToProfile}>
            {t('auth.profileInfo.bindCallback.backToProfile')}
          </Button>
        )}
      </Flex>
    </AuthShell>
  );
}

export default ProfileBindCallbackPage;
