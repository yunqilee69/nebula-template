import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotifyPreferenceService } from '@/api/notify-preference';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useLocaleStore } from '@/stores/locale-store';
import { useNotifyStore } from '@/stores/notify';
import type { NotifyPreferenceResp, SiteMessageCategoryResp, SiteMessageResp } from '@/types/notify';
import type { SiteMessageListService } from '@/components/site-message-list/site-message-list.types';
import { NotificationPanel } from './notification-panel';

const message: SiteMessageResp = {
  id: 'message-1',
  recordId: 'record-1',
  receiverUserId: 'current-user',
  title: '登录异常提醒',
  content: '检测到你的账号在新设备登录',
  categoryCode: 'SECURITY',
  categoryName: '安全与账号',
  readStatus: true,
  createTime: '2026-08-09 10:00:00',
};

const preference: NotifyPreferenceResp = {
  categories: [
    {
      code: 'SECURITY',
      name: '安全与账号',
      mandatory: true,
      sort: 10,
      channels: [{ channel: 'SITE', enabled: true, editable: false }],
    },
  ],
};

function createService(overrides: Partial<SiteMessageListService> = {}): SiteMessageListService {
  return {
    pageSiteMessages: vi.fn().mockResolvedValue({ data: [message], total: 1 }),
    listSiteMessageCategories: vi.fn().mockResolvedValue([] as readonly SiteMessageCategoryResp[]),
    markAllSiteMessagesRead: vi.fn().mockResolvedValue(0),
    markSiteMessageRead: vi.fn().mockResolvedValue(undefined),
    markSiteMessageUnread: vi.fn().mockResolvedValue(undefined),
    deleteSiteMessage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createPreferenceService(overrides: Partial<NotifyPreferenceService> = {}): NotifyPreferenceService {
  return {
    getPreference: vi.fn().mockResolvedValue(preference),
    updatePreference: vi.fn().mockResolvedValue(preference),
    resetPreference: vi.fn().mockResolvedValue(preference),
    ...overrides,
  };
}

function renderPanel({
  service = createService(),
  preferenceService = createPreferenceService(),
  openToken = 1,
  onViewAll = vi.fn(),
  onClose = vi.fn(),
}: {
  service?: SiteMessageListService;
  preferenceService?: NotifyPreferenceService;
  openToken?: number;
  onViewAll?: () => void;
  onClose?: () => void;
} = {}) {
  const view = render(
    <NebulaProvider>
      <NotificationPanel
        service={service}
        preferenceService={preferenceService}
        receiverUserId="current-user"
        openToken={openToken}
        onViewAll={onViewAll}
        onClose={onClose}
      />
    </NebulaProvider>,
  );
  return { service, preferenceService, onViewAll, onClose, ...view };
}

describe('NotificationPanel', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
      useNotifyStore.setState(useNotifyStore.getInitialState(), true);
    });
  });

  it('opens on the list view with the panel title and header actions', async () => {
    renderPanel();

    expect(screen.getByRole('region', { name: '站内信' })).toBeInTheDocument();
    expect(await screen.findByText('登录异常提醒')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看更多' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '订阅管理' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument();
  });

  it('switches to the message detail and back to the list', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('listitem', { name: '登录异常提醒' }));

    expect(await screen.findByText('检测到你的账号在新设备登录')).toBeInTheDocument();
    expect(screen.getByText('消息详情')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看更多' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '返回' }));

    expect(await screen.findByRole('button', { name: '查看更多' })).toBeInTheDocument();
    expect(screen.queryByText('消息详情')).not.toBeInTheDocument();
  });

  it('switches to the subscription view and back to the list', async () => {
    const user = userEvent.setup();
    const { preferenceService } = renderPanel();

    await user.click(await screen.findByRole('button', { name: '订阅管理' }));

    expect(await screen.findByText('强制')).toBeInTheDocument();
    expect(preferenceService.getPreference).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /保存设置/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '返回' }));

    expect(await screen.findByRole('button', { name: '订阅管理' })).toBeInTheDocument();
  });

  it('returns to the list view whenever the panel is reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = renderPanel();

    await user.click(await screen.findByRole('button', { name: '订阅管理' }));
    expect(await screen.findByText('强制')).toBeInTheDocument();

    rerender(
      <NebulaProvider>
        <NotificationPanel
          service={createService()}
          preferenceService={createPreferenceService()}
          receiverUserId="current-user"
          openToken={2}
          onViewAll={vi.fn()}
          onClose={vi.fn()}
        />
      </NebulaProvider>,
    );

    await waitFor(() => expect(screen.queryByText('强制')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '查看更多' })).toBeInTheDocument();
  });

  it('hands off to the full inbox page and closes on demand', async () => {
    const user = userEvent.setup();
    const { onViewAll, onClose } = renderPanel();

    await user.click(await screen.findByRole('button', { name: '查看更多' }));
    expect(onViewAll).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
