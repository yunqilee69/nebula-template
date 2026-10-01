import { render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthService } from '@/api/auth';
import type { WechatWebPrepareResp, WechatWebStatusResp } from '@/types/auth';
import { WechatWebPanel } from './wechat-web-panel';

vi.mock('@/utils/auth/token-session', () => ({
  saveAuthTokens: vi.fn(),
  getStoredAccessToken: vi.fn(() => null),
  getStoredRefreshToken: vi.fn(() => null),
  clearAuthTokens: vi.fn(),
}));

const prepareResp: WechatWebPrepareResp = {
  loginId: 'login-1',
  state: 'state-1',
  status: 'WAITING',
  authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect?appid=wx-app&state=state-1',
};

function createAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    getAuthConfig: vi.fn(),
    login: vi.fn(),
    phoneLogin: vi.fn(),
    emailLogin: vi.fn(),
    register: vi.fn(),
    sendPhoneCode: vi.fn(),
    sendEmailCode: vi.fn(),
    sendForgotPasswordCode: vi.fn(),
    verifyForgotPasswordCode: vi.fn(),
    changeForgottenPassword: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    prepareGitHubRedirect: vi.fn(),
    getGitHubLoginStatus: vi.fn(),
    completeGitHubRedirectCallback: vi.fn(),
    prepareWechatWebRedirect: vi.fn().mockResolvedValue(prepareResp),
    getWechatWebLoginStatus: vi.fn(),
    completeWechatWebCallback: vi.fn(),
    claimWechatWebToken: vi.fn(),
    ...overrides,
  } as AuthService;
}

// fake timers 下 waitFor 的 setInterval 轮询不会触发，统一用
// advanceTimersByTimeAsync 推进时钟并冲刷微任务后做同步断言。
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

async function advancePoll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
}

describe('WechatWebPanel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('embeds the qrconnect authorize page and polls status until success', async () => {
    vi.useFakeTimers();
    const successResult: WechatWebStatusResp = {
      loginId: 'login-1',
      status: 'SUCCESS',
      loginResult: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresIn: 7200,
        refreshTokenExpiresIn: 604800,
      },
    };
    const authService = createAuthService({
      getWechatWebLoginStatus: vi.fn()
        .mockResolvedValueOnce({ loginId: 'login-1', status: 'WAITING' })
        .mockResolvedValueOnce({ loginId: 'login-1', status: 'SCANNED' })
        .mockResolvedValue(successResult),
    });
    const onSuccess = vi.fn();

    render(<WechatWebPanel authService={authService} onSuccess={onSuccess} />);

    await flush();

    expect(authService.prepareWechatWebRedirect).toHaveBeenCalledWith({ redirectAfterLogin: '/' });
    expect(screen.getByTestId('wechat-web-iframe')).toHaveAttribute('src', prepareResp.authorizeUrl);

    await advancePoll();
    await advancePoll();
    await advancePoll();

    expect(onSuccess).toHaveBeenCalledWith(successResult);
    expect(screen.getByTestId('wechat-web-success')).toBeInTheDocument();
    expect(authService.getWechatWebLoginStatus).toHaveBeenCalledWith('login-1');
  });

  it('shows error with retry when authorization fails', async () => {
    vi.useFakeTimers();
    const authService = createAuthService({
      getWechatWebLoginStatus: vi.fn().mockResolvedValue({ loginId: 'login-1', status: 'FAILED' }),
    });

    render(<WechatWebPanel authService={authService} onSuccess={vi.fn()} />);

    await flush();
    expect(screen.getByTestId('wechat-web-iframe')).toBeInTheDocument();

    await advancePoll();

    expect(screen.getByTestId('wechat-web-error')).toBeInTheDocument();
    expect(screen.getByTestId('wechat-web-retry')).toBeInTheDocument();
  });

  it('shows error when prepare fails before the panel is shown', async () => {
    const authService = createAuthService({
      prepareWechatWebRedirect: vi.fn().mockRejectedValue(new Error('prepare failed')),
    });

    render(<WechatWebPanel authService={authService} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('wechat-web-error')).toBeInTheDocument();
    });
  });

  it('restarts the flow from prepare when retrying after failure', async () => {
    vi.useFakeTimers();
    const authService = createAuthService({
      getWechatWebLoginStatus: vi.fn().mockResolvedValue({ loginId: 'login-1', status: 'EXPIRED' }),
    });

    render(<WechatWebPanel authService={authService} onSuccess={vi.fn()} />);

    await flush();
    expect(screen.getByTestId('wechat-web-iframe')).toBeInTheDocument();

    await advancePoll();
    expect(screen.getByTestId('wechat-web-retry')).toBeInTheDocument();

    await act(async () => {
      (screen.getByTestId('wechat-web-retry') as HTMLButtonElement).click();
    });
    await flush();

    expect(authService.prepareWechatWebRedirect).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('wechat-web-iframe')).toBeInTheDocument();
  });
});
