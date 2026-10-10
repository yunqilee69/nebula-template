import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useLocaleStore } from '@/stores/locale-store';
import { useNotifyStore } from '@/stores/notify';
import type { SiteMessageCategoryResp, SiteMessageResp } from '@/types/notify';
import { NotificationInboxPage, type InboxService } from './index';

const messages: readonly SiteMessageResp[] = [
  {
    id: 'message-unread',
    recordId: 'record-1',
    receiverUserId: 'current-user',
    title: '审批结果通知',
    content: '您提交的采购申请已经通过审批，可以继续后续流程。',
    categoryCode: 'TODO',
    categoryName: '待办与审批',
    readStatus: false,
    createTime: '2026-08-09 10:00:00',
  },
  {
    id: 'message-read',
    recordId: 'record-2',
    receiverUserId: 'current-user',
    title: '系统维护完成',
    content: '系统维护已经完成，所有服务均已恢复。',
    categoryCode: 'DEFAULT',
    categoryName: '其他通知',
    readStatus: true,
    readTime: '2026-08-09 09:30:00',
    createTime: '2026-08-09 09:00:00',
  },
];

const categories: readonly SiteMessageCategoryResp[] = [
  { code: 'TODO', name: '待办与审批', totalCount: 1, unreadCount: 1 },
];

function createService(overrides: Partial<InboxService> = {}): InboxService {
  return {
    pageSiteMessages: vi.fn().mockResolvedValue({ data: [...messages], total: messages.length }),
    listSiteMessageCategories: vi.fn().mockResolvedValue(categories),
    markAllSiteMessagesRead: vi.fn().mockResolvedValue(0),
    markSiteMessageRead: vi.fn().mockResolvedValue(undefined),
    markSiteMessageUnread: vi.fn().mockResolvedValue(undefined),
    deleteSiteMessage: vi.fn().mockResolvedValue(undefined),
    markSiteMessagesRead: vi.fn().mockResolvedValue(undefined),
    markSiteMessagesUnread: vi.fn().mockResolvedValue(undefined),
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
      useNotifyStore.getState().setUnreadCount(2);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
      useAuthStore.getState().clearUser();
      useNotifyStore.setState(useNotifyStore.getInitialState(), true);
    });
  });

  it('renders the shared site message list with the messages and announcements tabs', async () => {
    const service = renderPage();

    await screen.findByText('审批结果通知');

    expect(screen.getByRole('tab', { name: '站内信' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '公告' })).toBeInTheDocument();
    expect(screen.getByText('待办与审批')).toBeInTheDocument();
    expect(screen.getByText('系统维护完成')).toBeInTheDocument();
    expect(service.pageSiteMessages).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 10,
      receiverUserId: 'current-user',
    });
  });

  it('opens and marks the URL-selected unread message', async () => {
    const service = renderPage(createService(), '/notify/inbox?messageId=message-unread');

    const dialog = await screen.findByRole('dialog');
    // 详情先渲染骨架屏，等列表把这条消息带回来才补上正文
    expect(await within(dialog).findByRole('heading', { name: '审批结果通知' })).toBeInTheDocument();
    expect(within(dialog).getByText('您提交的采购申请已经通过审批，可以继续后续流程。')).toBeInTheDocument();
    await waitFor(() => expect(service.markSiteMessageRead).toHaveBeenCalledWith('message-unread'));
    await waitFor(() => expect(useNotifyStore.getState().unreadCount).toBe(1));
  });

  it('marks a message read when its row is opened and closes the detail back to the list', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await user.click(await screen.findByRole('listitem', { name: '审批结果通知' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('您提交的采购申请已经通过审批，可以继续后续流程。')).toBeInTheDocument();
    await waitFor(() => expect(service.markSiteMessageRead).toHaveBeenCalledWith('message-unread'));

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('deletes a message from the row actions', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('审批结果通知');
    await user.click(screen.getByRole('button', { name: '删除 审批结果通知' }));
    const popconfirm = document.querySelector('.ant-popover') ?? document.body;
    await user.click(await within(popconfirm as HTMLElement).findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(service.deleteSiteMessage).toHaveBeenCalledWith('message-unread'));
    await waitFor(() => expect(screen.queryByText('审批结果通知')).not.toBeInTheDocument());
  });

  it('batch marks selected messages read', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('审批结果通知');
    await user.click(screen.getByRole('checkbox', { name: '选择 审批结果通知' }));
    expect(await screen.findByText(/1 项已选/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '标记为已读' }));

    await waitFor(() => expect(service.markSiteMessagesRead).toHaveBeenCalledWith(['message-unread']));
    await waitFor(() => expect(useNotifyStore.getState().unreadCount).toBe(1));
    expect(await screen.findByText('已标记为已读')).toBeInTheDocument();
    await waitFor(() => expect(service.pageSiteMessages).toHaveBeenCalledTimes(2));
  });

  it('batch marks selected messages unread', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('系统维护完成');
    await user.click(screen.getByRole('checkbox', { name: '选择 系统维护完成' }));
    await user.click(screen.getByRole('button', { name: '标记为未读' }));

    await waitFor(() => expect(service.markSiteMessagesUnread).toHaveBeenCalledWith(['message-read']));
    await waitFor(() => expect(useNotifyStore.getState().unreadCount).toBe(3));
  });

  it('selects every loaded message from the toolbar checkbox', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('审批结果通知');
    await user.click(screen.getByRole('checkbox', { name: '全选' }));

    expect(await screen.findByText(/2 项已选/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '标记为已读' }));
    await waitFor(() => expect(service.markSiteMessagesRead).toHaveBeenCalledWith(['message-unread', 'message-read']));
  });

  it('reports a failed batch action without clearing the selection', async () => {
    const user = userEvent.setup();
    renderPage(createService({
      markSiteMessagesRead: vi.fn().mockRejectedValue(new Error('network error')),
    }));

    await screen.findByText('审批结果通知');
    await user.click(screen.getByRole('checkbox', { name: '选择 审批结果通知' }));
    await user.click(screen.getByRole('button', { name: '标记为已读' }));

    expect(await screen.findByText('批量标记已读失败，请重试')).toBeInTheDocument();
    expect(screen.getByText(/1 项已选/)).toBeInTheDocument();
    expect(useNotifyStore.getState().unreadCount).toBe(2);
  });

  it('switches to the announcements tab', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('审批结果通知');
    await user.click(screen.getByRole('tab', { name: '公告' }));

    await waitFor(() => expect(service.pageCurrentAnnouncements).toHaveBeenCalled());
  });

  it('renders a useful empty state', async () => {
    renderPage(createService({
      pageSiteMessages: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    }));

    expect(await screen.findByText('暂无消息')).toBeInTheDocument();
  });
});
