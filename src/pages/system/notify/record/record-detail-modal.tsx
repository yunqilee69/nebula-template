import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Collapse, Descriptions, Modal, Skeleton, Typography } from 'antd';
import type { ReactNode } from 'react';
import { DictLabel } from '@/components/dict-select';
import type { NotifyRecordDetailResp, NotifyRecordResp } from '@/types/notify';
import {
  CopyableRecordText,
  formatOptionalText,
  formatRecordDateTime,
  getRecordChannelTargetDisplay,
  getRecordRecipientDisplay,
  getRecordTemplateVariantDisplay,
  NotifySendStatusTag,
} from './record-presentation';

const NOTIFY_CHANNEL_DICT_CODE = 'NOTIFY_CHANNEL_TYPE';

export type RecordDetailState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'loading'; readonly record: NotifyRecordResp }
  | { readonly kind: 'ready'; readonly detail: NotifyRecordDetailResp }
  | { readonly kind: 'error'; readonly record: NotifyRecordResp };

interface RecordDetailModalProps {
  readonly state: RecordDetailState;
  readonly onClose: () => void;
  readonly onRetry: (record: NotifyRecordResp) => void;
}

function assertNever(value: never): never {
  throw new TypeError(`Unexpected notification detail state: ${String(value)}`);
}

export function RecordDetailModal({ state, onClose, onRetry }: RecordDetailModalProps) {
  let content: ReactNode;

  switch (state.kind) {
    case 'closed':
      content = null;
      break;
    case 'loading':
      content = <Skeleton active />;
      break;
    case 'error':
      content = (
        <Alert
          type="error"
          showIcon
          title="发送记录详情加载失败"
          description="详情暂时无法获取，请重试。"
          action={(
            <Button
              icon={<ReloadOutlined />}
              aria-label="重试"
              onClick={() => onRetry(state.record)}
            >
              重试
            </Button>
          )}
        />
      );
      break;
    case 'ready': {
      const { detail } = state;
      content = (
        <div className="flex flex-col gap-4">
          {detail.sendStatus === 'FAILED' ? (
            <Alert
              type="error"
              showIcon
              title="发送失败"
              description={formatOptionalText(detail.failReason)}
            />
          ) : null}

          <Descriptions bordered size="small" column={{ xs: 1, sm: 1, md: 2 }}>
            <Descriptions.Item label="记录 ID" span="filled">
              <CopyableRecordText value={detail.id} />
            </Descriptions.Item>
            <Descriptions.Item label="通知渠道">
              <DictLabel dictCode={NOTIFY_CHANNEL_DICT_CODE} value={detail.channelType} />
            </Descriptions.Item>
            <Descriptions.Item label="发送状态">
              <NotifySendStatusTag status={detail.sendStatus} />
            </Descriptions.Item>
            <Descriptions.Item label="接收人" span="filled">
              <CopyableRecordText value={getRecordRecipientDisplay(detail)} />
            </Descriptions.Item>
            <Descriptions.Item label="模板编码">
              <CopyableRecordText value={detail.templateCode} />
            </Descriptions.Item>
            <Descriptions.Item label="模板变体">
              <CopyableRecordText value={getRecordTemplateVariantDisplay(detail)} />
            </Descriptions.Item>
            <Descriptions.Item label="渠道目标">
              <CopyableRecordText value={getRecordChannelTargetDisplay(detail)} />
            </Descriptions.Item>
            <Descriptions.Item label="发送时间">
              {formatRecordDateTime(detail.sendTime)}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatRecordDateTime(detail.createTime)}
            </Descriptions.Item>
          </Descriptions>

          <Collapse
            defaultActiveKey={['subject', 'content', 'extension']}
            items={[
              {
                key: 'subject',
                label: '主题',
                children: (
                  <Typography.Paragraph copyable={detail.subjectText ? { text: detail.subjectText } : false} className="m-0 whitespace-pre-wrap break-words">
                    {formatOptionalText(detail.subjectText)}
                  </Typography.Paragraph>
                ),
              },
              {
                key: 'content',
                label: '内容',
                children: (
                  <Typography.Paragraph copyable={{ text: detail.contentText }} className="m-0 whitespace-pre-wrap break-words">
                    {formatOptionalText(detail.contentText)}
                  </Typography.Paragraph>
                ),
              },
              {
                key: 'extension',
                label: '扩展数据',
                children: (
                  <Typography.Paragraph copyable={detail.extJson ? { text: detail.extJson } : false} className="m-0 whitespace-pre-wrap break-words">
                    {formatOptionalText(detail.extJson)}
                  </Typography.Paragraph>
                ),
              },
            ]}
          />
        </div>
      );
      break;
    }
    default:
      content = assertNever(state);
  }

  return (
    <Modal
      title="发送记录详情"
      open={state.kind !== 'closed'}
      width={900}
      footer={null}
      destroyOnHidden
      onCancel={onClose}
    >
      {content}
    </Modal>
  );
}
