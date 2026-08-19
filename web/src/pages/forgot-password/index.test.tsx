import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthService } from '@/api/auth';
import { NebulaProvider } from '@/providers/nebula-provider';
import { saveAuthTokens } from '@/utils/auth/token-session';
import { ForgotPasswordPage } from './index';

vi.mock('@/utils/auth/token-session', () => ({
  saveAuthTokens: vi.fn(),
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

function renderForgotPasswordPage(authService: AuthService) {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <NebulaProvider loginBadge={{ authService }}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/login" element={<div>登录页</div>} />
          <Route path="/" element={<div>首页</div>} />
        </Routes>
      </NebulaProvider>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  afterEach(() => {
    vi.mocked(saveAuthTokens).mockClear();
  });

  it('changes password after verifying bound identity code', async () => {
    const user = userEvent.setup();
    const loginResp = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 7200,
    };
    const authService = createMockAuthService({
      sendForgotPasswordCode: vi.fn().mockResolvedValue(undefined),
      verifyForgotPasswordCode: vi.fn().mockResolvedValue({
        passwordChangeToken: 'change-token-1',
        expiresInSeconds: 600,
      }),
      changeForgottenPassword: vi.fn().mockResolvedValue(loginResp),
      getCurrentUser: vi.fn().mockResolvedValue({
        id: 'user-1',
        username: 'alice',
        nickname: 'Alice',
        roleCodeList: [],
        permissionCodeList: [],
        orgCodeList: [],
        menuList: [],
      }),
    });

    renderForgotPasswordPage(authService);

    await user.type(screen.getByLabelText('手机号或邮箱'), 'alice@example.com');
    await user.click(screen.getByRole('button', { name: '发送验证码' }));

    await waitFor(() => {
      expect(authService.sendForgotPasswordCode).toHaveBeenCalledWith({ identity: 'alice@example.com' });
    });

    await user.type(screen.getByLabelText('验证码'), '123456');
    await user.click(screen.getByRole('button', { name: '校验验证码' }));

    await waitFor(() => {
      expect(authService.verifyForgotPasswordCode).toHaveBeenCalledWith({ identity: 'alice@example.com', code: '123456' });
    });

    await user.type(screen.getByLabelText('新密码'), 'newSecret');
    await user.type(screen.getByLabelText('确认新密码'), 'newSecret');
    await user.click(screen.getByRole('button', { name: '修改密码' }));

    await waitFor(() => {
      expect(authService.changeForgottenPassword).toHaveBeenCalledWith({
        passwordChangeToken: 'change-token-1',
        newPassword: 'newSecret',
      });
    });
    expect(saveAuthTokens).toHaveBeenCalledWith(loginResp);
    expect(authService.getCurrentUser).toHaveBeenCalledOnce();
    expect(await screen.findByText('首页')).toBeInTheDocument();
  });
});
