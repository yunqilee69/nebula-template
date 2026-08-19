import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthManagementService } from '@/api/auth-management';
import type { NebulaPageResp } from '@/components/nebula-pro-table';
import { NebulaProvider } from '@/providers/nebula-provider';
import { dictService } from '@/services/dict';
import { useAuthStore } from '@/stores/auth-store';
import { useDictCacheStore } from '@/stores/dict-cache-store';
import type { UserResp } from '@/types/auth-management';
import type { DictItemTreeResp } from '@/types/dict';
import type { NotifyTemplateDetailResp, NotifyTemplateResp, ReceiverItem } from '@/types/notify';
import { TemplateManagementPage } from './index';
import type { NotifyTemplateService } from './template-page-helpers';

vi.mock('@/services/dict', () => ({
  dictService: {
    listItemsByCode: vi.fn(),
  },
}));

vi.mock('@/components/dict-select', () => ({
  DictLabel: ({ value }: { readonly dictCode: string; readonly value: string }) => <span>{value}</span>,
  DictSelect: ({
    dictCode,
    mode,
    value,
    disabled,
    onChange,
  }: {
    readonly dictCode: string;
    readonly mode?: string;
    readonly value?: readonly string[] | string;
    readonly disabled?: boolean;
    readonly onChange?: (value: readonly string[] | string) => void;
  }) => (
    <select
      aria-label="通知渠道"
      data-dict-code={dictCode}
      data-mode={mode}
      disabled={disabled}
      multiple={mode === 'multiple'}
      value={value ?? (mode === 'multiple' ? [] : '')}
      onChange={(event) => {
        if (mode === 'multiple') {
          onChange?.(Array.from(event.currentTarget.selectedOptions, (option) => option.value));
          return;
        }
        onChange?.(event.currentTarget.value);
      }}
    >
      <option value="SITE">SITE</option>
      <option value="EMAIL">EMAIL</option>
    </select>
  ),
  useDictItems: () => ({
    options: [
      { label: 'SITE', value: 'SITE', disabled: false },
      { label: 'EMAIL', value: 'EMAIL', disabled: false },
    ],
    items: [],
    loading: false,
    getItemByValue: () => undefined,
    getLabelByValue: () => undefined,
  }),
}));

const sendUsers: readonly UserResp[] = [
  { id: 'user-a', username: 'alice', email: 'alice@example.com', status: 1 },
];

const receiverItems: readonly ReceiverItem[] = [
  { sourceType: 'USER', sourceId: 'user-a', sourceName: 'alice', users: sendUsers },
];

vi.mock('@/pages/system/notify/components/receiver-selector', () => ({
  ReceiverSelector: ({
    value,
    onChange,
  }: {
    readonly value: readonly ReceiverItem[];
    readonly onChange: (items: readonly ReceiverItem[]) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onChange(receiverItems)}>选择接收对象</button>
      <span>已选择 {value.length} 个接收对象</span>
    </div>
  ),
}));

const listItemsByCode = vi.mocked(dictService.listItemsByCode);

const channelItems: readonly DictItemTreeResp[] = [
  { id: 'channel-site', dictCode: 'NOTIFY_CHANNEL_TYPE', name: '站内信', itemValue: 'SITE', sort: 1, enabled: true },
  { id: 'channel-email', dictCode: 'NOTIFY_CHANNEL_TYPE', name: '邮件', itemValue: 'EMAIL', sort: 2, enabled: true },
];

const builtinTemplate: NotifyTemplateResp = {
  id: 'template-builtin',
  templateCode: 'SYSTEM_ALERT',
  templateName: '系统提醒',
};

const customTemplate: NotifyTemplateResp = {
  id: 'template-custom',
  templateCode: 'ORDER_APPROVED',
  templateName: '订单审批通过',
};

const customTemplateDetail: NotifyTemplateDetailResp = {
  ...customTemplate,
  fields: [
    {
      id: 'field-recipient-name',
      templateId: 'template-custom',
      fieldCode: 'recipientName',
      fieldName: '接收人姓名',
      requiredFlag: true,
    },
    {
      id: 'field-order-no',
      templateId: 'template-custom',
      fieldCode: 'orderNo',
      fieldName: '订单号',
      requiredFlag: true,
    },
  ],
  variants: [
    {
      id: 'variant-email',
      templateId: 'template-custom',
      channelType: 'EMAIL',
      subjectTemplate: '${recipientName}，订单已审批',
      contentTemplate: '${recipientName} 的订单 ${orderNo} 已于 ${notify.currentDateTime} 审批通过。',
      enabled: true,
    },
  ],
  remark: '订单审批结果通知',
};

