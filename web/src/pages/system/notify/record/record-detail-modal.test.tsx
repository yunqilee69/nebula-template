import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { NotifyRecordDetailResp, NotifyRecordResp } from '@/types/notify';
import { RecordDetailModal } from './record-detail-modal';

vi.mock('@/components/dict-select', () => ({
  DictSelect: () => null,
  DictLabel: ({ value }: { readonly value?: string }) => <span>{value ?? '-'}</span>,
}));

const EMAIL_RECORD = {
  id: 'record-email',
  channelType: 'EMAIL',
  templateCode: 'ORDER_PAID',
  receiver: 'buyer@example.com',
  receiverUserId: 'user-buyer',
  receiverUserName: '采购员王小明',
  sendStatus: 'SUCCESS',
} as const satisfies NotifyRecordResp;

const EMAIL_DETAIL = {
  ...EMAIL_RECORD,
  targetId: 'target-email',
  targetName: '默认邮件通道',
  subjectText: '订单支付成功',
  contentText: '订单 ORDER-20260809 已支付。',
} as const satisfies NotifyRecordDetailResp;

/** 群机器人记录：渠道目标名称缺失，receiver 是脱敏后的 webhook 地址。 */
const DINGTALK_RECORD = {
  id: 'record-dingtalk',
  channelType: 'DINGTALK_GROUP_WEBHOOK',
  templateCode: 'ORDER_FAILED',
  receiver: 'https://oapi.dingtalk.com/robot/send?access_token=***',
  sendStatus: 'FAILED',
} as const satisfies NotifyRecordResp;

const DINGTALK_DETAIL = {
  ...DINGTALK_RECORD,
  subjectText: '订单处理失败',
  contentText: '订单处理失败，请联系管理员。',
  failReason: 'DINGTALK_GROUP_WEBHOOK: errcode=310000, errmsg=sign not match',
} as const satisfies NotifyRecordDetailResp;

function renderModal(props: {
  readonly state: Parameters<typeof RecordDetailModal>[0]['state'];
  readonly onRetry?: (record: NotifyRecordResp) => void;
}) {
  return render(
    <NebulaProvider>
      <RecordDetailModal
        state={props.state}
        onClose={vi.fn()}
        onRetry={props.onRetry ?? vi.fn()}
      />
    </NebulaProvider>,
  );
}

afterEach(cleanup);

describe('RecordDetailModal', () => {
  it('shows a retryable error message and forwards the retry action when loading fails', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderModal({ state: { kind: 'error', record: DINGTALK_RECORD }, onRetry });

    expect(await screen.findByText('详情加载失败，可重试')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(onRetry).toHaveBeenCalledWith(DINGTALK_RECORD);
  });

  it('shows the resolved receiver user name and channel target name on success', async () => {
    renderModal({ state: { kind: 'ready', detail: EMAIL_DETAIL } });

    expect(await screen.findByText('采购员王小明')).toBeInTheDocument();
    expect(screen.getByText('默认邮件通道')).toBeInTheDocument();
    expect(screen.queryByText('user-buyer')).not.toBeInTheDocument();
    expect(screen.queryByText('target-email')).not.toBeInTheDocument();
  });

  it('never renders the webhook receiver for a robot detail without a target name', async () => {
    renderModal({ state: { kind: 'ready', detail: DINGTALK_DETAIL } });

    expect(await screen.findByText('订单处理失败')).toBeInTheDocument();

    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toContain('http');
    expect(bodyText).not.toContain('access_token');
  });
});
