import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useNotifyStore } from '@/stores/notify';
import type { SiteMessageResp } from '@/types/notify';
import { NotificationInboxPage, type InboxService } from './index';

const messages: readonly SiteMessageResp[] = [
  {
    id: 'message-unread',
    recordId: 'record-1',
    receiverUserId: 'current-user',
    title: '审批结果通知',
    content: '您提交的采购申请已经通过审批，可以继续后续流程。',
    readStatus: false,
    createTime: '2026-08-09 10:00:00',
  },
  {
    id: 'message-read',
    recordId: 'record-2',
    receiverUserId: 'current-user',
    title: '系统维护完成',
    content: '系统维护已经完成，所有服务均已恢复。',
    readStatus: true,
    readTime: '2026-08-09 09:30:00',
    createTime: '2026-08-09 09:00:00',
  },
];

type InboxServiceWithDeletion = InboxService & {
  readonly deleteSiteMessage: (id: string) => Promise<void>;
  readonly markSiteMessageUnread: (id: string) => Promise<void>;
};

function createService(overrides: Partial<InboxServiceWithDeletion> = {}): InboxServiceWithDeletion {
  return {
    pageSiteMessages: vi.fn().mockResolvedValue({ data: [...messages], total: messages.length }),
    markSiteMessageRead: vi.fn().mockResolvedValue(undefined),
    markSiteMessageUnread: vi.fn().mockResolvedValue(undefined),
    markSiteMessagesRead: vi.fn().mockResolvedValue(undefined),
    markSiteMessagesUnread: vi.fn().mockResolvedValue(undefined),
    deleteSiteMessage: vi.fn().mockResolvedValue(undefined),
    pageCurrentAnnouncements: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    markAnnouncementRead: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderPage(service = createService(), initialEntry = '/notify/inbox') {
  const currentUser = useAuthStore.getState().user;
  render(
    <NebulaProvider authAdapter={{ getCurrentUser: async () => currentUser }}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/notify/inbox" element={<NotificationInboxPage service={service} />} />
        </Routes>
      </MemoryRouter>
    </NebulaProvider>,
  );
  return service;
}

describe('NotificationInboxPage', () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.getState().setUser({
        id: 'current-user',
        name: 'Current User',
        roles: [],
        permissions: [],
      });
    });
  });

  afterEach(() => {
    cleanup();
    act(() => {
      useAuthStore.getState().clearUser();
      useNotifyStore.setState(useNotifyStore.getInitialState(), true);
    });
  });

  it('renders a table with a creation-time range filter', async () => {
    const service = renderPage();

    await screen.findByText('审批结果通知');

    expect(screen.getAllByRole('textbox', { name: '创建时间范围' })).toHaveLength(2);
    expect(service.pageSiteMessages).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 20,
      receiverUserId: 'current-user',
    });
  });

  it('opens and marks the URL-selected unread message', async () => {
    const service = renderPage(createService(), '/notify/inbox?messageId=message-unread');

    expect(await screen.findByRole('dialog', { name: '消息详情' })).toBeInTheDocument();
    expect(screen.getByText('您提交的采购申请已经通过审批，可以继续后续流程。')).toBeInTheDocument();
    await waitFor(() => expect(service.markSiteMessagesRead).toHaveBeenCalledWith(['message-unread']));
  });

  it('deletes a message from the table action column and refreshes the table', async () => {
    const user = userEvent.setup();
    const service = createService({
      pageSiteMessages: vi.fn()
        .mockResolvedValueOnce({ data: [...messages], total: messages.length })
        .mockResolvedValue({ data: [messages[1]], total: 1 }),
    });
    renderPage(service);

    await screen.findByText('审批结果通知');
    expect(screen.queryByRole('dialog', { name: '消息详情' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '删除消息 审批结果通知' }));
    await user.click(screen.getByRole('button', { name: /^删\s*除$/ }));

    await waitFor(() => expect(service.deleteSiteMessage).toHaveBeenCalledWith('message-unread'));
    await waitFor(() => expect(screen.queryByText('审批结果通知')).not.toBeInTheDocument());
  });

  it('marks selected messages read from the table toolbar', async () => {
    const user = userEvent.setup();
    const service = createService();
    renderPage(service);

    await screen.findByText('审批结果通知');
    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: '批量标记为已读' }));

    await waitFor(() => expect(service.markSiteMessagesRead).toHaveBeenCalledWith(['message-unread']));
    expect(screen.queryByRole('button', { name: '标记为已读 审批结果通知' })).not.toBeInTheDocument();
  });

  it('marks selected messages unread from the table toolbar', async () => {
    const user = userEvent.setup();
    const service = createService();
    renderPage(service);

    await screen.findByText('系统维护完成');
    await user.click(screen.getAllByRole('checkbox')[2]);
    await user.click(screen.getByRole('button', { name: '批量标记为未读' }));

    await waitFor(() => expect(service.markSiteMessagesUnread).toHaveBeenCalledWith(['message-read']));
    expect(screen.queryByRole('button', { name: '标记为未读 系统维护完成' })).not.toBeInTheDocument();
  });

  it('renders a useful empty state', async () => {
    renderPage(createService({
      pageSiteMessages: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    }));

    expect(await screen.findByText('暂无消息')).toBeInTheDocument();
  });
});
