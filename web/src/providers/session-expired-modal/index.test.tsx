import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App as AntdApp, ConfigProvider } from 'antd';
import { notifySessionExpired, resolveSessionExpired, subscribeSessionExpired } from '@/utils/auth/session-expired';
import { SessionExpiredModal } from './index';

vi.mock('@/utils/auth/token-session', () => ({
  clearAuthTokens: vi.fn(),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn().mockReturnValue(vi.fn()),
}));

import { clearAuthTokens } from '@/utils/auth/token-session';
import { useAuthStore } from '@/stores/auth-store';

const mockClearAuthTokens = vi.mocked(clearAuthTokens);
const mockClearUser = vi.fn();

afterEach(() => {
  resolveSessionExpired();
});

beforeEach(() => {
  vi.mocked(useAuthStore).mockReturnValue(mockClearUser);
  mockClearUser.mockClear();
});

describe('session expiration bridge', () => {
  it('notifies active subscribers once per notification', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSessionExpired(listener);

    notifySessionExpired();

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    notifySessionExpired();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('SessionExpiredModal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    mockClearAuthTokens.mockClear();
  });

  it('shows a modal when session expires and lets the user stay on the current page without clearing auth state', async () => {
    const user = userEvent.setup();

    render(
      <ConfigProvider>
        <AntdApp>
          <SessionExpiredModal />
        </AntdApp>
      </ConfigProvider>,
    );

    await act(async () => {
      notifySessionExpired();
    });

    expect(await screen.findByText('登录状态已失效')).toBeInTheDocument();
    expect(screen.getByText('当前登录状态已失效，请重新登录后继续操作。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新登录' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '留在当前页面' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '留在当前页面' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '重新登录' })).not.toBeInTheDocument();
    });
    expect(mockClearAuthTokens).not.toHaveBeenCalled();
    expect(mockClearUser).not.toHaveBeenCalled();
  });

  it('sends the current route as redirect when the user chooses to log in again', async () => {
    const user = userEvent.setup();
    const assign = vi.fn();

    vi.stubGlobal('location', {
      pathname: '/dashboard',
      search: '?tab=home',
      hash: '#section',
      assign,
    });

    render(
      <ConfigProvider>
        <AntdApp>
          <SessionExpiredModal />
        </AntdApp>
      </ConfigProvider>,
    );

    await act(async () => {
      notifySessionExpired();
    });

    await user.click(await screen.findByRole('button', { name: '重新登录' }));

    expect(mockClearAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockClearUser).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('/login?redirect=%2Fdashboard%3Ftab%3Dhome%23section');
  });
});
