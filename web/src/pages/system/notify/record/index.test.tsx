import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { NotifyService } from '@/services/notify';
import { useAuthStore } from '@/stores/auth-store';
import type { NotifyRecordDetailResp, NotifyRecordResp } from '@/types/notify';
import { NotifyRecordPage } from './index';

vi.mock('@/components/dict-select', () => ({
  DictSelect: () => null,
  DictLabel: ({ value }: { readonly value?: string }) => <span>{value ?? '-'}</span>,
}));

const SUCCESS_RECORD = {
  id: 'record-success',
  channelType: 'EMAIL',
  templateCode: 'ORDER_PAID',
  receiver: 'buyer@example.com',
  receiverUserId: 'user-buyer',
  receiverUserName: '采购员王小明',
  sendStatus: 'SUCCESS',
  sendTime: '2026-08-09T10:00:00',
  createTime: '2026-08-09T09:59:59',
} as const satisfies NotifyRecordResp;

const FAILED_RECORD = {
  id: 'record-failed',
  channelType: 'EMAIL',
  templateCode: 'ORDER_FAILED',
  receiver: 'ops@example.com',
  receiverUserId: 'user-ops',
  receiverUserName: '运维管理员',
  sendStatus: 'FAILED',
  createTime: '2026-08-09T11:00:00',
} as const satisfies NotifyRecordResp;

const SUCCESS_DETAIL = {
  ...SUCCESS_RECORD,
  templateVariantId: 'variant-email',
  templateVariantName: '支付成功邮件模板',
  targetId: 'target-email',
  targetName: '默认邮件通道',
  subjectText: '订单支付成功',
  contentText: '订单 ORDER-20260809 已支付。\n请及时安排发货。',
  extJson: '{"traceId":"trace-1"}',
} as const satisfies NotifyRecordDetailResp;

const FAILED_DETAIL = {
  ...FAILED_RECORD,
  templateVariantId: 'variant-failed-email',
  templateVariantName: '失败邮件模板',
  targetId: 'target-email',
  targetName: '默认邮件通道',
  subjectText: '订单处理失败',
  contentText: '订单处理失败，请联系管理员。',
  failReason: 'SMTP connection timed out',
  extJson: '{"attempt":3}',
} as const satisfies NotifyRecordDetailResp;

type RecordPageService = Pick<NotifyService, 'pageNotifyRecords' | 'getNotifyRecord' | 'deleteNotifyRecords'>;

function createService(
  getNotifyRecord: Pick<NotifyService, 'getNotifyRecord'>['getNotifyRecord'],
  deleteNotifyRecords: NotifyService['deleteNotifyRecords'] = vi.fn().mockResolvedValue(0),
): RecordPageService {
  return {
    pageNotifyRecords: vi.fn().mockResolvedValue({ data: [SUCCESS_RECORD, FAILED_RECORD], total: 2 }),
    getNotifyRecord,
    deleteNotifyRecords,
  };
}

