import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { NotifyCategoryResp } from '@/types/notify';
import { CategoryManagementPage } from './index';
import type { NotifyCategoryService } from './category-page-helpers';

const CUSTOM_CATEGORY: NotifyCategoryResp = {
  id: 'cat-custom',
  code: 'ORDER_REMINDER',
  name: '订单提醒',
  description: '订单状态变更提醒',
  mandatory: false,
  defaultEnabled: true,
  sort: 110,
  allowedChannels: ['SITE', 'PUSH'],
  builtin: false,
  enabled: true,
  remark: '业务方自助新增',
  createTime: '2026-09-01T10:00:00',
};

const BUILTIN_CATEGORY: NotifyCategoryResp = {
  id: 'cat-security',
  code: 'SECURITY',
  name: '安全与账号',
  description: '登录异常、改密、绑定变更等账号安全提醒',
  mandatory: true,
  defaultEnabled: true,
  sort: 10,
  allowedChannels: ['SITE', 'EMAIL', 'PUSH'],
  builtin: true,
  enabled: true,
  createTime: '2026-08-01T10:00:00',
};

function createService(overrides: Partial<NotifyCategoryService> = {}): NotifyCategoryService {
  return {
    pageNotifyCategories: vi.fn().mockResolvedValue({ data: [BUILTIN_CATEGORY, CUSTOM_CATEGORY], total: 2 }),
    getNotifyCategory: vi.fn().mockResolvedValue(CUSTOM_CATEGORY),
    createNotifyCategory: vi.fn().mockResolvedValue('cat-created'),
    updateNotifyCategory: vi.fn().mockResolvedValue('cat-custom'),
    deleteNotifyCategory: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderPage(
  service = createService(),
  permissions: readonly string[] = [
    'NOTIFY_CATEGORY_CREATE',
    'NOTIFY_CATEGORY_EDIT',
    'NOTIFY_CATEGORY_DELETE',
  ],
): NotifyCategoryService {
  render(
    <NebulaProvider>
      <CategoryManagementPage service={service} />
    </NebulaProvider>,
  );
  act(() => {
    useAuthStore.getState().setUser({
      id: 'notify-category-test-user',
      name: 'Notify Category Test User',
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

describe('CategoryManagementPage', () => {
  it('loads categories and submits normalized search filters', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    expect(await screen.findByText('ORDER_REMINDER')).toBeInTheDocument();
    expect(screen.getByText('内置')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '类别编码' }), ' ORDER ');
    await user.type(screen.getByRole('textbox', { name: '类别名称' }), ' 订单 ');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));

    await waitFor(() => {
      expect(service.pageNotifyCategories).toHaveBeenLastCalledWith({
        pageNum: 1,
        pageSize: 10,
        code: 'ORDER',
        name: '订单',
      });
    });
  });

  it('creates a custom category with trimmed values and default sort', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('ORDER_REMINDER');
    await user.click(screen.getByRole('button', { name: /新增通知类别/ }));
    const modal = getModalByTitle('新增通知类别');
    await user.type(within(modal).getByPlaceholderText('如 ORDER_REMINDER'), ' PAYMENT_DONE ');
    await user.type(within(modal).getByPlaceholderText('如 订单提醒'), ' 支付完成 ');
    await user.click(within(modal).getByRole('combobox', { name: '允许渠道' }));
    await user.click(await screen.findByText('邮件', { selector: '.ant-select-item-option-content' }));
    await user.type(within(modal).getByPlaceholderText('请输入备注'), ' 财务通知 ');
    await user.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.createNotifyCategory).toHaveBeenCalledWith({
        code: 'PAYMENT_DONE',
        name: '支付完成',
        mandatory: false,
        defaultEnabled: true,
        enabled: true,
        allowedChannels: ['SITE', 'EMAIL'],
        sort: 100,
        remark: '财务通知',
      });
    });
  });

  it('loads detail before editing, locks the code, and omits it from the update', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('ORDER_REMINDER');
    await user.click(screen.getByRole('button', { name: '编辑 ORDER_REMINDER' }));
    await waitFor(() => expect(service.getNotifyCategory).toHaveBeenCalledWith('cat-custom'));
    const modal = getModalByTitle('编辑通知类别');
    expect(within(modal).getByPlaceholderText('如 ORDER_REMINDER')).toBeDisabled();
    await user.clear(within(modal).getByPlaceholderText('如 订单提醒'));
    await user.type(within(modal).getByPlaceholderText('如 订单提醒'), ' 订单提醒改 ');
    await user.click(within(modal).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(service.updateNotifyCategory).toHaveBeenCalledWith('cat-custom', expect.objectContaining({
        name: '订单提醒改',
        mandatory: false,
        defaultEnabled: true,
        enabled: true,
        allowedChannels: ['SITE', 'PUSH'],
        sort: 110,
      }));
    });
    const payload = vi.mocked(service.updateNotifyCategory).mock.calls[0]?.[1];
    expect(payload).not.toHaveProperty('code');
  });

  it('blocks deleting a builtin category', async () => {
    const service = renderPage();

    await screen.findByText('SECURITY');
    expect(screen.getByRole('button', { name: '删除 SECURITY' })).toBeDisabled();
    expect(service.deleteNotifyCategory).not.toHaveBeenCalled();
  });

  it('deletes a custom category through confirmation', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByText('ORDER_REMINDER');
    await user.click(screen.getByRole('button', { name: '删除 ORDER_REMINDER' }));
    expect(await screen.findByText('确定删除该通知类别吗？')).toBeInTheDocument();
    await confirmPopover(/删\s*除/);

    await waitFor(() => expect(service.deleteNotifyCategory).toHaveBeenCalledWith('cat-custom'));
  });

  it('exposes help icons explaining column and form parameters', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('ORDER_REMINDER');
    const channelHelp = screen.getByRole('button', { name: '查看允许渠道说明' });
    await user.hover(channelHelp);
    expect(await screen.findByText(/类别只在这些渠道上参与用户偏好判定并发送/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /新增通知类别/ }));
    const modal = getModalByTitle('新增通知类别');
    expect(within(modal).getByRole('img', { name: '强制类别参数说明' })).toBeInTheDocument();
    expect(within(modal).getByRole('img', { name: '默认开启参数说明' })).toBeInTheDocument();
    expect(within(modal).getByRole('img', { name: '允许渠道参数说明' })).toBeInTheDocument();
    expect(within(modal).getByRole('img', { name: '排序号参数说明' })).toBeInTheDocument();
  });

  it('hides mutation actions without the matching permissions', async () => {
    renderPage(createService(), []);

    await screen.findByText('ORDER_REMINDER');
    expect(screen.queryByRole('button', { name: /新增通知类别/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑 ORDER_REMINDER' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除 ORDER_REMINDER' })).not.toBeInTheDocument();
  });
});
