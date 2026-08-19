import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
  readStatus: index > 1,
  createTime: `2026-08-09 10:0${index}:00`,
}));

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createService(overrides: Partial<NotificationBellService> = {}): NotificationBellService {
  return {
    getUnreadSiteMessageCount: vi.fn().mockResolvedValue(4),
    pageSiteMessages: vi.fn().mockResolvedValue({ data: [], total: 0 }),
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
    expect(screen.getByRole('button', { name: '通知，4 条未读' })).toBeInTheDocument();
  });

  it('refreshes the unread count every 60 seconds', async () => {
    vi.useFakeTimers();
    const getUnreadSiteMessageCount = vi.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    renderBell(createService({ getUnreadSiteMessageCount }));

    await act(async () => Promise.resolve());
    expect(getUnreadSiteMessageCount).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(getUnreadSiteMessageCount).toHaveBeenCalledTimes(2);
    expect(useNotifyStore.getState().unreadCount).toBe(2);
  });

  it('cleans up polling and ignores stale unread responses after logout', async () => {
    vi.useFakeTimers();
    const unreadRequest = deferred<number>();
    const getUnreadSiteMessageCount = vi.fn().mockReturnValue(unreadRequest.promise);
    renderBell(createService({ getUnreadSiteMessageCount }));

    await act(async () => Promise.resolve());
    expect(getUnreadSiteMessageCount).toHaveBeenCalledOnce();

    act(() => useAuthStore.getState().clearUser());
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      unreadRequest.resolve(9);
      await Promise.resolve();
    });

    expect(getUnreadSiteMessageCount).toHaveBeenCalledOnce();
    expect(useNotifyStore.getState().unreadCount).toBe(0);
    expect(screen.queryByRole('button', { name: /通知/ })).not.toBeInTheDocument();
  });

  it('loads up to five unread current-user messages in backend order when opened', async () => {
    const user = userEvent.setup();
    const previewRequest = deferred<{ data: SiteMessageResp[]; total: number }>();
    const service = renderBell(createService({
      pageSiteMessages: vi.fn().mockReturnValue(previewRequest.promise),
    }));

    await user.click(await screen.findByRole('button', { name: '通知，4 条未读' }));

    expect(await screen.findByText('正在加载消息')).toBeInTheDocument();
    expect(service.pageSiteMessages).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 5,
      receiverUserId: 'current-user',
      readStatus: false,
    });

    await act(async () => previewRequest.resolve({ data: [...messages.slice(0, 2)], total: 2 }));

    const menu = await screen.findByRole('menu', { name: '通知消息' });
    const renderedMessages = within(menu).getAllByRole('menuitem').slice(0, 2);
    expect(renderedMessages.map((item) => item.textContent)).toEqual([
      '消息 12026-08-09 10:00:00未读',
      '消息 22026-08-09 10:01:00未读',
    ]);
    expect(within(menu).queryByText('消息 3')).not.toBeInTheDocument();
  });

  it('shows a useful empty state when the current user has no messages', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByRole('button', { name: '通知，4 条未读' }));

    expect(await screen.findByText('暂无消息')).toBeInTheDocument();
    expect(screen.getByText('当前没有站内消息')).toBeInTheDocument();
  });

  it('shows a recoverable error state when loading the preview fails', async () => {
    const user = userEvent.setup();
    renderBell(createService({
      pageSiteMessages: vi.fn().mockRejectedValue(new Error('network error')),
    }));

    await user.click(await screen.findByRole('button', { name: '通知，4 条未读' }));

    expect(await screen.findByText('消息加载失败')).toBeInTheDocument();
    expect(screen.getByText('请检查网络后重试')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '重新加载' })).toBeInTheDocument();
  });

  it('retries preview loading from the error state', async () => {
    const user = userEvent.setup();
    const pageSiteMessages = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ data: [messages[0]], total: 1 });
    renderBell(createService({ pageSiteMessages }));

    await user.click(await screen.findByRole('button', { name: '通知，4 条未读' }));
    await user.click(await screen.findByRole('menuitem', { name: '重新加载' }));

    expect(pageSiteMessages).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('消息 1')).toBeInTheDocument();
  });

  it('navigates to the notification inbox from the preview menu', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByRole('button', { name: '通知，4 条未读' }));
    await user.click(await screen.findByRole('menuitem', { name: '查看全部消息' }));

    expect(await screen.findByRole('heading', { name: '通知收件箱' })).toBeInTheDocument();
  });

  it('requests an inbox route tab before opening a specific preview message', async () => {
    const user = userEvent.setup();
    const onOpenInboxTab = vi.fn();
    renderBell(createService({ pageSiteMessages: vi.fn().mockResolvedValue({ data: [messages[0]], total: 1 }) }), onOpenInboxTab);

    await user.click(await screen.findByRole('button', { name: '通知，4 条未读' }));
    await user.click(await screen.findByRole('menuitem', { name: /消息 1/ }));

    expect(onOpenInboxTab).toHaveBeenCalledWith('/notify/inbox');
    expect(await screen.findByRole('heading', { name: '通知收件箱' })).toBeInTheDocument();
  });
});
