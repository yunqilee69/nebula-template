import {
  ArrowLeftOutlined,
  GithubOutlined,
  LockOutlined,
  LoginOutlined,
  MailOutlined,
  MobileOutlined,
  UserOutlined,
  WechatFilled,
} from '@ant-design/icons';
import { Alert, Button, Checkbox, Flex, Form, Input, Tabs, Tooltip, Typography, theme } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toCurrentUser } from '@/utils/auth/current-user';
import { useNebulaLoginBadge } from '@/providers/login-badge-provider';
import { saveAuthTokens } from '@/utils/auth/token-session';
import { getBuiltInLoginMethods, mergeLoginBadges } from '@/utils/auth/auth-methods';
import type {
  AuthInitResp,
  BuiltInLoginMethodKey,
  LoginReq,
  LoginResp,
  NebulaExtraLoginBadge,
  GitHubLoginStatusResp,
  WechatWebStatusResp,
} from '@/types/auth';
import type { AuthService } from '@/api/auth';
import { AuthShell } from '@/layouts/auth-shell';
import { useAuthStore } from '@/stores/auth-store';
import { prepareOAuthRedirect } from './oauth-redirect';
import { OAuthRedirectPanel } from './oauth-redirect-panel';
import { WechatWebPanel } from './wechat-web-panel';
import { AuthLoadingState } from './auth-loading-state';
import { normalizeAuthReturnPath } from './auth-return-path';
import { redirectToAuthorizeUrl } from './wechat-redirect-navigation';
import { isBindingChallenge, saveBindingChallenge } from './binding-challenge';
import { TenantCodeGate } from '@/components/tenant-code-gate';
import { isTenantResolutionError } from '@/utils/tenant/tenant-error';
import { resolveTenantHost, saveTenantCode } from '@/utils/tenant/tenant-host';

const builtInLabels: Record<BuiltInLoginMethodKey, string> = {
  password: '账号密码登录',
  person: '平台账号登录',
  phone: '手机号登录',
  email: '邮箱登录',
  github: 'GitHub',
  wechat: '微信扫码',
};

type LoginResult = LoginResp;
type ExtraLoginResult = LoginResp | GitHubLoginStatusResp;
/** 页签里的主登录方式：只有账号密码与手机号。 */
type PrimaryFormLoginMethodKey = Extract<BuiltInLoginMethodKey, 'password' | 'phone'>;
/** 收进「其他登录方式」的账号类登录方式：点击后在原位展示对应表单。 */
type SecondaryFormLoginMethodKey = Extract<BuiltInLoginMethodKey, 'person' | 'email'>;

type LoginMethodDescriptor =
  | { key: BuiltInLoginMethodKey; label: string; kind: 'built-in'; method: BuiltInLoginMethodKey }
  | { key: string; label: string; kind: 'extra'; badge: NebulaExtraLoginBadge };

type LoginSuccessHandler = (result: LoginResult) => void | Promise<void>;
type WechatWebSuccessHandler = (result: WechatWebStatusResp) => void | Promise<void>;
type ExtraSuccessHandler = (result?: ExtraLoginResult) => void | Promise<void>;

const primaryFormLoginMethodKeys = new Set<BuiltInLoginMethodKey>(['password', 'phone']);
const secondaryFormLoginMethodKeys = new Set<BuiltInLoginMethodKey>(['person', 'email']);

function isPrimaryFormDescriptor(
  method: LoginMethodDescriptor,
): method is Extract<LoginMethodDescriptor, { kind: 'built-in' }> & { method: PrimaryFormLoginMethodKey } {
  return method.kind === 'built-in' && primaryFormLoginMethodKeys.has(method.method);
}

function isSecondaryFormDescriptor(
  method: LoginMethodDescriptor,
): method is Extract<LoginMethodDescriptor, { kind: 'built-in' }> & { method: SecondaryFormLoginMethodKey } {
  return method.kind === 'built-in' && secondaryFormLoginMethodKeys.has(method.method);
}

function isDirectRedirectOAuthDescriptor(
  method: LoginMethodDescriptor,
): method is Extract<LoginMethodDescriptor, { kind: 'built-in' }> & { method: 'github' } {
  return method.kind === 'built-in' && method.method === 'github';
}

