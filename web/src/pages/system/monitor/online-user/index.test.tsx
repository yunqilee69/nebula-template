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
    clientType: 'WEB',
    clientTypeSource: 'HEADER',
    loginType: 'PASSWORD',
    loginIp: '203.0.113.10',
    browser: 'Chrome',
    os: 'Mac',
    deviceType: 'PC',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    loginTime: '2026-08-10T08:00:00',
    lastActiveTime: '2026-08-10T08:30:00',
    expireTime: '2026-08-10T10:00:00',
    remainingTtlSeconds: 600,
  },
  {
    cacheKey: 'session:alice-mini',
    userId: 'user-1',
    username: 'alice',
    clientType: 'MP_WEIXIN',
    clientTypeSource: 'USER_AGENT',
    loginType: 'PASSWORD',
    loginIp: '203.0.113.11',
    deviceType: 'MOBILE',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) miniProgram',
    loginTime: '2026-08-10T09:00:00',
    remainingTtlSeconds: 300,
  },
];

function createService(): OnlineUserService {
  return {
    pageOnlineUsers: vi.fn().mockResolvedValue({ data: ONLINE_USERS, total: ONLINE_USERS.length }),
    kickOutOnlineUser: vi.fn().mockResolvedValue(undefined),
    kickOutOnlineUsers: vi.fn().mockResolvedValue(2),
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

    expect(await screen.findAllByText('alice')).toHaveLength(2);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('600s')).toBeInTheDocument();
  });

  it('renders the login origin columns for each session', async () => {
    renderPage();

    await screen.findAllByText('alice');
    expect(screen.getByText('Web 端')).toBeInTheDocument();
    expect(screen.getByText('微信小程序')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.10')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.11')).toBeInTheDocument();
    expect(screen.getByText('Chrome')).toBeInTheDocument();
    expect(screen.getByText('Mac')).toBeInTheDocument();
    expect(screen.getByText('2026-08-10 08:30:00')).toBeInTheDocument();
    expect(screen.getByText('电脑')).toBeInTheDocument();
    expect(screen.getByText('手机')).toBeInTheDocument();
  });

  it('exposes the raw User-Agent through the device type tooltip only', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findAllByText('alice');
    expect(screen.queryByText(/AppleWebKit/)).not.toBeInTheDocument();

    await user.hover(screen.getByText('电脑'));

    expect(await screen.findByText(/AppleWebKit/)).toBeInTheDocument();
  });

  it('submits username search filters to pageOnlineUsers', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findAllByText('alice');
    await user.type(screen.getByLabelText('用户名'), 'alice');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageOnlineUsers).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 10, tokenType: 'ACCESS_TOKEN', username: 'alice' });
    });
  });

  it('submits the login IP search filter to pageOnlineUsers', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findAllByText('alice');
    await user.type(screen.getByLabelText('登录IP'), '203.0.113.11');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageOnlineUsers).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 10, tokenType: 'ACCESS_TOKEN', loginIp: '203.0.113.11' });
    });
  });

  it('submits the client type search filter to pageOnlineUsers', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findAllByText('alice');
    await user.click(screen.getByLabelText('端类型'));
    await user.click(await screen.findByTitle('微信小程序'));
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageOnlineUsers).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 10, tokenType: 'ACCESS_TOKEN', clientType: 'MP_WEIXIN' });
    });
  });

  it('defaults the token type search filter to access tokens', async () => {
    const service = renderPage();

    await screen.findAllByText('alice');

    expect(screen.getByLabelText('令牌类型')).toBeInTheDocument();
    expect(await screen.findByTitle('鉴权Token')).toBeInTheDocument();
    await waitFor(() => {
      expect(service.pageOnlineUsers).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 10, tokenType: 'ACCESS_TOKEN' });
    });
  });

  it('queries refresh token sessions only after the token type filter is switched', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findAllByText('alice');
    await user.click(screen.getByLabelText('令牌类型'));
    await user.click(await screen.findByTitle('刷新Token'));
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageOnlineUsers).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 10, tokenType: 'REFRESH_TOKEN' });
    });
  });

  it('uses the table toolbar refresh instead of rendering a search-form refresh button', async () => {
    renderPage();

    await screen.findAllByText('alice');
    const userIdLabel = screen.getByText('用户ID');
    const searchForm = userIdLabel.closest('form');
    if (!(searchForm instanceof HTMLElement)) throw new Error('Unable to find online user search form');

    expect(within(searchForm).queryByRole('button', { name: /刷新/ })).not.toBeInTheDocument();
  });

  it('kicks out an online user and refreshes the list', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findAllByText('alice');
    const [kickOutButton] = screen.getAllByRole('button', { name: '踢出 alice' });
    await user.click(kickOutButton);
    const popup = await screen.findByText('确认踢出该在线用户？');
    const popover = popup.closest('.ant-popover');
    if (!(popover instanceof HTMLElement)) throw new Error('Unable to find online user kick-out confirmation');
    await user.click(within(popover).getByRole('button', { name: /^踢\s*出$/ }));

    await waitFor(() => expect(service.kickOutOnlineUser).toHaveBeenCalledWith('session:alice'));
    await waitFor(() => expect(service.pageOnlineUsers).toHaveBeenCalledTimes(2));
  });

  it('kicks out all sessions of a user and refreshes the list', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findAllByText('alice');
    const [kickOutAllButton] = screen.getAllByRole('button', { name: '踢出全部会话 alice' });
    await user.click(kickOutAllButton);
    const popup = await screen.findByText('确认踢出该用户的全部会话？');
    const popover = popup.closest('.ant-popover');
    if (!(popover instanceof HTMLElement)) throw new Error('Unable to find kick-out-all confirmation');
    await user.click(within(popover).getByRole('button', { name: /踢出全部会话/ }));

    await waitFor(() => expect(service.kickOutOnlineUsers).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(service.pageOnlineUsers).toHaveBeenCalledTimes(2));
  });
});
