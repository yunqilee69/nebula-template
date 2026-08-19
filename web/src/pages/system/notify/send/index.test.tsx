import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthManagementService } from '@/api/auth-management';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { NotifyService } from '@/services/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { ReceiverItem } from '@/types/notify';
import { NotifySendPage } from './index';

const receiverItems: readonly ReceiverItem[] = [
  {
    sourceType: 'ROLE',
    sourceId: 'role-a',
    sourceName: 'Operators',
    users: [
      { id: 'user-a', username: 'alice', email: 'alice@example.com', status: 1 },
      { id: 'user-b', username: 'bob', status: 1 },
    ],
  },
];

const useDictItemsMock = vi.hoisted(() => vi.fn(() => ({
  options: [
    { label: 'SITE', value: 'SITE', disabled: false },
    { label: 'EMAIL', value: 'EMAIL', disabled: false },
  ],
  items: [],
  loading: false,
  getItemByValue: () => undefined,
  getLabelByValue: () => undefined,
})));

vi.mock('@/components/dict-select', () => ({
  DictSelect: ({
    dictCode,
    mode,
    value,
    disabled,
    onChange,
  }: {
    readonly dictCode: string;
    readonly mode: string;
    readonly value?: readonly string[];
    readonly disabled?: boolean;
    readonly onChange?: (value: readonly string[]) => void;
  }) => (
    <select
      aria-label="通知渠道"
      data-dict-code={dictCode}
      data-mode={mode}
      disabled={disabled}
      multiple
      value={value ?? []}
      onChange={(event) => onChange?.(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}
    >
      <option value="SITE">SITE</option>
      <option value="EMAIL">EMAIL</option>
    </select>
  ),
  useDictItems: useDictItemsMock,
}));

vi.mock('@/pages/system/notify/components/receiver-selector', () => ({
  ReceiverSelector: ({ onChange }: { readonly onChange: (items: readonly ReceiverItem[]) => void }) => (
    <div>
      <button type="button" onClick={() => onChange(receiverItems)}>选择接收对象</button>
      <button type="button" onClick={() => onChange([])}>清空接收对象</button>
    </div>
  ),
}));

function createNotifyService(overrides: Partial<NotifyService> = {}): NotifyService {
  return {
    createAnnouncement: vi.fn(),
    updateAnnouncement: vi.fn(),
    deleteAnnouncement: vi.fn(),
    getAnnouncement: vi.fn(),
    pageAnnouncements: vi.fn(),
    pageCurrentAnnouncements: vi.fn(),
    listCurrentPopupAnnouncements: vi.fn(),
    markAnnouncementRead: vi.fn(),
    createNotifyTemplate: vi.fn(),
    updateNotifyTemplate: vi.fn(),
    deleteNotifyTemplate: vi.fn(),
    getNotifyTemplate: vi.fn().mockResolvedValue({
      id: 'template-a',
      templateCode: 'WELCOME',
      templateName: 'Welcome',
      fields: [
        {
          id: 'field-name',
          templateId: 'template-a',
          fieldCode: 'name',
          fieldName: 'name',
          requiredFlag: true,
        },
        {
          id: 'field-message',
          templateId: 'template-a',
          fieldCode: 'message',
          fieldName: 'message',
          requiredFlag: true,
        },
      ],
      variants: [
        {
          id: 'variant-site',
          templateId: 'template-a',
          channelType: 'SITE',
          subjectTemplate: 'Hello ${name}',
          contentTemplate: '${message} ${notify.currentDate}',
          enabled: true,
        },
      ],
    }),
    pageNotifyTemplates: vi.fn().mockResolvedValue({
      data: [{
        id: 'template-a',
        templateCode: 'WELCOME',
        templateName: 'Welcome',
      }],
      total: 1,
    }),
    createNotifyChannelTarget: vi.fn(),
    updateNotifyChannelTarget: vi.fn(),
    deleteNotifyChannelTarget: vi.fn(),
    getNotifyChannelTarget: vi.fn(),
    pageNotifyChannelTargets: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    sendNotify: vi.fn().mockResolvedValue([]),
    testEmailNotify: vi.fn(),
    getNotifyRecord: vi.fn(),
    pageNotifyRecords: vi.fn(),
    pageSiteMessages: vi.fn(),
    getUnreadSiteMessageCount: vi.fn(),
    markSiteMessageRead: vi.fn(),
    markSiteMessageUnread: vi.fn(),
    markSiteMessagesRead: vi.fn(),
    markSiteMessagesUnread: vi.fn(),
    deleteSiteMessage: vi.fn(),
    removeSiteMessage: vi.fn(),
    ...overrides,
  };
}

const authService = {
  listRoles: vi.fn().mockResolvedValue([]),
  getOrgTree: vi.fn().mockResolvedValue([]),
  pageUsers: vi.fn().mockResolvedValue({ data: [], total: 0 }),
} satisfies Pick<AuthManagementService, 'listRoles' | 'getOrgTree' | 'pageUsers'>;

function renderPage(
  service = createNotifyService(),
  permissions: readonly string[] = ['NOTIFY_SEND_EXECUTE'],
) {
  render(
    <NebulaProvider>
      <NotifySendPage notifyService={service} authService={authService} />
    </NebulaProvider>,
  );
  act(() => {
    useAuthStore.getState().setUser({
      id: 'notify-test-user',
      name: 'Notify Test User',
      roles: [],
      permissions: [...permissions],
    });
  });
  return service;
}

async function fillValidForm() {
  const user = userEvent.setup();
  await waitFor(() => expect(screen.getByRole('combobox', { name: '通知模板' })).toBeEnabled());
  await user.click(screen.getByRole('combobox', { name: '通知模板' }));
  await user.click(await screen.findByText('Welcome (WELCOME)'));
  await waitFor(() => expect(screen.getByLabelText('name')).toBeInTheDocument());
    await user.type(screen.getByLabelText('name'), 'Alice');
    await user.type(screen.getByLabelText('message'), 'Hello');
    await user.click(screen.getByRole('button', { name: '选择接收对象' }));
    return user;
  }

describe('NotifySendPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
    act(() => useAuthStore.getState().clearUser());
  });

  it('hides the send action when the user lacks send permission', async () => {
    renderPage(createNotifyService(), []);

    expect(screen.queryByRole('button', { name: /预览并发送/ })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox', { name: '通知模板' })).toBeEnabled());
  });

  it('uses the notification channel dictionary in multiple mode', async () => {
    // Given / When
    renderPage();

    // Then
    expect(useDictItemsMock).toHaveBeenCalledWith('NOTIFY_CHANNEL_TYPE', true);
    expect(screen.getByRole('combobox', { name: '通知渠道' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox', { name: '通知模板' })).toBeEnabled());
  });

  it('does not open confirmation when channels are empty', async () => {
    // Given
    const user = userEvent.setup();
    const service = renderPage();

    // When
    await user.click(screen.getByRole('button', { name: /预览并发送/ }));

    // Then
    expect(screen.queryByRole('dialog', { name: '确认发送' })).not.toBeInTheDocument();
    expect(service.sendNotify).not.toHaveBeenCalled();
  });

  it('does not open confirmation when relevant recipients are empty', async () => {
    // Given
    const user = userEvent.setup();
    const service = renderPage();
    await waitFor(() => expect(screen.getByRole('combobox', { name: '通知模板' })).toBeEnabled());
    await user.click(screen.getByRole('combobox', { name: '通知模板' }));
    await user.click(await screen.findByText('Welcome (WELCOME)'));
    await waitFor(() => expect(screen.getByLabelText('name')).toBeInTheDocument());

    // When
    await user.click(screen.getByRole('button', { name: /预览并发送/ }));

    // Then
    expect(screen.queryByRole('dialog', { name: '确认发送' })).not.toBeInTheDocument();
    expect(service.sendNotify).not.toHaveBeenCalled();
  });

  it('shows exact counts and cancellation makes no send call', async () => {
    // Given
    const service = renderPage();
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: /预览并发送/ }));

    // When
    const dialog = await screen.findByRole('dialog', { name: '确认发送' });
    expect(within(dialog).getByText('1', { selector: '[data-count="channels"]' })).toBeInTheDocument();
    expect(within(dialog).getByText('0', { selector: '[data-count="email-excluded"]' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /取\s*消/ }));

    // Then
    expect(service.sendNotify).not.toHaveBeenCalled();
  });

  it('confirms one API call and renders successful results', async () => {
    // Given
    const service = renderPage(createNotifyService({
      sendNotify: vi.fn().mockResolvedValue([
        { recordId: 'record-a', siteMessageId: 'site-a', channelType: 'SITE', receiver: 'user-a', sendStatus: 'SUCCESS' },
      ]),
    }));
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: /预览并发送/ }));

    // When
    const dialog = await screen.findByRole('dialog', { name: '确认发送' });
    await user.click(within(dialog).getByRole('button', { name: '确认发送' }));

    // Then
    await waitFor(() => expect(service.sendNotify).toHaveBeenCalledTimes(1));
    expect(service.sendNotify).toHaveBeenCalledWith({
      channelTypes: ['SITE'],
      templateCode: 'WELCOME',
      templateParams: { name: 'Alice', message: 'Hello' },
      receiverUserIds: ['user-a', 'user-b'],
    });
    expect(await screen.findByText('record-a')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
  });

  it('preserves backend order for partial-failure results', async () => {
    // Given
    renderPage(createNotifyService({
      sendNotify: vi.fn().mockResolvedValue([
        { recordId: 'record-site', siteMessageId: 'site-a', channelType: 'SITE', receiver: 'user-a', sendStatus: 'SUCCESS' },
        { recordId: 'record-email', channelType: 'EMAIL', receiver: 'alice@example.com', sendStatus: 'FAILED', failReason: 'SMTP unavailable' },
      ]),
    }));
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: /预览并发送/ }));
    await user.click(within(await screen.findByRole('dialog', { name: '确认发送' })).getByRole('button', { name: '确认发送' }));

    // When
    const rows = await screen.findAllByRole('row');

    // Then
    expect(within(rows[1]).getByText('SITE')).toBeInTheDocument();
    expect(within(rows[2]).getByText('EMAIL')).toBeInTheDocument();
    expect(within(rows[2]).getByText('SMTP unavailable')).toBeInTheDocument();
  });
});