function createPage(data: readonly NotifyTemplateResp[]): NebulaPageResp<NotifyTemplateResp> {
  return { data: [...data], total: data.length };
}

function createService(overrides: Partial<NotifyTemplateService> = {}): NotifyTemplateService {
  return {
    pageNotifyTemplates: vi.fn().mockResolvedValue(createPage([builtinTemplate, customTemplate])),
    getNotifyTemplate: vi.fn().mockResolvedValue(customTemplateDetail),
    createNotifyTemplate: vi.fn().mockResolvedValue('template-created'),
    updateNotifyTemplate: vi.fn().mockResolvedValue('template-custom'),
    deleteNotifyTemplate: vi.fn().mockResolvedValue(undefined),
    pageNotifyChannelTargets: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    sendNotify: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const TEMPLATE_PERMISSIONS = [
  'NOTIFY_TEMPLATE_CREATE',
  'NOTIFY_TEMPLATE_EDIT',
  'NOTIFY_TEMPLATE_DELETE',
  'NOTIFY_SEND_EXECUTE',
] as const;

const authService = {
  listRoles: vi.fn().mockResolvedValue([]),
  getOrgTree: vi.fn().mockResolvedValue([]),
  pageUsers: vi.fn().mockResolvedValue({ data: [], total: 0 }),
} satisfies Pick<AuthManagementService, 'listRoles' | 'getOrgTree' | 'pageUsers'>;

function renderPage(
  service: NotifyTemplateService,
  permissions: readonly string[] = TEMPLATE_PERMISSIONS,
): void {
  render(
    <NebulaProvider>
      <TemplateManagementPage service={service} authService={authService} />
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
}

function getRow(text: string): HTMLElement {
  const row = screen.getByText(text).closest('tr');
  if (row instanceof HTMLElement) return row;
  throw new Error(`Unable to find table row for ${text}`);
}

describe('TemplateManagementPage', () => {
  beforeEach(() => {
    useDictCacheStore.getState().reset();
    listItemsByCode.mockResolvedValue([...channelItems]);
  });

  afterEach(() => {
    cleanup();
    act(() => useAuthStore.getState().clearUser());
    listItemsByCode.mockReset();
  });

  it('hides template actions when the user has no template permissions', async () => {
    const service = createService();
    renderPage(service, []);

    const row = await waitFor(() => getRow('ORDER_APPROVED'));

    expect(screen.queryByRole('button', { name: '新增模板' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '发送通知' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /发送/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /编辑/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
  });

  it('loads template detail and renders parameters plus variant tabs read-only', async () => {
    const user = userEvent.setup();
    const service = createService();
    renderPage(service);

    const row = await waitFor(() => getRow('ORDER_APPROVED'));
    await user.click(within(row).getByRole('button', { name: /查看/ }));

    await waitFor(() => expect(service.getNotifyTemplate).toHaveBeenCalledWith('template-custom'));
    const title = await screen.findByText('模板详情');
    const dialog = title.closest('.ant-modal');
    if (!(dialog instanceof HTMLElement)) throw new Error('Unable to find template detail modal');
    expect(within(dialog).getAllByText('recipientName')).not.toHaveLength(0);
    expect(within(dialog).getAllByText('orderNo')).not.toHaveLength(0);
    expect(within(dialog).getByRole('tab', { name: 'EMAIL' })).toBeInTheDocument();
    expect(within(dialog).queryByText(/系统内置变量/)).not.toBeInTheDocument();
    const helpButtons = within(dialog).getAllByRole('button', { name: '查看系统内置变量' });
    const helpButton = helpButtons[0];
    if (!(helpButton instanceof HTMLElement)) throw new Error('Unable to find built-in variable help');
    await user.hover(helpButton);
    expect(await screen.findByText('当前日期时间')).toBeInTheDocument();
    expect(within(dialog).queryAllByRole('textbox')).toHaveLength(0);
  });

  it('keeps send entry in the toolbar and removes row-level send action', async () => {
    const user = userEvent.setup();
    const service = createService();
    renderPage(service);

    const row = await waitFor(() => getRow('ORDER_APPROVED'));
    expect(within(row).queryByRole('button', { name: /发送/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /发送通知/ }));

    const sendTitles = await screen.findAllByText('发送通知');
    const drawer = sendTitles.map((element) => element.closest('.ant-drawer')).find((element) => element instanceof HTMLElement);
    if (!(drawer instanceof HTMLElement)) throw new Error('Unable to find send drawer');
    expect(within(drawer).getByLabelText('通知模板')).toBeInTheDocument();
  });
});
