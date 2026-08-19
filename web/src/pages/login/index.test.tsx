import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthService } from '@/api/auth';
import type {
  AuthInitResp,
  BuiltInLoginMethodKey,
  LoginResp,
  NebulaExtraLoginBadge,
  NebulaExtraLoginBadgeRenderContext,
} from '@/types/auth';
import { saveAuthTokens } from '@/utils/auth/token-session';
import { LoginPage } from './index';

const redirectToAuthorizeUrlMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/auth/token-session', () => ({
  saveAuthTokens: vi.fn(),
  getStoredAccessToken: vi.fn(() => null),
  getStoredRefreshToken: vi.fn(() => null),
  clearAuthTokens: vi.fn(),
}));

vi.mock('./wechat-redirect-navigation', () => ({
  redirectToAuthorizeUrl: redirectToAuthorizeUrlMock,
}));

function createMockAuthService(partial?: Partial<AuthService>): AuthService {
  return {
    getAuthConfig: partial?.getAuthConfig ?? vi.fn(),
    login: partial?.login ?? vi.fn(),
    phoneLogin: partial?.phoneLogin ?? vi.fn(),
    emailLogin: partial?.emailLogin ?? vi.fn(),
    register: partial?.register ?? vi.fn(),
    sendPhoneCode: partial?.sendPhoneCode ?? vi.fn(),
    sendEmailCode: partial?.sendEmailCode ?? vi.fn(),
    sendForgotPasswordCode: partial?.sendForgotPasswordCode ?? vi.fn(),
    verifyForgotPasswordCode: partial?.verifyForgotPasswordCode ?? vi.fn(),
    changeForgottenPassword: partial?.changeForgottenPassword ?? vi.fn(),
    refreshToken: partial?.refreshToken ?? vi.fn(),
    logout: partial?.logout ?? vi.fn(),
    getCurrentUser: partial?.getCurrentUser ?? vi.fn(),
    prepareGitHubRedirect: partial?.prepareGitHubRedirect ?? vi.fn(),
    getGitHubLoginStatus: partial?.getGitHubLoginStatus ?? vi.fn(),
    completeGitHubRedirectCallback: partial?.completeGitHubRedirectCallback ?? vi.fn(),
  };
}

const fullConfig: AuthInitResp = {
  usernameEnabled: true,
  phoneEnabled: true,
  emailEnabled: true,
  githubEnabled: true,
  phoneSendIntervalSeconds: 60,
  emailSendIntervalSeconds: 60,
};

const passwordOnlyConfig: AuthInitResp = {
  usernameEnabled: true,
  phoneEnabled: false,
  emailEnabled: false,
};

const loginResp: LoginResp = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  accessTokenExpiresIn: 7200,
  refreshTokenExpiresIn: 604800,
};

const currentUserResp = {
  id: 'user-1',
  username: 'alice',
  nickname: 'Alice',
  roleCodeList: ['ADMIN'],
  permissionCodeList: ['MENU:dashboard:Allow'],
  orgCodeList: ['TECH'],
  menuList: [
    {
      id: 'dashboard-menu',
      code: 'dashboard',
      name: 'Dashboard',
      path: '/dashboard',
      component: 'DashboardPage',
      status: 1,
    },
  ],
};

function LocationSnapshot() {
  const location = useLocation();

  return <span data-testid="current-location">{`${location.pathname}${location.search}${location.hash}`}</span>;
}

function renderLoginPage(
  overrides: {
    authService?: AuthService;
    onLoginSuccess?: Mock;
    extraLoginBadges?: NebulaExtraLoginBadge[];
    defaultLoginMethods?: BuiltInLoginMethodKey[];
    initialEntry?: string;
  } = {},
) {
  const authService = overrides.authService ?? createMockAuthService();
  const onLoginSuccess = overrides.onLoginSuccess ?? vi.fn();

  return {
    authService,
    onLoginSuccess,
    ...render(
      <MemoryRouter initialEntries={overrides.initialEntry ? [overrides.initialEntry] : undefined}>
        <NebulaProvider
          loginBadge={{
            authService,
            onLoginSuccess,
            extraLoginBadges: overrides.extraLoginBadges,
            defaultLoginMethods: overrides.defaultLoginMethods,
          }}
        >
          <LoginPage />
        </NebulaProvider>
      </MemoryRouter>,
    ),
  };
}

