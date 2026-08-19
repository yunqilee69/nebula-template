import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SelectProps } from 'antd';
import { Select } from 'antd';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { NotifyChannelTargetResp } from '@/types/notify';
import { ChannelTargetManagementPage } from './index';
import type { NotifyChannelTargetService } from './channel-target-page-helpers';

const CHANNEL_OPTIONS = [
  { label: '站内信', value: 'SITE' },
  { label: '邮件', value: 'EMAIL' },
  { label: '企业微信群机器人', value: 'WECOM_GROUP_WEBHOOK' },
] as const;

vi.mock('@/components/dict-select', () => ({
  DictSelect: ({ dictCode: _dictCode, showDisabled: _showDisabled, ...props }: SelectProps<string> & {
    readonly dictCode: string;
    readonly showDisabled?: boolean;
  }) => (
    <Select<string> {...props} options={[...CHANNEL_OPTIONS]} />
  ),
  DictLabel: ({ value }: { readonly value?: string }) => (
    <span>{CHANNEL_OPTIONS.find((option) => option.value === value)?.label ?? value ?? '-'}</span>
  ),
}));

const TARGET: NotifyChannelTargetResp = {
  id: 'target-a',
  targetName: 'Ops Group',
  channelType: 'WECOM_GROUP_WEBHOOK',
  endpointUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-abcd',
  configJson: '{"rateLimit":20}',
  remark: '运营群',
  createTime: '2026-08-10T10:00:00',
};

function createService(overrides: Partial<NotifyChannelTargetService> = {}): NotifyChannelTargetService {
  return {
    pageNotifyChannelTargets: vi.fn().mockResolvedValue({ data: [TARGET], total: 1 }),
    getNotifyChannelTarget: vi.fn().mockResolvedValue(TARGET),
    createNotifyChannelTarget: vi.fn().mockResolvedValue('target-created'),
    updateNotifyChannelTarget: vi.fn().mockResolvedValue('target-a'),
    deleteNotifyChannelTarget: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderPage(
  service = createService(),
  permissions: readonly string[] = [
    'NOTIFY_CHANNEL_TARGET_CREATE',
    'NOTIFY_CHANNEL_TARGET_EDIT',
    'NOTIFY_CHANNEL_TARGET_DELETE',
  ],
): NotifyChannelTargetService {
  render(
    <NebulaProvider>
      <ChannelTargetManagementPage service={service} />
    </NebulaProvider>,
  );
  act(() => {
    useAuthStore.getState().setUser({
      id: 'channel-target-test-user',
      name: 'Channel Target Test User',
      roles: [],
      permissions: [...permissions],
    });
  });
  return service;
}

function getModalByTitle(title: string): HTMLElement {
  const titleNode = screen.getByText(title, { selector: '.ant-modal-title' });
  const modal = titleNode.closest('.ant-modal');
  if (modal instanceof HTMLElement) return modal;
  throw new Error(`Unable to find modal: ${title}`);
}

async function confirmPopover(buttonName: RegExp): Promise<void> {
  const popover = await screen.findByRole('tooltip');
  await userEvent.click(within(popover).getByRole('button', { name: buttonName }));
}

afterEach(() => {
  cleanup();
  act(() => useAuthStore.getState().clearUser());
});

describe('ChannelTargetManagementPage', () => {
  it('loads channel targets and submits normalized search filters', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    expect(await screen.findByText('Ops Group')).toBeInTheDocument();
    expect(screen.getByText('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-abcd')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '目标名称' }), ' Ops ');
    await user.click(screen.getByRole('combobox', { name: '通知渠道' }));
    await user.click(await screen.findByText('企业微信群机器人', { selector: '.ant-select-item-option-content' }));
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageNotifyChannelTargets).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 10,
        targetName: 'Ops',
        channelType: 'WECOM_GROUP_WEBHOOK',
      });
    });
  });

  it('creates a WeCom channel target with trimmed values', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('Ops Group');
    await user.click(screen.getByRole('button', { name: /新增渠道目标/ }));
    const modal = getModalByTitle('新增渠道目标');
    await user.type(within(modal).getByPlaceholderText('请输入目标名称'), ' Alerts Group ');
    await user.type(within(modal).getByPlaceholderText('请输入完整 webhook URL 或目标地址'), ' https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret ');
    await user.click(within(modal).getByPlaceholderText('可选，如 {"rateLimit":20}'));
    await user.paste(' {"rateLimit":20} ');
    await user.type(within(modal).getByPlaceholderText('请输入备注'), ' 生产告警 ');
    await user.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.createNotifyChannelTarget).toHaveBeenCalledWith({
        targetName: 'Alerts Group',
        channelType: 'WECOM_GROUP_WEBHOOK',
        endpointUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret',
        configJson: '{"rateLimit":20}',
        remark: '生产告警',
      });
    });
  });

  it('loads detail before editing and submits the update request', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('Ops Group');
    await user.click(screen.getByRole('button', { name: '编辑 Ops Group' }));
    await waitFor(() => expect(service.getNotifyChannelTarget).toHaveBeenCalledWith('target-a'));
    const modal = getModalByTitle('编辑渠道目标');
    expect(within(modal).getByDisplayValue('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-abcd')).toBeInTheDocument();
    await user.clear(within(modal).getByPlaceholderText('请输入目标名称'));
    await user.type(within(modal).getByPlaceholderText('请输入目标名称'), ' Ops Group Updated ');
    await user.clear(within(modal).getByPlaceholderText('请输入完整 webhook URL 或目标地址'));
    await user.type(within(modal).getByPlaceholderText('请输入完整 webhook URL 或目标地址'), ' https://example.test/webhook ');
    await user.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.updateNotifyChannelTarget).toHaveBeenCalledWith('target-a', expect.objectContaining({
        targetName: 'Ops Group Updated',
        channelType: 'WECOM_GROUP_WEBHOOK',
        endpointUrl: 'https://example.test/webhook',
      }));
    });
  });

  it('deletes a channel target through confirmation', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('Ops Group');
    await user.click(screen.getByRole('button', { name: '删除 Ops Group' }));
    expect(await screen.findByText('确定删除该渠道目标吗？')).toBeInTheDocument();
    await confirmPopover(/删\s*除/);

    await waitFor(() => expect(service.deleteNotifyChannelTarget).toHaveBeenCalledWith('target-a'));
  });
});