function buildLoginMethodDescriptors(
  keys: string[],
  builtInMethods: BuiltInLoginMethodKey[],
  extraBadges: NebulaExtraLoginBadge[],
): LoginMethodDescriptor[] {
  return keys
    .map((key): LoginMethodDescriptor | null => {
      const isBuiltIn = builtInMethods.includes(key as BuiltInLoginMethodKey);

      if (isBuiltIn) {
        const method = key as BuiltInLoginMethodKey;
        return { key: method, label: builtInLabels[method], kind: 'built-in', method };
      }

      const badge = extraBadges.find((item) => item.key === key);
      if (!badge) return null;

      return { key: badge.key, label: badge.label, kind: 'extra', badge };
    })
    .filter((item): item is LoginMethodDescriptor => item !== null);
}

/** 「其他登录方式」里的图标：账号类用输入框同款图标，OAuth 用品牌图标。 */
function getLoginMethodIcon(method: LoginMethodDescriptor): ReactNode {
  if (method.kind === 'extra') return <LoginOutlined aria-hidden />;

  switch (method.method) {
    case 'password':
      return <UserOutlined aria-hidden />;
    case 'person':
      return <UserOutlined aria-hidden />;
    case 'phone':
      return <MobileOutlined aria-hidden />;
    case 'email':
      return <MailOutlined aria-hidden />;
    case 'github':
      return <GithubOutlined aria-hidden />;
    case 'wechat':
      return <WechatFilled aria-hidden />;
  }
}