function createPasswordLoginAuthService(): AuthService {
  return createMockAuthService({
    getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    login: vi.fn().mockResolvedValue(loginResp),
    getCurrentUser: vi.fn().mockResolvedValue(currentUserResp),
  });
}

async function submitPasswordLogin(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await waitFor(() => {
    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
  });

  await user.type(screen.getByLabelText('用户名'), 'admin');
  await user.type(screen.getByLabelText('密码'), 'password123');
  await user.click(screen.getByRole('button', { name: /登\s*录/ }));
}

function renderPasswordLoginRoutes(initialEntry: string, authService: AuthService) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <NebulaProvider loginBadge={{ authService }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Workspace Home</div>} />
          <Route path="/dashboard" element={<><div>Dashboard Target</div><LocationSnapshot /></>} />
        </Routes>
      </NebulaProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.mocked(saveAuthTokens).mockClear();
    redirectToAuthorizeUrlMock.mockClear();
  });

  it('loads config, shows password login by default, and renders only form methods as tabs', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(fullConfig),
    });

    renderLoginPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.queryByText(/当前登录方式/)).not.toBeInTheDocument();
    const passwordTab = screen.getByRole('tab', { name: '账号密码登录' });
    const phoneTab = screen.getByRole('tab', { name: '手机号登录' });
    const emailTab = screen.getByRole('tab', { name: '邮箱登录' });
    expect(passwordTab).toHaveAttribute('aria-selected', 'true');
    expect(phoneTab.querySelector('.anticon-mobile')).toBeInTheDocument();
    expect(emailTab.querySelector('.anticon-mail')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'GitHub' })).not.toBeInTheDocument();
    expect(screen.getByText(/其他登录方式/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GitHub' }).querySelector('.anticon-github')).toBeInTheDocument();

    await user.click(phoneTab);

    expect(phoneTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('手机号')).toBeInTheDocument();
    expect(authService.getAuthConfig).toHaveBeenCalledOnce();
  });

  it('renders extra login badges from NebulaProvider loginBadge.extraLoginBadges', async () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    });

    renderLoginPage({
      authService,
      extraLoginBadges: [
        {
          key: 'sso',
          label: '企业 SSO',
          render: (_ctx: NebulaExtraLoginBadgeRenderContext) => (
            <button type="button">企业 SSO 登录</button>
          ),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '企业 SSO' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '企业 SSO' }).querySelector('.anticon-login')).toBeInTheDocument();
  });

  it('shows loading state while config is loading', () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderLoginPage({ authService });

    expect(screen.getByText('正在加载登录方式')).toBeInTheDocument();
    expect(screen.queryByText('后端服务未启动')).not.toBeInTheDocument();
  });

  it('shows backend startup hint after three seconds while config is loading', async () => {
    vi.useFakeTimers();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    renderLoginPage({ authService });

    expect(screen.queryByText('后端服务未启动')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('后端服务未启动')).toBeInTheDocument();
    expect(screen.getByText('登录初始化接口超过 3 秒未返回，请确认后端服务已启动。')).toBeInTheDocument();
  });

  it('does not show backend startup hint when config loads before three seconds', async () => {
    vi.useFakeTimers();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockImplementation(
        () => new Promise<AuthInitResp>((resolve) => {
          setTimeout(() => resolve(passwordOnlyConfig), 1000);
        }),
      ),
    });

    renderLoginPage({ authService });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    expect(screen.queryByText('后端服务未启动')).not.toBeInTheDocument();
  });

  it('shows an empty login state instead of requiring authService', async () => {
    render(
      <MemoryRouter>
        <NebulaProvider>
          <LoginPage />
        </NebulaProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/暂无可用登录方式/i)).toBeInTheDocument();
    });
    expect(screen.getByText('当前认证服务未返回可用登录方式，请联系系统管理员检查登录管理配置。')).toBeInTheDocument();
    expect(screen.queryByText(/未配置认证服务/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/NebulaProvider/i)).not.toBeInTheDocument();
  });

  it('renders extra login badges without authService', async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    const extraResp: LoginResp = {
      accessToken: 'extra-token',
      refreshToken: 'extra-refresh',
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 86400,
    };

    render(
      <MemoryRouter>
        <NebulaProvider
          loginBadge={{
            onLoginSuccess,
            extraLoginBadges: [
              {
                key: 'sso',
                label: 'SSO',
                render: (ctx) => (
                  <button type="button" onClick={() => ctx.onSuccess(extraResp)}>
                    SSO 登录
                  </button>
                ),
              },
            ],
          }}
        >
          <LoginPage />
        </NebulaProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'SSO' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'SSO 登录' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'SSO 登录' }));

    expect(onLoginSuccess).toHaveBeenCalledWith(extraResp);
    expect(screen.queryByText(/未配置认证服务/i)).not.toBeInTheDocument();
  });

  it('falls back to password login if config loading fails', async () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockRejectedValue(new Error('Stack trace: database password leaked')),
    });

    renderLoginPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '账号密码登录' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText(/加载认证配置失败/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/database password/i)).not.toBeInTheDocument();
  });

  it('uses project-configured default login methods when config loading fails', async () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockRejectedValue(new Error('config unavailable')),
    });

    renderLoginPage({ authService, defaultLoginMethods: ['phone'] });

    await waitFor(() => {
      expect(screen.getByLabelText('手机号')).toBeInTheDocument();
    });
    expect(screen.getByText('验证码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发送验证码' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '手机号登录' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText('用户名')).not.toBeInTheDocument();
  });

  it('password login calls onLoginSuccess with LoginResp', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
      login: vi.fn().mockResolvedValue(loginResp),
    });
    const onLoginSuccess = vi.fn();

    renderLoginPage({ authService, onLoginSuccess });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
      });
    });

    expect(onLoginSuccess).toHaveBeenCalledWith(loginResp);
  });

  it('saves auth tokens after password login', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
      login: vi.fn().mockResolvedValue(loginResp),
    });

    renderLoginPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(saveAuthTokens).toHaveBeenCalledWith(loginResp);
    });
  });

  it('does not render inline password login errors because request errors are shown globally', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
      login: vi.fn().mockRejectedValue(new Error('invalid credentials')),
    });

    renderLoginPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'wrong-password',
      });
    });

    expect(screen.queryByText('登录失败，请检查输入后重试。')).not.toBeInTheDocument();
  });

  it('extra badge onSuccess(response) forwards response to onLoginSuccess', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    });
    const onLoginSuccess = vi.fn();

    const extraResp: LoginResp = {
      accessToken: 'extra-token',
      refreshToken: 'extra-refresh',
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 86400,
    };

    renderLoginPage({
      authService,
      onLoginSuccess,
      extraLoginBadges: [
        {
          key: 'sso',
          label: 'SSO',
          render: (ctx) => (
            <button type="button" onClick={() => ctx.onSuccess(extraResp)}>
              SSO 登录
            </button>
          ),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'SSO' }));

    await user.click(await screen.findByRole('button', { name: 'SSO 登录' }));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith(extraResp);
    });
  });

  it('extra badge onSuccess() without response does not call onLoginSuccess', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    });
    const onLoginSuccess = vi.fn();

    renderLoginPage({
      authService,
      onLoginSuccess,
      extraLoginBadges: [
        {
          key: 'sso',
          label: 'SSO',
          render: (ctx) => (
            <button type="button" onClick={() => ctx.onSuccess()}>
              SSO 无载荷
            </button>
          ),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'SSO' }));

    await user.click(await screen.findByRole('button', { name: 'SSO 无载荷' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SSO 无载荷' })).toBeInTheDocument();
    });

    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('saves auth tokens after extra badge login with token response', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    });

    const extraResp: LoginResp = {
      accessToken: 'extra-token',
      refreshToken: 'extra-refresh',
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 86400,
    };

    renderLoginPage({
      authService,
      extraLoginBadges: [
        {
          key: 'sso',
          label: 'SSO',
          render: (ctx) => (
            <button type="button" onClick={() => ctx.onSuccess(extraResp)}>
              SSO 登录
            </button>
          ),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'SSO' }));
    await user.click(await screen.findByRole('button', { name: 'SSO 登录' }));

    await waitFor(() => {
      expect(saveAuthTokens).toHaveBeenCalledWith(extraResp);
    });
  });

  it('does not save auth tokens when extra badge succeeds without a response', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
    });

    renderLoginPage({
      authService,
      extraLoginBadges: [
        {
          key: 'sso',
          label: 'SSO',
          render: (ctx) => (
            <button type="button" onClick={() => ctx.onSuccess()}>
              SSO 无载荷
            </button>
          ),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SSO' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'SSO' }));
    await user.click(await screen.findByRole('button', { name: 'SSO 无载荷' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'SSO 无载荷' })).toBeInTheDocument();
    });

    expect(saveAuthTokens).not.toHaveBeenCalled();
  });

  it('navigates to the workspace route after successful password login when no custom callback redirects', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().clearUser();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(passwordOnlyConfig),
      login: vi.fn().mockResolvedValue(loginResp),
      getCurrentUser: vi.fn().mockResolvedValue(currentUserResp),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <NebulaProvider loginBadge={{ authService }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Workspace Home</div>} />
          </Routes>
        </NebulaProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'admin');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));

    await waitFor(() => {
      expect(authService.getCurrentUser).toHaveBeenCalledOnce();
    });
    expect(saveAuthTokens).toHaveBeenCalledWith(loginResp);
    expect(useAuthStore.getState().user).toMatchObject({
      id: 'user-1',
      name: 'Alice',
      roles: ['ADMIN'],
      permissions: ['MENU:dashboard:Allow'],
      menuList: [
        expect.objectContaining({
          code: 'dashboard',
          path: '/dashboard',
          component: 'DashboardPage',
        }),
      ],
    });
    expect(await screen.findByText('Workspace Home')).toBeInTheDocument();
  });

  it('returns to the requested route after successful password login', async () => {
    const user = userEvent.setup();
    useAuthStore.getState().clearUser();
    const authService = createPasswordLoginAuthService();

    renderPasswordLoginRoutes('/login?redirect=%2Fdashboard%3Ftab%3Dhome%23section', authService);

    await submitPasswordLogin(user);

    await waitFor(() => {
      expect(authService.getCurrentUser).toHaveBeenCalledOnce();
    });
    expect(await screen.findByText('Dashboard Target')).toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent('/dashboard?tab=home#section');
  });

  it.each([
    '//evil.example/dashboard',
    'https://evil.example/dashboard',
    '/login?redirect=/dashboard',
  ])('normalizes unsafe redirect %s to the workspace route after password login', async (redirect) => {
    const user = userEvent.setup();
    useAuthStore.getState().clearUser();
    const authService = createPasswordLoginAuthService();

    renderPasswordLoginRoutes(`/login?redirect=${encodeURIComponent(redirect)}`, authService);

    await submitPasswordLogin(user);

    await waitFor(() => {
      expect(authService.getCurrentUser).toHaveBeenCalledOnce();
    });
    expect(await screen.findByText('Workspace Home')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Target')).not.toBeInTheDocument();
  });

  it('directly starts GitHub redirect login with the backend authorize URL when GitHub is enabled', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({ ...passwordOnlyConfig, githubEnabled: true }),
      prepareGitHubRedirect: vi.fn().mockResolvedValue({
        loginId: 'github-login',
        state: 'github-state',
        status: 'WAITING',
        authorizeUrl: 'https://github.com/login/oauth/authorize?client_id=github-client&state=github-state',
      }),
    });

    renderLoginPage({ authService });

    await user.click(await screen.findByRole('button', { name: 'GitHub' }));

    expect(screen.queryByTestId('github-redirect-login')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(authService.prepareGitHubRedirect).toHaveBeenCalledWith({ redirectAfterLogin: '/' });
      expect(redirectToAuthorizeUrlMock).toHaveBeenCalledWith('https://github.com/login/oauth/authorize?client_id=github-client&state=github-state');
    });
  });
});