function renderPage(
  service: RecordPageService,
  permissions: readonly string[] = ['NOTIFY_RECORD_VIEW'],
) {
  render(
    <NebulaProvider>
      <NotifyRecordPage service={service} />
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

/** 表格首列的复选框是「全选当前页」，勾上即选中本页全部记录 */
function selectAllRows(): HTMLElement {
  const [selectAll] = screen.getAllByRole('checkbox');
  return selectAll;
}

function getDetailDialog(): HTMLElement {
  const title = screen.getByText('发送记录详情', { selector: '.ant-modal-title' });
  const dialog = title.closest('.ant-modal');
  if (dialog instanceof HTMLElement) return dialog;
  throw new Error('Unable to find notification record detail modal');
}

afterEach(() => {
  cleanup();
  act(() => useAuthStore.getState().clearUser());
});

describe('NotifyRecordPage details', () => {
  it('hides the detail action when the user lacks record view permission', async () => {
    renderPage(createService(vi.fn()), []);

    await screen.findByText('ORDER_PAID');

    expect(screen.queryByRole('button', { name: '查看详情 record-success' })).not.toBeInTheDocument();
  });

  it('fetches full detail only after the row detail action and displays extended data', async () => {
    const user = userEvent.setup();
    const getNotifyRecord = vi.fn().mockResolvedValue(SUCCESS_DETAIL);
    renderPage(createService(getNotifyRecord));

    await screen.findByText('ORDER_PAID');
    expect(getNotifyRecord).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '查看详情 record-success' }));

    await waitFor(() => expect(getNotifyRecord).toHaveBeenCalledWith('record-success'));
    const dialog = getDetailDialog();
    expect(within(dialog).getByText('订单支付成功')).toBeInTheDocument();
    expect(within(dialog).getByText(/请及时安排发货/)).toBeInTheDocument();
    expect(within(dialog).getByText('支付成功邮件模板')).toBeInTheDocument();
    expect(within(dialog).getByText('默认邮件通道')).toBeInTheDocument();
    expect(within(dialog).getByText('采购员王小明')).toBeInTheDocument();
    expect(within(dialog).queryByText('variant-email')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('target-email')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('user-buyer')).not.toBeInTheDocument();
    expect(within(dialog).getByText('{"traceId":"trace-1"}')).toBeInTheDocument();
  });

  it('batch deletes the selected records after confirmation', async () => {
    const user = userEvent.setup();
    const deleteNotifyRecords = vi.fn().mockResolvedValue(2);
    const service = createService(vi.fn(), deleteNotifyRecords);
    renderPage(service, ['NOTIFY_RECORD_VIEW', 'NOTIFY_RECORD_DELETE']);

    await screen.findByText('ORDER_PAID');
    const batchDelete = screen.getByRole('button', { name: '批量删除发送记录' });
    expect(batchDelete).toBeDisabled();

    await user.click(selectAllRows());
    expect(batchDelete).toBeEnabled();
    await user.click(batchDelete);
    await user.click(await screen.findByRole('button', { name: '确认删除' }));

    await waitFor(() => expect(deleteNotifyRecords).toHaveBeenCalledWith(
      expect.arrayContaining(['record-success', 'record-failed']),
    ));
    await waitFor(() => expect(screen.getByRole('button', { name: '批量删除发送记录' })).toBeDisabled());
    expect(service.pageNotifyRecords).toHaveBeenCalledTimes(2);
  });

  it('keeps the selection and surfaces a failure when batch delete fails', async () => {
    const user = userEvent.setup();
    const deleteNotifyRecords = vi.fn().mockRejectedValue(new Error('delete unavailable'));
    renderPage(createService(vi.fn(), deleteNotifyRecords), ['NOTIFY_RECORD_VIEW', 'NOTIFY_RECORD_DELETE']);

    await screen.findByText('ORDER_PAID');
    await user.click(selectAllRows());
    await user.click(screen.getByRole('button', { name: '批量删除发送记录' }));
    await user.click(await screen.findByRole('button', { name: '确认删除' }));

    await waitFor(() => expect(deleteNotifyRecords).toHaveBeenCalledOnce());
    expect(await screen.findByText('发送记录删除失败')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '批量删除发送记录' })).toBeEnabled();
  });

  it('hides batch delete when the user lacks the delete permission', async () => {
    renderPage(createService(vi.fn()), ['NOTIFY_RECORD_VIEW']);

    await screen.findByText('ORDER_PAID');

    expect(screen.queryByRole('button', { name: '批量删除发送记录' })).not.toBeInTheDocument();
  });

  it('visibly presents the failure status and reason for a failed delivery', async () => {
    const user = userEvent.setup();
    renderPage(createService(vi.fn().mockResolvedValue(FAILED_DETAIL)));

    await screen.findByText('ORDER_FAILED');
    await user.click(screen.getByRole('button', { name: '查看详情 record-failed' }));

    const dialog = getDetailDialog();
    const failureAlert = await within(dialog).findByRole('alert');
    expect(failureAlert).toHaveTextContent('发送失败');
    expect(failureAlert).toHaveTextContent('SMTP connection timed out');
  });

  it('keeps the detail surface open after a load failure and retries explicitly', async () => {
    const user = userEvent.setup();
    const getNotifyRecord = vi.fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(SUCCESS_DETAIL);
    renderPage(createService(getNotifyRecord));

    await screen.findByText('ORDER_PAID');
    await user.click(screen.getByRole('button', { name: '查看详情 record-success' }));

    const dialog = getDetailDialog();
    expect(await within(dialog).findByText('详情加载失败，可重试')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '重试' }));

    await waitFor(() => expect(getNotifyRecord).toHaveBeenCalledTimes(2));
    expect(await within(dialog).findByText('订单支付成功')).toBeInTheDocument();
  });
});
