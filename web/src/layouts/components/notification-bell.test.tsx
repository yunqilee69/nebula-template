import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifyStore } from '@/stores/notify';
import type { SiteMessageResp } from '@/types/notify';
import { NotificationBell, type NotificationBellService } from './notification-bell';

const messages: readonly SiteMessageResp[] = Array.from({ length: 6 }, (_, index) => ({
  id: `message-${index + 1}`,
  recordId: `record-${index + 1}`,
  receiverUserId: 'current-user',
  title: `消息 ${index + 1}`,
  content: `消息内容 ${index + 1}`,
  categoryCode: 'SECURITY',
  categoryName: '安全与账号',
  readStatus: index > 1,
  createTime: `2026-08-09 10:0${index}:00`,
}));

function createService(overrides: Partial<NotificationBellService> = {}): NotificationBellService {
  return {
    getUnreadSiteMessageCount: vi.fn().mockResolvedValue(4),
    pageSiteMessages: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    listSiteMessageCategories: vi.fn().mockResolvedValue([]),
    markAllSiteMessagesRead: vi.fn().mockResolvedValue(0),
    markSiteMessageRead: vi.fn().mockResolvedValue(undefined),
    markSiteMessageUnread: vi.fn().mockResolvedValue(undefined),
    deleteSiteMessage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderBell(service = createService(), onOpenInboxTab?: (path: string) => void) {
  const currentUser = useAuthStore.getState().user;
  render(
    <NebulaProvider authAdapter={{ getCurrentUser: async () => currentUser }}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<NotificationBell service={service} onOpenInboxTab={onOpenInboxTab} />} />
          <Route path="/notify/inbox" element={<h1>通知收件箱</h1>} />
        </Routes>
      </MemoryRouter>
    </NebulaProvider>,
  );
  return service;
}

describe('NotificationBell', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().setUser({
        id: 'current-user',
        name: 'Current User',
        roles: [],
        permissions: [],
      });
      useNotifyStore.getState().setUnreadCount(0);
    });
  });

  afterEach(() => {
    cleanup();
    act(() => {
      useAuthStore.getState().clearUser();
      useNotifyStore.setState(useNotifyStore.getInitialState(), true);
    });
    vi.useRealTimers();
  });

  it('syncs the unread count immediately for the authenticated user', async () => {
    const service = renderBell();

    await waitFor(() => expect(service.getUnreadSiteMessageCount).toHaveBeenCalledOnce());

    expect(useNotifyStore.getState().unreadCount).toBe(4);
    expect(await screen.findByRole('button', { name: '通知，4 条未读' })).toBeInTheDocument();
  });

  it('falls back to polling the unread count every 5 minutes', async () => {
    vi.useFakeTimers();
    const getUnreadSiteMessageCount = vi.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    renderBell(createService({ getUnreadSiteMessageCount }));

    await act(async () => Promise.resolve());
    expect(getUnreadSiteMessageCount).toHaveBeenCalledTimes(1);

    // 实时通道是主路径，轮询只作兜底：不再按分钟级频率打扰后端
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(getUnreadSiteMessageCount).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(240_000);
      await Promise.resolve();
    });

    expect(getUnreadSiteMessageCount).toHaveBeenCalledTimes(2);
    expect(useNotifyStore.getState().unreadCount).toBe(2);
  });

  it('refreshes the unread count when the page becomes visible again', async () => {
    const getUnreadSiteMessageCount = vi.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5);
    renderBell(createService({ getUnreadSiteMessageCount }));

    await waitFor(() => expect(getUnreadSiteMessageCount).toHaveBeenCalledTimes(1));

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    await waitFor(() => expect(getUnreadSiteMessageCount).toHaveBeenCalledTimes(2));
    expect(useNotifyStore.getState().unreadCount).toBe(5);
  });

  it('reflects unread counts pushed by the realtime channel without polling', async () => {
    const service = renderBell();

    await waitFor(() => expect(service.getUnreadSiteMessageCount).toHaveBeenCalledOnce());

    act(() => useNotifyStore.getState().setUnreadCount(9));

    expect(await screen.findByRole('button', { name: '通知，9 条未读' })).toBeInTheDocument();
    expect(service.getUnreadSiteMessageCount).toHaveBeenCalledOnce();
  });

  it('cleans up polling and ignores stale unread responses after logout', async () => {
    vi.useFakeTimers();
    let resolveUnreadCount: (value: number) => void = () => undefined;
    const getUnreadSiteMessageCount = vi.fn().mockReturnValue(
      new Promise<number>((resolvePromise) => {
        resolveUnreadCount = resolvePromise;
      }),
    );
    renderBell(createService({ getUnreadSiteMessageCount }));

    await act(async () => Promise.resolve());
    expect(getUnreadSiteMessageCount).toHaveBeenCalledOnce();

    act(() => useAuthStore.getState().clearUser());
    await act(async () => {
      vi.advanceTimersByTime(300_000);
      resolveUnreadCount(9);
      await Promise.resolve();
    });

    expect(getUnreadSiteMessageCount).toHaveBeenCalledOnce();
    expect(useNotifyStore.getState().unreadCount).toBe(0);
    expect(screen.queryByRole('button', { name: /通知/ })).not.toBeInTheDocument();
  });

  it('opens the notification panel and lists the current user messages', async () => {
    const user = userEvent.setup();
    const service = renderBell(createService({
      pageSiteMessages: vi.fn().mockResolvedValue({ data: [...messages.slice(0, 2)], total: 2 }),
    }));

    await user.click(await screen.findByRole('button', { name: '通知，4 条未读' }));

    expect(await screen.findByRole('region', { name: '站内信' })).toBeInTheDocument();
    expect(await screen.findByText('消息 1')).toBeInTheDocument();
    expect(screen.getByText('消息 2')).toBeInTheDocument();
    expect(screen.queryByText('消息 3')).not.toBeInTheDocument();
    expect(service.pageSiteMessages).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      receiverUserId: 'current-user',
    });
  });

  it('shows an empty state when the current user has no messages', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByRole('button', { name: '通知，4 条未读' }));

    expect(await screen.findByText('暂无消息')).toBeInTheDocument();
  });

  it('navigates to the notification inbox from the panel', async () => {
    const user = userEvent.setup();
    const onOpenInboxTab = vi.fn();
    renderBell(createService(), onOpenInboxTab);

    await user.click(await screen.findByRole('button', { name: '通知，4 条未读' }));
    await user.click(await screen.findByRole('button', { name: '查看更多' }));

    expect(onOpenInboxTab).toHaveBeenCalledWith('/notify/inbox');
    expect(await screen.findByRole('heading', { name: '通知收件箱' })).toBeInTheDocument();
  });

  it('opens the message detail inside the panel without leaving the page', async () => {
    const user = userEvent.setup();
    renderBell(createService({
      pageSiteMessages: vi.fn().mockResolvedValue({ data: [messages[0]], total: 1 }),
    }));

    await user.click(await screen.findByRole('button', { name: '通知，4 条未读' }));
    await user.click(await screen.findByRole('listitem', { name: '消息 1' }));

    expect(await screen.findByText('消息内容 1')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '通知收件箱' })).not.toBeInTheDocument();
  });
});