export function LoginPage() {
  const loginBadge = useNebulaLoginBadge();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginRedirectPath = normalizeAuthReturnPath(searchParams.get('redirect') ?? undefined);
  const setUser = useAuthStore((state) => state.setUser);
  // 自动登录：勾选时令牌写入 localStorage，取消时写入 sessionStorage（关闭浏览器即失效）。
  const [autoLogin, setAutoLogin] = useState(true);

  const [config, setConfig] = useState<AuthInitResp | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configLoadFailed, setConfigLoadFailed] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [configReloadKey, setConfigReloadKey] = useState(0);

  useEffect(() => {
    if (!loginBadge.authService) {
      setConfigLoading(false);
      return;
    }

    let cancelled = false;
    setTenantError(null);
    loginBadge.authService
      .getAuthConfig()
      .then((resp) => {
        if (!cancelled) {
          setConfig(resp);
          setConfigLoadFailed(false);
          setConfigLoading(false);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setConfig(null);
          if (isTenantResolutionError(caught)) {
            setTenantError(caught instanceof Error ? caught.message : '当前访问地址未绑定企业');
            setConfigLoadFailed(false);
          } else {
            setConfigLoadFailed(true);
          }
          setConfigLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loginBadge.authService, configReloadKey]);

  const builtInMethods = useMemo(
    () => (config ? getBuiltInLoginMethods(config) : configLoadFailed ? loginBadge.defaultLoginMethods : []),
    [config, configLoadFailed, loginBadge.defaultLoginMethods],
  );

  const mergedKeys = useMemo(
    () => mergeLoginBadges(builtInMethods, loginBadge.extraLoginBadges),
    [builtInMethods, loginBadge.extraLoginBadges],
  );

  // 方法列表决定初始选中的登录方式，必须保持引用稳定，否则登录页重渲染会把视图重置回账号密码。
  const methods = useMemo(
    () => buildLoginMethodDescriptors(mergedKeys, builtInMethods, loginBadge.extraLoginBadges),
    [mergedKeys, builtInMethods, loginBadge.extraLoginBadges],
  );

  const handleExtraSuccess = useCallback(
    async (result?: ExtraLoginResult) => {
      if (result) {
        if (isBindingChallenge(result as LoginResult)) {
          saveBindingChallenge(result as LoginResult);
          navigate('/login/binding', { replace: true });
          return;
        }
        saveAuthTokens(result, { persist: autoLogin });
        if (loginBadge.onLoginSuccess) {
          await loginBadge.onLoginSuccess(result);
        } else {
          if (loginBadge.authService) {
            const currentUser = await loginBadge.authService.getCurrentUser();
            setUser(toCurrentUser(currentUser));
          }
          navigate(loginRedirectPath, { replace: true });
        }
      }
    },
    [autoLogin, loginBadge.authService, loginBadge.onLoginSuccess, loginRedirectPath, navigate, setUser],
  );

  const handleLoginSuccess = useCallback(
    async (result: LoginResult) => {
      if (isBindingChallenge(result)) {
        saveBindingChallenge(result);
        navigate('/login/binding', { replace: true });
        return;
      }
      saveAuthTokens(result, { persist: autoLogin });
      if (loginBadge.onLoginSuccess) {
        await loginBadge.onLoginSuccess(result);
      } else {
        if (loginBadge.authService) {
          const currentUser = await loginBadge.authService.getCurrentUser();
          setUser(toCurrentUser(currentUser));
        }
        navigate(loginRedirectPath, { replace: true });
      }
    },
    [autoLogin, loginBadge.authService, loginBadge.onLoginSuccess, loginRedirectPath, navigate, setUser],
  );

  if (configLoading) {
    return (
      <AuthShell>
        <AuthLoadingState />
      </AuthShell>
    );
  }

  if (tenantError) {
    const hostTenantCode = resolveTenantHost().tenantCode;
    return (
      <AuthShell>
        {hostTenantCode ? (
          <Alert
            type="error"
            showIcon
            title="当前企业不可用"
            description={`访问地址绑定的企业「${hostTenantCode}」不存在或已停用，请检查访问地址或联系企业管理员。`}
          />
        ) : (
          <TenantCodeGate
            errorMessage={tenantError}
            onSubmit={(tenantCode) => {
              saveTenantCode(tenantCode);
              setConfigLoading(true);
              setConfigReloadKey((key) => key + 1);
            }}
          />
        )}
      </AuthShell>
    );
  }

  if (!loginBadge.authService) {
    const extraMethods = loginBadge.extraLoginBadges.map(
      (badge): LoginMethodDescriptor => ({ key: badge.key, label: badge.label, kind: 'extra', badge }),
    );

    return (
      <AuthShell>
        {extraMethods.length > 0 ? (
          <LoginMethodSwitcher
            methods={extraMethods}
            authService={null}
            config={null}
            loginBadgeContext={loginBadge}
            registerPath={loginBadge.registerPath}
            autoLogin={autoLogin}
            onAutoLoginChange={setAutoLogin}
            onLoginSuccess={handleLoginSuccess}
            onExtraSuccess={handleExtraSuccess}
          />
        ) : (
          <Alert type="info" title="暂无可用登录方式" description="当前认证服务未返回可用登录方式，请联系系统管理员检查登录管理配置。" showIcon />
        )}
      </AuthShell>
    );
  }

  const authService = loginBadge.authService;

  return (
    <AuthShell>
      <LoginMethodSwitcher
        methods={methods}
        authService={authService}
        config={config}
        loginBadgeContext={loginBadge}
        registerPath={loginBadge.registerPath}
        autoLogin={autoLogin}
        onAutoLoginChange={setAutoLogin}
        onLoginSuccess={handleLoginSuccess}
        onExtraSuccess={handleExtraSuccess}
      />
    </AuthShell>
  );
}

interface LoginMethodSwitcherProps {
  methods: LoginMethodDescriptor[];
  authService: AuthService | null;
  config: AuthInitResp | null;
  loginBadgeContext: ReturnType<typeof useNebulaLoginBadge>;
  registerPath: string | undefined;
  autoLogin: boolean;
  onAutoLoginChange: (value: boolean) => void;
  onLoginSuccess: (result: LoginResult) => void;
  onExtraSuccess: ExtraSuccessHandler;
}

function LoginMethodSwitcher({
  methods,
  authService,
  config,
  loginBadgeContext,
  registerPath,
  autoLogin,
  onAutoLoginChange,
  onLoginSuccess,
  onExtraSuccess,
}: LoginMethodSwitcherProps) {
  const { token } = theme.useToken();
  // 页签只保留账号密码与手机号；平台账号、邮箱、GitHub、微信、扩展登录都进「其他登录方式」。
  const primaryMethods = useMemo(() => methods.filter(isPrimaryFormDescriptor), [methods]);
  const otherMethods = useMemo(() => methods.filter((method) => !isPrimaryFormDescriptor(method)), [methods]);
  const primaryDefaultKey = useMemo(
    () => primaryMethods.find((method) => method.method === 'password')?.key ?? primaryMethods[0]?.key ?? null,
    [primaryMethods],
  );
  // 没有主登录方式时优先展示第一个账号类「其他登录方式」，其次才是扩展登录入口。
  const initialKey = useMemo(() => {
    if (primaryDefaultKey) return primaryDefaultKey;
    const secondary = otherMethods.find(isSecondaryFormDescriptor);
    if (secondary) return secondary.key;
    return otherMethods.find((method) => method.kind === 'extra')?.key ?? null;
  }, [otherMethods, primaryDefaultKey]);

  const [activeKey, setActiveKey] = useState<string | null>(initialKey);
  const [directRedirectLoadingKey, setDirectRedirectLoadingKey] = useState<string | null>(null);
  const [directRedirectError, setDirectRedirectError] = useState<string | null>(null);

  // 微信扫码轮询返回的会话里包着 loginResult，拆包后走统一登录成功处理
  const onWechatWebLoginSuccess = useCallback(
    async (result: WechatWebStatusResp) => {
      if (result.loginResult) {
        await onLoginSuccess(result.loginResult);
      }
    },
    [onLoginSuccess],
  );

  useEffect(() => {
    setActiveKey(initialKey);
  }, [initialKey]);

  const activePrimary = primaryMethods.find((method) => method.key === activeKey);
  const activeOther = activePrimary ? undefined : methods.find((method) => method.key === activeKey);
  const canGoBack = Boolean(activeOther) && primaryMethods.length > 0;
  // 注册与租户账号找回只适用于租户账号登录，平台账号登录不展示这两个入口。
  const showsTenantAccountLinks = activePrimary?.method === 'password';

  const tabItems = useMemo(
    () => primaryMethods.map((method) => ({ key: method.key, label: method.label, children: null })),
    [primaryMethods],
  );

  if (methods.length === 0) {
    return <Alert type="info" title="暂无可用登录方式" description="当前认证服务未返回可用登录方式，请联系系统管理员检查登录管理配置。" showIcon />;
  }

  const handlePrimaryMethodChange = (key: string) => {
    setActiveKey(key);
    setDirectRedirectError(null);
  };

  const handleOtherMethodClick = async (method: LoginMethodDescriptor) => {
    if (authService && isDirectRedirectOAuthDescriptor(method)) {
      setDirectRedirectLoadingKey(method.key);
      setDirectRedirectError(null);

      try {
        redirectToAuthorizeUrl(await prepareOAuthRedirect('github', authService));
      } catch (caught: unknown) {
        if (!(caught instanceof Error)) throw caught;
        setDirectRedirectError('GitHub 登录发起失败，请稍后重试。');
        setDirectRedirectLoadingKey(null);
      }
      return;
    }

    setDirectRedirectError(null);
    setActiveKey(method.key);
  };

  const renderActivePanel = () => {
    if (!activeOther) return null;

    if (activeOther.kind === 'extra') {
      return (
        <ExtraBadgePanel
          badge={activeOther.badge}
          onSuccess={onExtraSuccess}
          loginBadgeContext={loginBadgeContext}
        />
      );
    }

    return authService ? (
      <LoginMethodPanel
        method={activeOther.method}
        authService={authService}
        onSuccess={onLoginSuccess}
        onWechatSuccess={onWechatWebLoginSuccess}
        config={config}
        autoLogin={autoLogin}
        onAutoLoginChange={onAutoLoginChange}
      />
    ) : null;
  };

  return (
    <Flex vertical gap={token.marginMD}>
      {canGoBack ? (
        <Button
          type="link"
          size="small"
          icon={<ArrowLeftOutlined aria-hidden />}
          onClick={() => handlePrimaryMethodChange(primaryDefaultKey ?? activeKey ?? '')}
          style={{ alignSelf: 'flex-start', paddingInline: 0 }}
        >
          返回
        </Button>
      ) : null}

      {primaryMethods.length > 0 && activePrimary ? (
        <Tabs
          activeKey={activePrimary.key}
          centered
          items={tabItems}
          tabBarGutter={token.marginMD}
          tabBarStyle={{ marginBottom: 0 }}
          type="line"
          onChange={handlePrimaryMethodChange}
          onTabClick={handlePrimaryMethodChange}
        />
      ) : null}

      {activeOther ? renderActivePanel() : activePrimary && authService ? (
        <LoginMethodPanel
          method={activePrimary.method}
          authService={authService}
          onSuccess={onLoginSuccess}
          onWechatSuccess={onWechatWebLoginSuccess}
          config={config}
          autoLogin={autoLogin}
          onAutoLoginChange={onAutoLoginChange}
        />
      ) : null}
      {otherMethods.length > 0 ? (
        <Flex align="center" justify="center" gap={token.marginXXS} wrap="wrap">
          <Typography.Text type="secondary">其他登录方式：</Typography.Text>
          {otherMethods.map((method) => {
            const active = activeOther?.key === method.key;
            return (
              <Tooltip key={method.key} title={method.label}>
                <Button
                  aria-label={method.label}
                  shape="circle"
                  size="large"
                  type="text"
                  icon={getLoginMethodIcon(method)}
                  loading={directRedirectLoadingKey === method.key}
                  disabled={directRedirectLoadingKey !== null && directRedirectLoadingKey !== method.key}
                  onClick={() => {
                    void handleOtherMethodClick(method);
                  }}
                  style={{
                    color: active ? token.colorPrimary : token.colorTextSecondary,
                    fontSize: token.fontSizeHeading4,
                    width: token.controlHeightLG,
                    height: token.controlHeightLG,
                  }}
                />
              </Tooltip>
            );
          })}
        </Flex>
      ) : null}

      {showsTenantAccountLinks && registerPath ? (
        <Typography.Text type="secondary" style={{ textAlign: 'center' }}>
          没有账号？
          <Link to={registerPath}>立即注册</Link>
        </Typography.Text>
      ) : null}

      {directRedirectError ? <Typography.Text type="danger" data-testid="github-direct-redirect-error">{directRedirectError}</Typography.Text> : null}
    </Flex>
  );
}

interface LoginMethodPanelProps {
  method: BuiltInLoginMethodKey;
  authService: AuthService;
  onSuccess: LoginSuccessHandler;
  onWechatSuccess: WechatWebSuccessHandler;
  config: AuthInitResp | null;
  autoLogin: boolean;
  onAutoLoginChange: (value: boolean) => void;
}

function LoginMethodPanel({
  method,
  authService,
  onSuccess,
  onWechatSuccess,
  config,
  autoLogin,
  onAutoLoginChange,
}: LoginMethodPanelProps) {
  switch (method) {
    case 'password':
      return (
        <CredentialsPanel
          accountLabel="用户名"
          accountPlaceholder="请输入用户名"
          accountPrefix={<UserOutlined aria-hidden />}
          accountRequiredMessage="请输入用户名"
          login={authService.login}
          onSuccess={onSuccess}
          autoLogin={autoLogin}
          onAutoLoginChange={onAutoLoginChange}
          showForgotPassword
        />
      );
    case 'person':
      return (
        <CredentialsPanel
          accountLabel="平台账号"
          accountPlaceholder="请输入平台账号"
          accountPrefix={<UserOutlined aria-hidden />}
          accountRequiredMessage="请输入平台账号"
          login={authService.personLogin}
          onSuccess={onSuccess}
          autoLogin={autoLogin}
          onAutoLoginChange={onAutoLoginChange}
        />
      );
    case 'phone':
      return <PhonePanel authService={authService} onSuccess={onSuccess} sendInterval={config?.phoneSendIntervalSeconds ?? 60} />;
    case 'email':
      return <EmailPanel authService={authService} onSuccess={onSuccess} sendInterval={config?.emailSendIntervalSeconds ?? 60} />;
    case 'github':
      return <OAuthRedirectPanel authService={authService} provider="github" />;
    case 'wechat':
      return <WechatWebPanel authService={authService} onSuccess={onWechatSuccess} />;
  }
}

interface CredentialsPanelProps {
  accountLabel: string;
  accountPlaceholder: string;
  accountPrefix: ReactNode;
  accountRequiredMessage: string;
  login: (values: LoginReq) => Promise<LoginResp>;
  onSuccess: LoginSuccessHandler;
  autoLogin: boolean;
  onAutoLoginChange: (value: boolean) => void;
  showForgotPassword?: boolean;
}

function CredentialsPanel({
  accountLabel,
  accountPlaceholder,
  accountPrefix,
  accountRequiredMessage,
  login,
  onSuccess,
  autoLogin,
  onAutoLoginChange,
  showForgotPassword = false,
}: CredentialsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: LoginReq) => {
    setLoading(true);
    try {
      const result = await login(values);
      await onSuccess(result);
    } catch {
      // Request client already surfaces API failures through the global notice path.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <Form.Item name="username" rules={[{ required: true, message: accountRequiredMessage }]}>
        <Input
          aria-label={accountLabel}
          autoComplete="username"
          prefix={accountPrefix}
          placeholder={accountPlaceholder}
          size="large"
        />
      </Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
        <Input.Password
          aria-label="密码"
          autoComplete="current-password"
          prefix={<LockOutlined aria-hidden />}
          placeholder="请输入密码"
          size="large"
        />
      </Form.Item>
      <Form.Item style={{ marginBottom: 24 }}>
        <Flex justify="space-between" align="center" gap={8}>
          <Checkbox checked={autoLogin} onChange={(event) => onAutoLoginChange(event.target.checked)}>
            自动登录
          </Checkbox>
          {showForgotPassword ? <Link to="/forgot-password">忘记密码？</Link> : null}
        </Flex>
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          登录
        </Button>
      </Form.Item>
    </Form>
  );
}

interface PhonePanelProps {
  authService: AuthService;
  onSuccess: LoginSuccessHandler;
  sendInterval: number;
}

function PhonePanel({ authService, onSuccess, sendInterval }: PhonePanelProps) {
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [form] = Form.useForm();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSendCode = async () => {
    const phone = form.getFieldValue('phone');
    if (!phone) return;

    setSendingCode(true);
    try {
      await authService.sendPhoneCode({ phone });
      setCountdown(sendInterval);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (values: { phone: string; code: string }) => {
    setLoading(true);
    try {
      const result = await authService.phoneLogin(values);
      await onSuccess(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <Form.Item name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
        <Input
          aria-label="手机号"
          autoComplete="tel"
          prefix={<MobileOutlined aria-hidden />}
          placeholder="请输入手机号"
          size="large"
        />
      </Form.Item>
      <Form.Item label="验证码" name="code" rules={[{ required: true, message: '请输入验证码' }]}>
        <Flex gap={8}>
          <Input className="flex-1" size="large" />
          <Button onClick={handleSendCode} loading={sendingCode} disabled={countdown > 0} size="large">
            {countdown > 0 ? `${countdown}s` : '发送验证码'}
          </Button>
        </Flex>
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          登录
        </Button>
      </Form.Item>
    </Form>
  );
}

interface EmailPanelProps {
  authService: AuthService;
  onSuccess: LoginSuccessHandler;
  sendInterval: number;
}

function EmailPanel({ authService, onSuccess, sendInterval }: EmailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [form] = Form.useForm();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSendCode = async () => {
    const email = form.getFieldValue('email');
    if (!email) return;

    setSendingCode(true);
    try {
      await authService.sendEmailCode({ email });
      setCountdown(sendInterval);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (values: { email: string; code: string }) => {
    setLoading(true);
    try {
      const result = await authService.emailLogin(values);
      await onSuccess(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }]}>
        <Input
          aria-label="邮箱"
          autoComplete="email"
          prefix={<MailOutlined aria-hidden />}
          placeholder="请输入邮箱"
          size="large"
        />
      </Form.Item>
      <Form.Item label="验证码" name="code" rules={[{ required: true, message: '请输入验证码' }]}>
        <Flex gap={8}>
          <Input className="flex-1" size="large" />
          <Button onClick={handleSendCode} loading={sendingCode} disabled={countdown > 0} size="large">
            {countdown > 0 ? `${countdown}s` : '发送验证码'}
          </Button>
        </Flex>
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          登录
        </Button>
      </Form.Item>
    </Form>
  );
}

interface ExtraBadgePanelProps {
  badge: NebulaExtraLoginBadge;
  onSuccess: ExtraSuccessHandler;
  loginBadgeContext: ReturnType<typeof useNebulaLoginBadge>;
}

function ExtraBadgePanel({ badge, onSuccess, loginBadgeContext }: ExtraBadgePanelProps) {
  const handleBadgeSuccess = useCallback(
    async (response?: ExtraLoginResult) => {
      await onSuccess(response);
    },
    [onSuccess],
  );

  return <>{badge.render({ onSuccess: handleBadgeSuccess, loginBadge: loginBadgeContext })}</>;
}
