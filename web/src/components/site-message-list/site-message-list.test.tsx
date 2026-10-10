import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useLocaleStore } from '@/stores/locale-store';
import { useNotifyStore } from '@/stores/notify';
import type { SiteMessageCategoryResp, SiteMessageResp } from '@/types/notify';
import { SiteMessageList } from './site-message-list';
import type { SiteMessageListService } from './site-message-list.types';

const message = (index: number, overrides: Partial<SiteMessageResp> = {}): SiteMessageResp => ({
  id: `message-${index}`,
  recordId: `record-${index}`,
  receiverUserId: 'current-user',
  title: `消息 ${index}`,
  content: `消息内容 ${index}`,
  categoryCode: 'SECURITY',
  categoryName: '安全与账号',
  readStatus: true,
  createTime: `2026-08-09 10:0${index}:00`,
  ...overrides,
});

const categories: readonly SiteMessageCategoryResp[] = [
  { code: 'SECURITY', name: '安全与账号', totalCount: 3, unreadCount: 2 },
  { code: 'BUSINESS', name: '业务提醒', totalCount: 1, unreadCount: 0 },
];

function createService(overrides: Partial<SiteMessageListService> = {}): SiteMessageListService {
  return {
    pageSiteMessages: vi.fn().mockResolvedValue({ data: [message(1), message(2)], total: 2 }),
    listSiteMessageCategories: vi.fn().mockResolvedValue(categories),
    markAllSiteMessagesRead: vi.fn().mockResolvedValue(0),
    markSiteMessageRead: vi.fn().mockResolvedValue(undefined),
    markSiteMessageUnread: vi.fn().mockResolvedValue(undefined),
    deleteSiteMessage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

interface RenderListOptions {
  readonly service?: SiteMessageListService;
  readonly onSelect?: (message: SiteMessageResp) => void;
  /** 显式传 undefined 表示「未登录」，不能用默认值兜底，故单独取键判断。 */
  readonly receiverUserId?: string | undefined;
  readonly selectedMessageId?: string;
  readonly pageSize?: number;
  readonly showMessageActions?: boolean;
  readonly reloadToken?: number;
  readonly onDataLoaded?: (messages: readonly SiteMessageResp[]) => void;
}

function renderList(options: RenderListOptions = {}) {
  const { service = createService(), onSelect = vi.fn(), ...rest } = options;
  const receiverUserId = 'receiverUserId' in options ? options.receiverUserId : 'current-user';
  render(
    <NebulaProvider>
      <SiteMessageList service={service} receiverUserId={receiverUserId} onSelect={onSelect} {...rest} />
    </NebulaProvider>,
  );
  return { service, onSelect };
}

describe('SiteMessageList', () => {
  beforeEach(() => {
    act(() => {
      useNotifyStore.getState().setUnreadCount(5);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
      useNotifyStore.setState(useNotifyStore.getInitialState(), true);
    });
  });

  it('loads the first page for the current user and renders category tags', async () => {
    const { service } = renderList();

    await waitFor(() => {
      expect(service.pageSiteMessages).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
        receiverUserId: 'current-user',
      });
    });

    expect(await screen.findByText('消息 1')).toBeInTheDocument();
    expect(screen.getByText('消息 2')).toBeInTheDocument();
    expect(screen.getAllByText('安全与账号')).toHaveLength(2);
  });

  it('scopes messages to the unread filter', async () => {
    const { service } = renderList();

    await screen.findByText('消息 1');
    fireEvent.click(screen.getByRole('radio', { name: '未读' }));

    await waitFor(() => {
      expect(service.pageSiteMessages).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 10,
        receiverUserId: 'current-user',
        readStatus: false,
      });
    });
  });

  it('scopes messages to the selected category and shows per-category unread counts', async () => {
    const user = userEvent.setup();
    const { service } = renderList();

    await screen.findByText('消息 1');
    await user.click(screen.getByRole('combobox', { name: '消息类别' }));

    expect(await screen.findByText('安全与账号 (2)')).toBeInTheDocument();

    await user.click(await screen.findByText('业务提醒', { selector: '.ant-select-item-option-content' }));

    await waitFor(() => {
      expect(service.pageSiteMessages).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 10,
        receiverUserId: 'current-user',
        categoryCode: 'BUSINESS',
      });
    });
  });

  it('keeps working when the category aggregate is unavailable', async () => {
    const { service } = renderList({
      service: createService({ listSiteMessageCategories: vi.fn().mockRejectedValue(new Error('boom')) }),
    });

    expect(await screen.findByText('消息 1')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '消息类别' })).toBeInTheDocument();
    expect(service.pageSiteMessages).toHaveBeenCalledOnce();
    expect(service.listSiteMessageCategories).toHaveBeenCalledOnce();
  });

  it('marks an unread message as read on open and decrements the badge', async () => {
    const user = userEvent.setup();
    const { service, onSelect } = renderList({
      service: createService({
        pageSiteMessages: vi.fn().mockResolvedValue({ data: [message(1, { readStatus: false })], total: 1 }),
      }),
    });

    await user.click(await screen.findByRole('listitem', { name: '消息 1' }));

    await waitFor(() => expect(service.markSiteMessageRead).toHaveBeenCalledWith('message-1'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'message-1' }));
    await waitFor(() => expect(useNotifyStore.getState().unreadCount).toBe(4));
  });

  it('does not mark an already read message again', async () => {
    const user = userEvent.setup();
    const { service } = renderList();

    await user.click(await screen.findByRole('listitem', { name: '消息 1' }));

    expect(service.markSiteMessageRead).not.toHaveBeenCalled();
    expect(useNotifyStore.getState().unreadCount).toBe(5);
  });

  it('rolls back the optimistic read state when marking read fails', async () => {
    const user = userEvent.setup();
    renderList({
      service: createService({
        pageSiteMessages: vi.fn().mockResolvedValue({ data: [message(1, { readStatus: false })], total: 1 }),
        markSiteMessageRead: vi.fn().mockRejectedValue(new Error('network error')),
      }),
    });

    await user.click(await screen.findByRole('listitem', { name: '消息 1' }));

    expect(await screen.findByText('标记已读失败，请重试')).toBeInTheDocument();
    expect(useNotifyStore.getState().unreadCount).toBe(5);
  });

  it('marks unread and deletes a single message when actions are enabled', async () => {
    const user = userEvent.setup();
    const { service } = renderList({ showMessageActions: true });

    await screen.findByText('消息 1');
    await user.click(screen.getByRole('button', { name: '标记未读 消息 1' }));
    await waitFor(() => expect(service.markSiteMessageUnread).toHaveBeenCalledWith('message-1'));
    await waitFor(() => expect(useNotifyStore.getState().unreadCount).toBe(6));

    await user.click(screen.getByRole('button', { name: '删除 消息 2' }));
    const popconfirm = document.querySelector('.ant-popover') ?? document.body;
    await user.click(await within(popconfirm as HTMLElement).findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(service.deleteSiteMessage).toHaveBeenCalledWith('message-2'));
    await waitFor(() => expect(screen.queryByText('消息 2')).not.toBeInTheDocument());
  });

  it('marks every unread message as read and corrects the badge by the affected count', async () => {
    const user = userEvent.setup();
    const markAllSiteMessagesRead = vi.fn().mockResolvedValue(3);
    const { service } = renderList({ service: createService({ markAllSiteMessagesRead }) });

    await screen.findByText('消息 1');
    await user.click(screen.getByRole('button', { name: /全部已读/ }));
    const popconfirm = document.querySelector('.ant-popover') ?? document.body;
    await user.click(await within(popconfirm as HTMLElement).findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(markAllSiteMessagesRead).toHaveBeenCalledWith({}));
    await waitFor(() => expect(useNotifyStore.getState().unreadCount).toBe(2));
    expect(await screen.findByText('已全部标为已读')).toBeInTheDocument();
    expect(service.pageSiteMessages).toHaveBeenCalledTimes(2);
  });

  it('forwards the active category when marking all as read', async () => {
    const user = userEvent.setup();
    const markAllSiteMessagesRead = vi.fn().mockResolvedValue(1);
    renderList({ service: createService({ markAllSiteMessagesRead }) });

    await screen.findByText('消息 1');
    await user.click(screen.getByRole('combobox', { name: '消息类别' }));
    await user.click(await screen.findByText('业务提醒', { selector: '.ant-select-item-option-content' }));
    await screen.findByText('消息 1');

    await user.click(screen.getByRole('button', { name: /全部已读/ }));
    const popconfirm = document.querySelector('.ant-popover') ?? document.body;
    await user.click(await within(popconfirm as HTMLElement).findByRole('button', { name: /确\s*定/ }));

    await waitFor(() => expect(markAllSiteMessagesRead).toHaveBeenCalledWith({ categoryCode: 'BUSINESS' }));
  });

  it('surfaces a recoverable error state and retries from page one', async () => {
    const user = userEvent.setup();
    const pageSiteMessages = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ data: [message(1)], total: 1 });
    renderList({ service: createService({ pageSiteMessages }) });

    expect(await screen.findByText('消息加载失败，请重试')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /重新加载/ }));

    expect(await screen.findByText('消息 1')).toBeInTheDocument();
    expect(pageSiteMessages).toHaveBeenLastCalledWith({
      pageNum: 1,
      pageSize: 10,
      receiverUserId: 'current-user',
    });
  });

  it('appends the next page when loading more', async () => {
    const user = userEvent.setup();
    const pageSiteMessages = vi.fn()
      .mockResolvedValueOnce({ data: [message(1)], total: 2 })
      .mockResolvedValueOnce({ data: [message(2)], total: 2 });
    renderList({ service: createService({ pageSiteMessages }), pageSize: 1 });

    await screen.findByText('消息 1');
    await user.click(screen.getByRole('button', { name: '加载更多' }));

    expect(await screen.findByText('消息 2')).toBeInTheDocument();
    expect(screen.getByText('消息 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '加载更多' })).not.toBeInTheDocument();
    expect(pageSiteMessages).toHaveBeenLastCalledWith({
      pageNum: 2,
      pageSize: 1,
      receiverUserId: 'current-user',
    });
  });

  it('renders an empty state without requesting anything when there is no receiver', async () => {
    const { service } = renderList({ receiverUserId: undefined });

    expect(await screen.findByText('暂无消息')).toBeInTheDocument();
    expect(service.pageSiteMessages).not.toHaveBeenCalled();
    expect(service.listSiteMessageCategories).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /全部已读/ })).toBeDisabled();
  });

  it('reloads from page one when the reload token changes', async () => {
    const service = createService();
    const { rerender } = render(
      <NebulaProvider>
        <SiteMessageList service={service} receiverUserId="current-user" onSelect={vi.fn()} reloadToken={0} />
      </NebulaProvider>,
    );

    await screen.findByText('消息 1');
    expect(service.pageSiteMessages).toHaveBeenCalledTimes(1);

    rerender(
      <NebulaProvider>
        <SiteMessageList service={service} receiverUserId="current-user" onSelect={vi.fn()} reloadToken={1} />
      </NebulaProvider>,
    );

    await waitFor(() => expect(service.pageSiteMessages).toHaveBeenCalledTimes(2));
  });
});
