import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { AuthService } from '@/api/auth';
import type { AuthInitResp } from '@/types/auth';
import { RegisterPage } from './index';

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

const defaultConfig: AuthInitResp = {
  usernameEnabled: true,
  phoneEnabled: false,
  emailEnabled: false,
  usernameRegisterAllowed: true,
  usernamePasswordMinLength: 6,
  usernamePasswordMaxLength: 20,
};

function renderRegisterPage(overrides: { authService?: AuthService; onRegisterSuccess?: ReturnType<typeof vi.fn> } = {}) {
  const authService = overrides.authService ?? createMockAuthService();
  const onRegisterSuccess = overrides.onRegisterSuccess ?? vi.fn();

  return {
    authService,
    onRegisterSuccess,
    ...render(
      <MemoryRouter>
        <NebulaProvider
          loginBadge={{
            authService,
            onRegisterSuccess,
          }}
        >
          <RegisterPage />
        </NebulaProvider>
      </MemoryRouter>,
    ),
  };
}

describe('RegisterPage', () => {
  it('shows alert when usernameRegisterAllowed is false', async () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({
        ...defaultConfig,
        usernameRegisterAllowed: false,
      }),
    });

    renderRegisterPage({ authService });

    await waitFor(() => {
      expect(screen.getByText(/暂不开放注册/i)).toBeInTheDocument();
    });
  });

  it('shows registration unavailable instead of requiring authService', async () => {
    render(
      <MemoryRouter>
        <NebulaProvider>
          <RegisterPage />
        </NebulaProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/注册功能未启用/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/未配置认证服务/i)).not.toBeInTheDocument();
  });

  it('shows alert if config loading fails', async () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockRejectedValue(new Error('Stack trace: internal host leaked')),
    });

    renderRegisterPage({ authService });

    await waitFor(() => {
      expect(screen.getByText(/加载认证配置失败/i)).toBeInTheDocument();
    });
    expect(screen.getByText('请稍后重试，或联系管理员检查认证配置。')).toBeInTheDocument();
    expect(screen.queryByText(/internal host/i)).not.toBeInTheDocument();
  });

  it('validates confirm password mismatch', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(defaultConfig),
    });

    renderRegisterPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'newuser');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.type(screen.getByLabelText('确认密码'), 'different456');
    await user.click(screen.getByRole('button', { name: /注\s*册/ }));

    await waitFor(() => {
      expect(screen.getByText(/两次密码不一致/i)).toBeInTheDocument();
    });
  });

  it('calls authService.register without confirmPassword and onRegisterSuccess after success', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(defaultConfig),
      register: vi.fn().mockResolvedValue(undefined),
    });
    const onRegisterSuccess = vi.fn();

    renderRegisterPage({ authService, onRegisterSuccess });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'newuser');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.type(screen.getByLabelText('确认密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /注\s*册/ }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'password123',
      });
    });

    expect(onRegisterSuccess).toHaveBeenCalled();
  });

  it('validates password minimum length from config', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue({
        ...defaultConfig,
        usernamePasswordMinLength: 6,
      }),
    });

    renderRegisterPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'newuser');
    await user.type(screen.getByLabelText('密码'), 'abc');
    await user.click(screen.getByRole('button', { name: /注\s*册/ }));

    await waitFor(() => {
      expect(screen.getByText(/密码长度不能少于/i)).toBeInTheDocument();
    });
  });

  it('renders login link pointing to loginPath', async () => {
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(defaultConfig),
    });

    renderRegisterPage({ authService });

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    const loginLink = screen.getByRole('link', { name: /立即登录/ });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('navigates back to login after successful registration when no custom callback redirects', async () => {
    const user = userEvent.setup();
    const authService = createMockAuthService({
      getAuthConfig: vi.fn().mockResolvedValue(defaultConfig),
      register: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <NebulaProvider loginBadge={{ authService }}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<div>Login Route</div>} />
          </Routes>
        </NebulaProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('用户名'), 'newuser');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.type(screen.getByLabelText('确认密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /注\s*册/ }));

    expect(await screen.findByText('Login Route')).toBeInTheDocument();
  });
});
