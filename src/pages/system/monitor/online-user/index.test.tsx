import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { OnlineUserService } from '@/services/online-user';
import { clearAuthForTest, echoAuthAdapter, signInAsAdminForTest } from '@/test/auth-test-helpers';
import type { OnlineUserResp } from '@/types/online-user';
import { OnlineUserPage } from './index';

const ONLINE_USERS: readonly OnlineUserResp[] = [
  {
    cacheKey: 'session:alice',
    userId: 'user-1',
    username: 'alice',
    nickname: 'Alice',
    phone: '13800138000',
    email: 'alice@example.com',
    orgCodeList: ['HQ'],
    roleCodeList: ['ADMIN'],
    loginTime: '2026-08-10T08:00:00',
    expireTime: '2026-08-10T10:00:00',
    remainingTtlSeconds: 600,
  },
];

function createService(): OnlineUserService {
  return {
    pageOnlineUsers: vi.fn().mockResolvedValue({ data: ONLINE_USERS, total: ONLINE_USERS.length }),
    kickOutOnlineUser: vi.fn().mockResolvedValue(undefined),
  };
}

function renderPage(service = createService()): OnlineUserService {
  signInAsAdminForTest();
  render(
    <NebulaProvider authAdapter={echoAuthAdapter}>
      <OnlineUserPage service={service} />
    </NebulaProvider>,
  );

  return service;
}

describe('OnlineUserPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    clearAuthForTest();
  });

  it('renders online users from the injected service', async () => {
    renderPage();

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('600s')).toBeInTheDocument();
  });

  it('submits username search filters to pageOnlineUsers', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('alice');
    await user.type(screen.getByLabelText('用户名'), 'alice');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageOnlineUsers).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 10, username: 'alice' });
    });
  });

  it('uses the table toolbar refresh instead of rendering a search-form refresh button', async () => {
    renderPage();

    await screen.findByText('alice');
    const userIdLabel = screen.getByText('用户ID');
    const searchForm = userIdLabel.closest('form');
    if (!(searchForm instanceof HTMLElement)) throw new Error('Unable to find online user search form');

    expect(within(searchForm).queryByRole('button', { name: /刷新/ })).not.toBeInTheDocument();
  });

  it('kicks out an online user and refreshes the list', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('alice');
    await user.click(screen.getByRole('button', { name: '踢出用户 alice' }));
    const popup = await screen.findByText('确认踢出该在线用户？');
    const popover = popup.closest('.ant-popover');
    if (!(popover instanceof HTMLElement)) throw new Error('Unable to find online user kick-out confirmation');
    await user.click(within(popover).getByRole('button', { name: /踢\s*出/ }));

    await waitFor(() => expect(service.kickOutOnlineUser).toHaveBeenCalledWith('session:alice'));
    await waitFor(() => expect(service.pageOnlineUsers).toHaveBeenCalledTimes(2));
  });
});
