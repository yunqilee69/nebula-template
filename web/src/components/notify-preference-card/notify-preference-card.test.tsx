import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { NotifyPreferenceService } from '@/api/notify-preference';
import { useLocaleStore } from '@/stores/locale-store';
import type { NotifyPreferenceResp } from '@/types/notify';
import { NotifyPreferenceCard } from './notify-preference-card';

const preference: NotifyPreferenceResp = {
  categories: [
    {
      code: 'SECURITY',
      name: '安全与账号',
      description: '登录异常、改密、绑定变更等账号安全提醒',
      mandatory: true,
      sort: 10,
      channels: [
        { channel: 'SITE', enabled: true, editable: false },
        { channel: 'EMAIL', enabled: true, editable: false },
        { channel: 'PUSH', enabled: true, editable: false },
      ],
    },
    {
      code: 'TODO',
      name: '待办与审批',
      mandatory: false,
      sort: 20,
      channels: [
        { channel: 'SITE', enabled: true, editable: false },
        { channel: 'PUSH', enabled: true, editable: true },
      ],
    },
  ],
};

function createService(overrides: Partial<NotifyPreferenceService> = {}): NotifyPreferenceService {
  return {
    getPreference: vi.fn().mockResolvedValue(preference),
    updatePreference: vi.fn().mockResolvedValue(preference),
    resetPreference: vi.fn().mockResolvedValue(preference),
    ...overrides,
  };
}

function renderCard(service = createService()) {
  render(
    <NebulaProvider>
      <NotifyPreferenceCard service={service} />
    </NebulaProvider>,
  );
  return service;
}

describe('NotifyPreferenceCard', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    act(() => {
      useLocaleStore.getState().setLocale('zh-CN');
    });
  });

  it('renders categories, mandatory tag, and disables non-editable switches', async () => {
    const service = renderCard();

    expect(await screen.findByText('安全与账号')).toBeInTheDocument();
    expect(screen.getByText('强制')).toBeInTheDocument();
    expect(screen.getByText('待办与审批')).toBeInTheDocument();

    expect(screen.getByRole('switch', { name: '安全与账号 邮件' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: '待办与审批 App通知' })).toBeEnabled();
    expect(service.getPreference).toHaveBeenCalledTimes(1);
  });

  it('saves only the editable channel toggles', async () => {
    const user = userEvent.setup();
    const updated: NotifyPreferenceResp = {
      ...preference,
      categories: preference.categories?.map((category) => (
        category.code === 'TODO'
          ? { ...category, channels: category.channels?.map((channel) => (channel.channel === 'PUSH' ? { ...channel, enabled: false } : channel)) }
          : category
      )),
    };
    const service = createService({ updatePreference: vi.fn().mockResolvedValue(updated) });
    renderCard(service);

    await screen.findByText('待办与审批');
    await user.click(screen.getByRole('switch', { name: '待办与审批 App通知' }));
    await user.click(screen.getByRole('button', { name: /保存设置/ }));

    await waitFor(() => {
      expect(service.updatePreference).toHaveBeenCalledWith({
        items: [{ categoryCode: 'TODO', channel: 'PUSH', enabled: false }],
      });
    });
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: '待办与审批 App通知' })).not.toBeChecked();
    });
  });

  it('restores defaults after confirmation', async () => {
    const user = userEvent.setup();
    const defaults: NotifyPreferenceResp = {
      categories: preference.categories?.map((category) => (
        category.code === 'TODO'
          ? { ...category, channels: category.channels?.map((channel) => (channel.channel === 'PUSH' ? { ...channel, enabled: true } : channel)) }
          : category
      )),
    };
    const service = createService({ resetPreference: vi.fn().mockResolvedValue(defaults) });
    renderCard(service);

    await screen.findByText('待办与审批');
    await user.click(screen.getByRole('switch', { name: '待办与审批 App通知' }));
    await user.click(screen.getByRole('button', { name: /恢复默认/ }));

    const dialog = await screen.findByText('确认恢复默认消息设置？');
    const popconfirm = dialog.closest('.ant-popover') ?? document.body;
    await user.click(within(popconfirm as HTMLElement).getByRole('button', { name: /确\s*定/ }));

    await waitFor(() => {
      expect(service.resetPreference).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: '待办与审批 App通知' })).toBeChecked();
    });
  });

  it('keeps the card usable when loading fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = createService({ getPreference: vi.fn().mockRejectedValue(new Error('boom')) });
    renderCard(service);

    expect(await screen.findByText('暂无可配置的通知类别')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
